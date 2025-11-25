import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import configRoutes from './routes/configRoutes';
import submissionsRoutes from './routes/submissionsRoutes';
import { getPublicConfig } from './config';
import { log, setLogLevel } from './logger';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://localhost:5175', 'http://127.0.0.1:5175'],
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false, // Allow embedding in iframes for PDF viewing
  }),
);
app.use(express.json({ limit: '2mb' }));

const publicConfig = getPublicConfig();
setLogLevel(publicConfig.logLevel);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', configRoutes);
app.use('/api', submissionsRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  log('info', `Backend listening on port ${port}`);
});
