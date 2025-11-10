import { Hono } from "hono";
import { addTest, getAll } from "./db";
import { seedDatabase } from "./routes/seed";
import { simulateWeather } from "./routes/weather";
import { safetyCheck } from "./routes/safety";
import { rescheduleFlights } from "./routes/reschedule";

const app = new Hono();

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

export default {
  port: 3000,
  fetch: app.fetch,
};

