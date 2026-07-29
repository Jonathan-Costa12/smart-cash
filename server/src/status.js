export function deriveStatus(lancamento, today = new Date()) {
  if (lancamento.valor === null || lancamento.valor === undefined) return 'Sem valor';
  if (lancamento.pagamento) return 'Pago';
  const hoje = today.toISOString().slice(0, 10);
  return lancamento.vencimento < hoje ? 'Atrasado' : 'A vencer';
}

export function withStatus(lancamento) {
  return { ...lancamento, status: deriveStatus(lancamento) };
}
