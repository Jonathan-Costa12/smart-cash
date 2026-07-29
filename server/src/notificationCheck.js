import db from './db.js';
import { sendNotificationToAll } from './push.js';
import * as lancamentosStore from './lancamentosStore.js';

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

const currency = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function jaNotificado(lancamentoId, hoje) {
  const row = db
    .prepare('SELECT 1 FROM notificacoes_enviadas WHERE lancamento_id = ? AND data_referencia = ?')
    .get(String(lancamentoId), hoje);
  return Boolean(row);
}

// Verifica despesas com vencimento hoje e ainda não pagas, envia push (uma vez por lançamento/dia)
// e marca em notificacoes_enviadas para não duplicar.
export async function checkAndNotifyContasHoje() {
  const hoje = hojeISO();

  const doMes = await lancamentosStore.list({ mes: hoje.slice(0, 7) });
  const pendentes = doMes.filter(
    (l) => l.tipo === 'Despesa' && l.vencimento === hoje && !l.pagamento && !jaNotificado(l.id, hoje)
  );

  if (pendentes.length === 0) {
    return { notificadas: 0, contas: [] };
  }

  const totalDia = pendentes.reduce((acc, c) => acc + c.valor, 0);
  const titulo = pendentes.length === 1 ? '💰 Conta vencendo hoje' : `💰 ${pendentes.length} contas vencendo hoje`;
  const corpo =
    pendentes.length === 1
      ? `${pendentes[0].fonte_descricao} — ${currency(pendentes[0].valor)}`
      : `${pendentes.map((c) => c.fonte_descricao).join(', ')} — total ${currency(totalDia)}`;

  const result = await sendNotificationToAll({
    title: titulo,
    body: corpo,
    url: '/',
  });

  // Só marca como notificado se realmente entregou a pelo menos um dispositivo inscrito;
  // caso contrário (ninguém inscrito ainda), tenta de novo na próxima verificação.
  if (result.sent > 0) {
    const marcar = db.prepare(
      'INSERT OR IGNORE INTO notificacoes_enviadas (lancamento_id, data_referencia) VALUES (?, ?)'
    );
    for (const c of pendentes) marcar.run(String(c.id), hoje);
  }

  return { notificadas: result.sent, contas: pendentes };
}
