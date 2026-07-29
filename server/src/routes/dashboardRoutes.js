import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { withStatus } from '../status.js';
import * as lancamentosStore from '../lancamentosStore.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard?mes=2026-07&limitePercentual=70&diaLimite=20
router.get('/', async (req, res, next) => {
 try {
  const mes = req.query.mes || new Date().toISOString().slice(0, 7);
  const limitePercentual = Number(req.query.limitePercentual) || 70;
  const diaLimite = Number(req.query.diaLimite) || 20;

  const rows = (await lancamentosStore.list({ mes })).map(withStatus);

  const receitas = rows.filter((r) => r.tipo === 'Receita');
  const despesas = rows.filter((r) => r.tipo === 'Despesa');

  const totalReceitas = sum(receitas.map((r) => r.valor));
  const totalDespesas = sum(despesas.map((r) => r.valor));
  const saldo = totalReceitas - totalDespesas;

  const despesasPagas = despesas.filter((d) => d.status === 'Pago');
  const totalDespesasPagas = sum(despesasPagas.map((d) => d.valor));
  const percentualPago = totalDespesas > 0 ? (totalDespesasPagas / totalDespesas) * 100 : 0;

  const receitaEsperada = totalReceitas;
  const percentualGastoDaReceita = receitaEsperada > 0 ? (totalDespesasPagas / receitaEsperada) * 100 : 0;

  const hoje = new Date();
  const isMesAtual = hoje.toISOString().slice(0, 7) === mes;
  const diaAtual = isMesAtual ? hoje.getDate() : diaLimite + 1; // se for mês passado/futuro, não dispara alerta de "antes do dia"

  const alertaGastoAcelerado =
    isMesAtual && diaAtual <= diaLimite && percentualGastoDaReceita > limitePercentual;

  const despesasFixasAtrasadas = despesas.filter((d) => d.categoria === 'Fixa' && d.status === 'Atrasado');

  const porCategoria = {
    Fixa: {
      receitas: sum(receitas.filter((r) => r.categoria === 'Fixa').map((r) => r.valor)),
      despesas: sum(despesas.filter((d) => d.categoria === 'Fixa').map((d) => d.valor)),
    },
    Variavel: {
      receitas: sum(receitas.filter((r) => r.categoria === 'Variavel').map((r) => r.valor)),
      despesas: sum(despesas.filter((d) => d.categoria === 'Variavel').map((d) => d.valor)),
    },
  };

  const pendencias = despesas
    .filter((d) => d.status === 'A vencer' || d.status === 'Atrasado')
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const quantoSeguroGastar = Math.max(receitaEsperada * (limitePercentual / 100) - totalDespesasPagas, 0);

  res.json({
    mes,
    totalReceitas,
    totalDespesas,
    saldo,
    percentualPago: round2(percentualPago),
    percentualGastoDaReceita: round2(percentualGastoDaReceita),
    quantoSeguroGastar: round2(quantoSeguroGastar),
    porCategoria,
    pendencias,
    alertas: {
      gastoAcelerado: alertaGastoAcelerado
        ? {
            mensagem: `Já ${round2(percentualGastoDaReceita)}% da receita esperada foi gasta antes do dia ${diaLimite}.`,
            limitePercentual,
            diaLimite,
          }
        : null,
      despesasFixasAtrasadas: despesasFixasAtrasadas.map(withStatus),
    },
  });
 } catch (err) {
  next(err);
 }
});

function sum(arr) {
  return arr.reduce((acc, v) => acc + v, 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export default router;
