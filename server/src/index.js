import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import lancamentosRoutes from './routes/lancamentosRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
import { startScheduler } from './scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/ocr', ocrRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  startScheduler();
});
