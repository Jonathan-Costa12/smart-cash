import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { withStatus } from '../status.js';
import * as lancamentosStore from '../lancamentosStore.js';

const router = Router();
router.use(requireAuth);

const lancamentoSchema = z.object({
  tipo: z.enum(['Receita', 'Despesa']),
  categoria: z.enum(['Fixa', 'Variavel']),
  fonte_descricao: z.string().trim().min(1, 'Descrição é obrigatória'),
  valor: z.number({ invalid_type_error: 'Valor é obrigatório' }).positive('Valor deve ser maior que zero'),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Vencimento deve ser AAAA-MM-DD'),
  pagamento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  origem: z.enum(['manual', 'foto_ocr']).default('manual'),
});

// GET /api/lancamentos?mes=2026-07
router.get('/', async (req, res, next) => {
  try {
    const rows = await lancamentosStore.list({ mes: req.query.mes });
    res.json(rows.map(withStatus));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const row = await lancamentosStore.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json(withStatus(row));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const parsed = lancamentoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' });
  }
  try {
    const row = await lancamentosStore.create({ ...parsed.data, usuario_email: req.user.email });
    res.status(201).json(withStatus(row));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const parsed = lancamentoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' });
  }
  try {
    const data = { ...parsed.data };
    if (Object.prototype.hasOwnProperty.call(parsed.data, 'pagamento')) {
      data.pagamento = parsed.data.pagamento || null;
    }
    const row = await lancamentosStore.update(req.params.id, data);
    if (!row) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json(withStatus(row));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await lancamentosStore.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
