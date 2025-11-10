import { Hono } from "hono";
import { cors } from "hono/cors";
import { addTest, getAll } from "./db";
import { seedDatabase } from "./routes/seed";
import { simulateWeather, getAllWeather } from "./routes/weather";
import { safetyCheck } from "./routes/safety";
import { rescheduleFlights } from "./routes/reschedule";
import { getAllFlights, updateFlightStatuses, cleanupAndGenerateFlights } from "./routes/flights";
import { getAllAlerts } from "./routes/alerts";
import { getSimulationTime, fastForwardTime, advanceTimeByMinutes } from "./routes/time";
import { cleanupSimulation } from "./routes/cleanup";
import { getAllRoutesWithStatus } from "./routes/routes";
import { getAvailableTimeSlots, updateFlightSchedule } from "./routes/calendar";

const app = new Hono();

// Background process: advance simulation time by 10 minutes every 10 seconds
// and update flight statuses based on simulation time
setInterval(() => {
  try {
    advanceTimeByMinutes(10);
    // Update flight statuses (scheduled -> in_progress) based on current simulation time
    updateFlightStatuses();
    // Remove old completed flights and generate new scheduled flights
    cleanupAndGenerateFlights();
  } catch (error) {
    console.error("Error in background process:", error);
  }
}, 10000); // 10 seconds

// Enable CORS for frontend
app.use("*", cors());

app.get("/", (c) => c.text("OK"));

app.get("/test", (c) => c.json(getAll()));

app.post("/test", (c) => {
  addTest("Hello DB");
  return c.json({ ok: true });
});

app.post("/seed", (c) => {
  const result = seedDatabase();
  return c.json({ ok: true, ...result });
});

app.post("/simulate-weather", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const condition = body.condition || "storm";
  const durationHours = body.duration_hours || 3;
  const startTime = body.start_time; // Optional ISO string
  const result = simulateWeather(condition, durationHours, startTime);
  return c.json(result);
});

app.post("/safety-check", (c) => {
  const result = safetyCheck();
  return c.json(result);
});

app.post("/reschedule", (c) => {
  const result = rescheduleFlights();
  return c.json(result);
});

app.get("/flights", (c) => {
  const flights = getAllFlights();
  return c.json(flights);
});

app.get("/weather", (c) => {
  const weather = getAllWeather();
  return c.json(weather);
});

app.get("/alerts", (c) => {
  const alerts = getAllAlerts();
  return c.json(alerts);
});

app.get("/routes", (c) => {
  const routes = getAllRoutesWithStatus();
  return c.json(routes);
});

app.get("/time", (c) => {
  const time = getSimulationTime();
  return c.json({ current_time: time });
});

app.post("/time/fast-forward", (c) => {
  const newTime = fastForwardTime();
  // Update flight statuses after fast forwarding
  updateFlightStatuses();
  return c.json({ current_time: newTime });
});

app.post("/cleanup", (c) => {
  const result = cleanupSimulation();
  return c.json(result);
});

app.get("/flights/:id/available-slots", async (c) => {
  const flightId = parseInt(c.req.param("id"));
  if (isNaN(flightId)) {
    return c.json({ error: "Invalid flight ID" }, 400);
  }
  try {
    const slots = getAvailableTimeSlots(flightId);
    return c.json({ ok: true, slots });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

app.post("/flights/:id/reschedule", async (c) => {
  const flightId = parseInt(c.req.param("id"));
  if (isNaN(flightId)) {
    return c.json({ error: "Invalid flight ID" }, 400);
  }
  try {
    const body = await c.req.json().catch(() => ({}));
    const { start_time, end_time, instructor_id, plane_id } = body;
    
    if (!start_time || !end_time || !instructor_id || !plane_id) {
      return c.json({ error: "Missing required fields: start_time, end_time, instructor_id, plane_id" }, 400);
    }
    
    const result = updateFlightSchedule(flightId, start_time, end_time, instructor_id, plane_id);
    if (!result.ok) {
      return c.json({ error: result.message }, 400);
    }
    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export default {
  port: 3000,
  fetch: app.fetch,
};

