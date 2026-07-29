import { listRecords, createRecord, updateRecord, deleteRecord } from '../nocodb.js';

export const name = 'nocodb';

function toDateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function toApp(record) {
  return {
    id: record.Id,
    tipo: record.tipo,
    categoria: record.categoria,
    fonte_descricao: record.fonte_descricao,
    valor: record.valor === null || record.valor === undefined ? null : Number(record.valor),
    vencimento: toDateOnly(record.vencimento),
    pagamento: toDateOnly(record.pagamento),
    origem: record.origem || 'manual',
    usuario_email: record.usuario_email,
    created_at: record.CreatedAt || null,
    updated_at: record.UpdatedAt || null,
  };
}

function toNoco(data) {
  return {
    tipo: data.tipo,
    categoria: data.categoria,
    fonte_descricao: data.fonte_descricao,
    valor: data.valor,
    vencimento: data.vencimento,
    pagamento: data.pagamento || null,
    origem: data.origem || 'manual',
    usuario_email: data.usuario_email,
  };
}

export async function list({ mes } = {}) {
  const records = await listRecords({ limit: 1000 });
  let items = records.map(toApp);
  if (mes) {
    items = items.filter((i) => i.vencimento && i.vencimento.startsWith(mes));
  }
  items.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
  return items;
}

export async function get(id) {
  const records = await listRecords({ limit: 1000 });
  const found = records.find((r) => String(r.Id) === String(id));
  return found ? toApp(found) : null;
}

export async function create(data) {
  const created = await createRecord(toNoco(data));
  const record = Array.isArray(created) ? created[0] : created;
  return get(record.Id);
}

export async function update(id, data) {
  const existing = await get(id);
  if (!existing) return null;
  const merged = { ...existing, ...data };
  await updateRecord(id, toNoco(merged));
  return get(id);
}

export async function remove(id) {
  const existing = await get(id);
  if (!existing) return false;
  await deleteRecord(id);
  return true;
}
