import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const currency = (v) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

export default function Dashboard() {
  const { token } = useAuth();
  const [mes, setMes] = useState(mesAtual());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .dashboard(token, { mes })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, mes]);

  if (loading && !data) return <p className="text-slate-400">Carregando dashboard...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return null;

  const statusColor = {
    Pago: 'text-emerald-400',
    'A vencer': 'text-amber-400',
    Atrasado: 'text-red-400',
    'Sem valor': 'text-slate-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm"
        />
      </div>

      {data.alertas.gastoAcelerado && (
        <Alert>
          ⚠️ {data.alertas.gastoAcelerado.mensagem} (limite configurado: {data.alertas.gastoAcelerado.limitePercentual}% até o dia{' '}
          {data.alertas.gastoAcelerado.diaLimite})
        </Alert>
      )}
      {data.alertas.despesasFixasAtrasadas.length > 0 && (
        <Alert>
          🔴 {data.alertas.despesasFixasAtrasadas.length} despesa(s) fixa(s) atrasada(s):{' '}
          {data.alertas.despesasFixasAtrasadas.map((d) => d.fonte_descricao).join(', ')}
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Receitas" value={currency(data.totalReceitas)} tone="text-emerald-400" />
        <Card label="Despesas" value={currency(data.totalDespesas)} tone="text-red-400" />
        <Card
          label="Saldo"
          value={currency(data.saldo)}
          tone={data.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <Card label="Despesas pagas" value={`${data.percentualPago}%`} tone="text-indigo-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-slate-300 text-sm mb-1">Quanto ainda é seguro gastar</h3>
          <p className="text-2xl font-bold text-white">{currency(data.quantoSeguroGastar)}</p>
          <p className="text-xs text-slate-500 mt-1">
            Já gasto {data.percentualGastoDaReceita}% da receita esperada do mês
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-slate-300 text-sm mb-3">Despesas por categoria</h3>
          <CategoriaBar label="Fixa" valor={data.porCategoria.Fixa.despesas} total={data.totalDespesas} />
          <CategoriaBar label="Variável" valor={data.porCategoria.Variavel.despesas} total={data.totalDespesas} />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-slate-300 text-sm mb-3">Pendências (a vencer / atrasadas)</h3>
        {data.pendencias.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma pendência 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {data.pendencias.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="text-white">{p.fonte_descricao}</p>
                  <p className="text-slate-500">Vencimento: {p.vencimento}</p>
                </div>
                <div className="text-right">
                  <p className="text-white">{currency(p.valor)}</p>
                  <p className={statusColor[p.status]}>{p.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Alert({ children }) {
  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/40 text-amber-200 px-4 py-3 text-sm">
      {children}
    </div>
  );
}

function Card({ label, value, tone }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function CategoriaBar({ label, valor, total }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>{currency(valor)} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
