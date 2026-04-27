import { Hono } from 'hono';

export type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.json({ ok: true, service: c.env.DB ? 'worker+d1' : 'worker' }));

app.get('/health', (c) => c.json({ status: 'healthy' }));

export default app;
