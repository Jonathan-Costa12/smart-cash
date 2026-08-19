import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'E-mail ou senha inválidos' });

  const { email, senha } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const ok = bcrypt.compareSync(senha, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, nome: user.nome } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Cria/atualiza as contas iniciais em produção, onde não há acesso a shell para rodar o seed.
// Protegido por CRON_SECRET (o mesmo segredo já usado pelo agendador de notificações) via
// header x-setup-secret. Não cria nenhum lançamento de exemplo — só as contas de login.
const setupSchema = z.object({
  usuarios: z
    .array(
      z.object({
        email: z.string().email(),
        senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
        nome: z.string().trim().min(1),
      })
    )
    .min(1),
});

router.post('/setup-inicial', (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(501).json({ error: 'CRON_SECRET não configurado no servidor' });
  if (req.headers['x-setup-secret'] !== secret) {
    return res.status(401).json({ error: 'Segredo inválido' });
  }

  const parsed = setupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' });
  }

  const upsert = db.prepare(`
    INSERT INTO users (email, password_hash, nome) VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, nome = excluded.nome
  `);

  const resultado = parsed.data.usuarios.map((u) => {
    const hash = bcrypt.hashSync(u.senha, 10);
    upsert.run(u.email.toLowerCase(), hash, u.nome);
    return u.email.toLowerCase();
  });

  res.json({ ok: true, contasCriadasOuAtualizadas: resultado });
});

export default router;
