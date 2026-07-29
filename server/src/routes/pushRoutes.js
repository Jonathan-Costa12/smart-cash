import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { getVapidPublicKey, saveSubscription, removeSubscription, pushEnabled } from '../push.js';
import { checkAndNotifyContasHoje } from '../notificationCheck.js';

const router = Router();

router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey(), enabled: pushEnabled });
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

router.post('/subscribe', requireAuth, (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Inscrição inválida' });
  saveSubscription(req.user.id, parsed.data);
  res.status(201).json({ ok: true });
});

router.post('/unsubscribe', requireAuth, (req, res) => {
  const endpoint = req.body?.endpoint;
  if (!endpoint) return res.status(400).json({ error: 'endpoint é obrigatório' });
  removeSubscription(endpoint);
  res.json({ ok: true });
});

// Dispara manualmente a verificação de contas vencendo hoje (útil para testar o fluxo de push)
router.post('/test-check', requireAuth, async (_req, res) => {
  const result = await checkAndNotifyContasHoje();
  res.json(result);
});

// Rota sem login, protegida por segredo estático — pensada para um agendador externo
// (cron-job.org, GitHub Actions, etc.) chamar 1x/dia, já que em hospedagens gratuitas
// o servidor pode "dormir" por inatividade e o node-cron interno não dispara nesse caso.
router.post('/cron-trigger', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(501).json({ error: 'CRON_SECRET não configurado no servidor' });
  if (req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'Segredo inválido' });
  }
  const result = await checkAndNotifyContasHoje();
  res.json(result);
});

export default router;
