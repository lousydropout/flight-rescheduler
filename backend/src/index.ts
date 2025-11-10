import { Hono } from "hono";
import { addTest, getAll } from "./db";

const app = new Hono();

app.get("/", (c) => c.text("OK"));

app.get("/test", (c) => c.json(getAll()));

app.post("/test", (c) => {
  addTest("Hello DB");
  return c.json({ ok: true });
});

export default {
  port: 3000,
  fetch: app.fetch,
};

