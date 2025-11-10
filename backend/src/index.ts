import { Hono } from "hono";
import { cors } from "hono/cors";
import { addTest, getAll } from "./db";
import { seedDatabase } from "./routes/seed";
import { simulateWeather, getAllWeather } from "./routes/weather";
import { safetyCheck } from "./routes/safety";
import { rescheduleFlights } from "./routes/reschedule";
import { getAllFlights } from "./routes/flights";
import { getAllAlerts } from "./routes/alerts";
import { getSimulationTime } from "./routes/time";

const app = new Hono();

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

app.post("/simulate-weather", (c) => {
  const result = simulateWeather();
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

app.get("/time", (c) => {
  const time = getSimulationTime();
  return c.json({ current_time: time });
});

export default {
  port: 3000,
  fetch: app.fetch,
};

