// server/src/server.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { tokenRouter } from './routes/token.route';
import dubRouter from './routes/dub.route';
import { initWsProxy } from './utils/wsProxy';
import { log } from './utils/logger';
// If your router file is TypeScript, omit .js here:
import { voicesRouter } from './routes/voices.route';

const PORT = Number(process.env.PORT ?? 3000);

const app = express();

/**
 * CORS
 * - Allow your Netlify site (default provided) or override via FRONTEND_ORIGIN
 * - You can pass multiple origins separated by commas in FRONTEND_ORIGIN
 */
const defaultFrontend = 'https://lambent-caramel-605436.netlify.app';
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? defaultFrontend)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin tools / curl / server-to-server where origin is undefined
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: Origin ${origin} not allowed`), false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

// API routes (under /api)
app.use('/api', tokenRouter);
app.use('/api/dub', dubRouter); // mount dub router at /api/dub
app.use('/api', voicesRouter);

// Create HTTP server and bind WS proxy (so WS shares the same port/URL)
const server = http.createServer(app);
initWsProxy(server);

server.listen(PORT, () => {
  log.info(`[api] up on http://localhost:${PORT}`);
  log.info(`[api] ws proxy on ws://localhost:${PORT}/ws/tts`);
});
