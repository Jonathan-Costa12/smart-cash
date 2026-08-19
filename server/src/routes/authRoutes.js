import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { signToken, requireAuth, requireMaster } from '../auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

function toPublicUser(user) {
  return { id: user.id, email: user.email, nome: user.nome, isMaster: Boolean(user.is_master) };
}

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'E-mail ou senha inválidos' });

  const { email, senha } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const ok = bcrypt.compareSync(senha, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Lista os usuários da conta (só o master vê essa tela no app)
router.get('/usuarios', requireAuth, requireMaster, (_req, res) => {
  const usuarios = db.prepare('SELECT id, email, nome, is_master, created_at FROM users ORDER BY created_at ASC').all();
  res.json(usuarios.map((u) => ({ ...toPublicUser(u), createdAt: u.created_at })));
});

const registerSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  nome: z.string().trim().min(1),
});

// Cria uma nova conta (não-master) — só o usuário master pode fazer isso, direto pelo app.
router.post('/usuarios', requireAuth, requireMaster, (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' });
  }
  const { email, senha, nome } = parsed.data;

  const existente = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existente) return res.status(409).json({ error: 'Já existe uma conta com esse e-mail' });

  const hash = bcrypt.hashSync(senha, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, nome, is_master) VALUES (?, ?, ?, 0)')
    .run(email.toLowerCase(), hash, nome);

  const criado = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(toPublicUser(criado));
});

// Bootstrap: cria a primeira conta (master) quando o banco de produção está vazio — sem isso
// não tem como logar no app pela primeira vez. Protegido por CRON_SECRET via header
// x-setup-secret. Depois que existir um master, esse endpoint fica bloqueado (use a tela de
// usuários no app, logado como master, para criar as demais contas).
const setupSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  nome: z.string().trim().min(1),
});

router.post('/setup-inicial', (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(501).json({ error: 'CRON_SECRET não configurado no servidor' });
  if (req.headers['x-setup-secret'] !== secret) {
    return res.status(401).json({ error: 'Segredo inválido' });
  }

  const jaTemMaster = db.prepare('SELECT 1 FROM users WHERE is_master = 1 LIMIT 1').get();
  if (jaTemMaster) {
    return res.status(403).json({
      error: 'Já existe uma conta master. Use a tela de usuários dentro do app (logado como master) para criar novas contas.',
    });
  }

  const parsed = setupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' });
  }
  const { email, senha, nome } = parsed.data;

  const hash = bcrypt.hashSync(senha, 10);
  db.prepare(`
    INSERT INTO users (email, password_hash, nome, is_master) VALUES (?, ?, ?, 1)
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, nome = excluded.nome, is_master = 1
  `).run(email.toLowerCase(), hash, nome);

  res.json({ ok: true, master: email.toLowerCase() });
});

export default router;
