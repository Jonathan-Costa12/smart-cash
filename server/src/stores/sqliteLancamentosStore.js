import db from '../db.js';

export const name = 'sqlite';

export async function list({ mes } = {}) {
  if (mes) {
    return db
      .prepare(`SELECT * FROM lancamentos WHERE substr(vencimento, 1, 7) = ? ORDER BY vencimento ASC`)
      .all(mes);
  }
  return db.prepare(`SELECT * FROM lancamentos ORDER BY vencimento DESC LIMIT 200`).all();
}

export async function get(id) {
  return db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(id) || null;
}

export async function create(data) {
  const info = db
    .prepare(
      `INSERT INTO lancamentos (tipo, categoria, fonte_descricao, valor, vencimento, pagamento, origem, usuario_email)
       VALUES (@tipo, @categoria, @fonte_descricao, @valor, @vencimento, @pagamento, @origem, @usuario_email)`
    )
    .run({
      tipo: data.tipo,
      categoria: data.categoria,
      fonte_descricao: data.fonte_descricao,
      valor: data.valor,
      vencimento: data.vencimento,
      pagamento: data.pagamento || null,
      origem: data.origem || 'manual',
      usuario_email: data.usuario_email,
    });
  return get(info.lastInsertRowid);
}

export async function update(id, data) {
  const existing = await get(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };

  db.prepare(
    `UPDATE lancamentos SET tipo=@tipo, categoria=@categoria, fonte_descricao=@fonte_descricao,
     valor=@valor, vencimento=@vencimento, pagamento=@pagamento, updated_at=datetime('now')
     WHERE id=@id`
  ).run({
    tipo: merged.tipo,
    categoria: merged.categoria,
    fonte_descricao: merged.fonte_descricao,
    valor: merged.valor,
    vencimento: merged.vencimento,
    pagamento: merged.pagamento || null,
    id,
  });
  return get(id);
}

export async function remove(id) {
  const existing = await get(id);
  if (!existing) return false;
  db.prepare('DELETE FROM lancamentos WHERE id = ?').run(id);
  return true;
}
