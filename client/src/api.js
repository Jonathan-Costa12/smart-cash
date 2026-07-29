const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  login: (email, senha) => request('/auth/login', { method: 'POST', body: { email, senha } }),
  me: (token) => request('/auth/me', { token }),
  dashboard: (token, params) => request(`/dashboard?${new URLSearchParams(params)}`, { token }),
  listLancamentos: (token, params) => request(`/lancamentos?${new URLSearchParams(params)}`, { token }),
  createLancamento: (token, body) => request('/lancamentos', { method: 'POST', body, token }),
  updateLancamento: (token, id, body) => request(`/lancamentos/${id}`, { method: 'PUT', body, token }),
  deleteLancamento: (token, id) => request(`/lancamentos/${id}`, { method: 'DELETE', token }),
  vapidPublicKey: () => request('/push/vapid-public-key'),
  pushSubscribe: (token, subscription) => request('/push/subscribe', { method: 'POST', body: subscription, token }),
  pushUnsubscribe: (token, endpoint) => request('/push/unsubscribe', { method: 'POST', body: { endpoint }, token }),
  pushTestCheck: (token) => request('/push/test-check', { method: 'POST', token }),
  ocrStatus: (token) => request('/ocr/status', { token }),
  ocrExtrair: (token, body) => request('/ocr/extrair', { method: 'POST', body, token }),
};
