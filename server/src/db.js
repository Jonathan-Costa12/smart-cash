import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data.sqlite');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nome TEXT NOT NULL,
    is_master INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lancamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
    categoria TEXT NOT NULL CHECK (categoria IN ('Fixa', 'Variavel')),
    fonte_descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    vencimento TEXT NOT NULL,
    pagamento TEXT,
    origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'foto_ocr')),
    usuario_email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_lancamentos_vencimento ON lancamentos(vencimento);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES users(id),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notificacoes_enviadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lancamento_id TEXT NOT NULL,
    data_referencia TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (lancamento_id, data_referencia)
  );
`);

// Migração leve: adiciona is_master em bancos criados antes dessa coluna existir.
const colunasUsers = db.prepare('PRAGMA table_info(users)').all();
if (!colunasUsers.some((c) => c.name === 'is_master')) {
  db.exec('ALTER TABLE users ADD COLUMN is_master INTEGER NOT NULL DEFAULT 0');
}

export default db;
