import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { tokenRouter } from './routes/token.route';
import dubRouter from './routes/dub.route';
import { initWsProxy } from './utils/wsProxy';
import { log } from './utils/logger';
import { voicesRouter } from './routes/voices.route.js';

const app = express();

// Allow your Netlify site
const FRONTEND = process.env.FRONTEND_ORIGIN || 'https://lambent-caramel-605436.netlify.app';
app.use(cors({ origin: [FRONTEND], credentials: true }));

app.use(express.json({ limit: '10mb' }));

// Healthcheck
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

// API routes
app.use('/api', tokenRouter);
app.use('/api', dubRouter);
app.use('/api', voicesRouter);

// HTTP server + WS proxy
const server = http.createServer(app);
initWsProxy(server);

// Render injects PORT
const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  log.info(`[api] up on http://localhost:${PORT}`);
  log.info(`[api] ws proxy on ws://localhost:${PORT}/ws/tts`);
});

