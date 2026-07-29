const NOCODB_BASE_URL = (process.env.NOCODB_BASE_URL || 'https://app.nocodb.com').replace(/\/$/, '');
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN;
const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

export const nocodbEnabled = Boolean(NOCODB_API_TOKEN && NOCODB_TABLE_ID);

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${NOCODB_BASE_URL}/api/v2${path}`, {
    method,
    headers: {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`NocoDB respondeu ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function listRecords({ limit = 1000 } = {}) {
  const data = await request(`/tables/${NOCODB_TABLE_ID}/records?limit=${limit}`);
  return data.list || [];
}

export async function createRecord(fields) {
  return request(`/tables/${NOCODB_TABLE_ID}/records`, { method: 'POST', body: fields });
}

export async function updateRecord(id, fields) {
  return request(`/tables/${NOCODB_TABLE_ID}/records`, {
    method: 'PATCH',
    body: { Id: Number(id), ...fields },
  });
}

export async function deleteRecord(id) {
  return request(`/tables/${NOCODB_TABLE_ID}/records`, {
    method: 'DELETE',
    body: { Id: Number(id) },
  });
}
