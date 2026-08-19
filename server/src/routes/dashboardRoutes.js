import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { withStatus } from '../status.js';
import * as lancamentosStore from '../lancamentosStore.js';

const router = Router();
router.use(requireAuth);

function sum(arr) {
  return arr.reduce((acc, v) => acc + v, 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function agregar(rows, { limitePercentual, diaLimite, mes }) {
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
  const isMesAtual = mes ? hoje.toISOString().slice(0, 7) === mes : false;
  const diaAtual = isMesAtual ? hoje.getDate() : diaLimite + 1;

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

  return {
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
  };
}

// GET /api/dashboard?mes=2026-07&visao=mensal|geral&limitePercentual=70&diaLimite=20
router.get('/', async (req, res, next) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const visao = req.query.visao === 'geral' ? 'geral' : 'mensal';
    const limitePercentual = Number(req.query.limitePercentual) || 70;
    const diaLimite = Number(req.query.diaLimite) || 20;

    const rows =
      visao === 'geral'
        ? (await lancamentosStore.list({ all: true })).map(withStatus)
        : (await lancamentosStore.list({ mes })).map(withStatus);

    const resultado = agregar(rows, { limitePercentual, diaLimite, mes: visao === 'mensal' ? mes : null });

    // Patrimônio líquido: acumulado histórico (tudo que já foi efetivamente pago), independe da visão selecionada.
    const todasAsLinhas = visao === 'geral' ? rows : (await lancamentosStore.list({ all: true })).map(withStatus);
    const pagas = todasAsLinhas.filter((l) => l.status === 'Pago');
    const patrimonioLiquido = round2(
      sum(pagas.filter((l) => l.tipo === 'Receita').map((l) => l.valor)) -
        sum(pagas.filter((l) => l.tipo === 'Despesa').map((l) => l.valor))
    );

    res.json({ mes, visao, patrimonioLiquido, ...resultado });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/evolucao?meses=6
router.get('/evolucao', async (req, res, next) => {
  try {
    const meses = Math.min(Math.max(Number(req.query.meses) || 6, 2), 24);
    const rows = await lancamentosStore.list({ all: true });

    const hoje = new Date();
    const chave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const referencias = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      referencias.push(chave(d));
    }

    const porMes = new Map(referencias.map((m) => [m, { mes: m, receitas: 0, despesas: 0 }]));

    for (const row of rows) {
      const m = row.vencimento?.slice(0, 7);
      if (!porMes.has(m)) continue;
      const bucket = porMes.get(m);
      if (row.tipo === 'Receita') bucket.receitas += row.valor;
      else bucket.despesas += row.valor;
    }

    const serie = referencias.map((m) => {
      const b = porMes.get(m);
      return {
        mes: b.mes,
        receitas: round2(b.receitas),
        despesas: round2(b.despesas),
        saldo: round2(b.receitas - b.despesas),
      };
    });

    res.json({ serie });
  } catch (err) {
    next(err);
  }
});

export default router;
