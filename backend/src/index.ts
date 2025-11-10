import { Hono } from "hono";
import { addTest, getAll } from "./db";
import { seedDatabase } from "./routes/seed";

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

export default {
  port: 3000,
  fetch: app.fetch,
};

