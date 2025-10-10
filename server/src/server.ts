import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { tokenRouter } from './routes/token.route';
import dubRouter from './routes/dub.route';
import { initWsProxy } from './utils/wsProxy';
import { log } from './utils/logger';
import { voicesRouter } from './routes/voices.route';

const app = express();

/**
 * CORS
 * - Local dev frontend: http://localhost:5173
 * - Prod frontend: your Netlify URL (adjust the default if you changed it)
 */
const FRONTEND =
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const corsOpts: cors.CorsOptions = {
  origin: [FRONTEND],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOpts));
app.options('*', cors(corsOpts));            // handle all preflights
app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

// API routes
app.use('/api', tokenRouter);
app.use('/api/dub', dubRouter);             // mount here: POST /api/dub
app.use('/api', voicesRouter);

// HTTP server + WS proxy
const server = http.createServer(app);
initWsProxy(server);

// Render/Node injects PORT
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  log.info(`[api] up on http://localhost:${PORT}`);
  log.info(`[api] ws proxy on ws://localhost:${PORT}/ws/tts`);
});
