import db from './db.js';

export function list({ mes, all } = {}) {
  if (mes) {
    return db
      .prepare(`SELECT * FROM lancamentos WHERE substr(vencimento, 1, 7) = ? ORDER BY vencimento ASC`)
      .all(mes);
  }
  if (all) {
    return db.prepare(`SELECT * FROM lancamentos ORDER BY vencimento ASC`).all();
  }
  return db.prepare(`SELECT * FROM lancamentos ORDER BY vencimento DESC LIMIT 200`).all();
}

export function get(id) {
  return db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(id) || null;
}

export function create(data) {
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

export function update(id, data) {
  const existing = get(id);
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

export function remove(id) {
  const existing = get(id);
  if (!existing) return false;
  db.prepare('DELETE FROM lancamentos WHERE id = ?').run(id);
  return true;
}
