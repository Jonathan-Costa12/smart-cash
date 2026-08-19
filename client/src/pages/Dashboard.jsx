import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import EvolucaoChart from '../components/EvolucaoChart.jsx';

const currency = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

function mesLabel(mes) {
  const [ano, m] = mes.split('-');
  const nomes = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return `${nomes[Number(m) - 1]} de ${ano}`;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [mes, setMes] = useState(mesAtual());
  const [visao, setVisao] = useState('mensal');
  const [ocultar, setOcultar] = useState(() => localStorage.getItem('ocultarValores') === '1');
  const [data, setData] = useState(null);
  const [evolucao, setEvolucao] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .dashboard(token, { mes, visao })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, mes, visao]);

  useEffect(() => {
    api
      .evolucao(token, { meses: 6 })
      .then((r) => setEvolucao(r.serie))
      .catch(() => {});
  }, [token]);

  function toggleOcultar() {
    setOcultar((v) => {
      localStorage.setItem('ocultarValores', v ? '0' : '1');
      return !v;
    });
  }

  const fmt = (v) => (ocultar ? '••••••' : currency(v));

  if (loading && !data) return <p className="text-zinc-400">Carregando dashboard...</p>;
  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return null;

  const statusColor = {
    Pago: 'text-emerald-400',
    'A vencer': 'text-amber-400',
    Atrasado: 'text-red-400',
    'Sem valor': 'text-zinc-400',
  };

  return (
    <div className="space-y-4">
      {/* Card de saldo */}
      <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-zinc-400">SALDO</span>
            <div className="flex bg-black rounded-full p-0.5 text-xs">
              <button
                onClick={() => setVisao('mensal')}
                className={`px-2.5 py-1 rounded-full transition ${
                  visao === 'mensal' ? 'bg-green-600 text-black font-medium' : 'text-zinc-400'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setVisao('geral')}
                className={`px-2.5 py-1 rounded-full transition ${
                  visao === 'geral' ? 'bg-green-600 text-black font-medium' : 'text-zinc-400'
                }`}
              >
                Geral
              </button>
            </div>
          </div>
          <button
            onClick={toggleOcultar}
            aria-label={ocultar ? 'Mostrar valores' : 'Ocultar valores'}
            className="text-zinc-500 hover:text-zinc-300 text-lg"
          >
            {ocultar ? '🙈' : '👁️'}
          </button>
        </div>

        <p className={`text-4xl font-bold mt-2 ${data.saldo >= 0 ? 'text-white' : 'text-red-400'}`}>{fmt(data.saldo)}</p>
        <p className="text-zinc-500 text-sm mt-1">{visao === 'mensal' ? mesLabel(mes) : 'Desde o início'}</p>

        {visao === 'mensal' && (
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="mt-3 rounded-lg bg-black border border-zinc-700 px-3 py-1.5 text-white text-sm"
          />
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-green-950/40 border border-green-900/40 rounded-xl p-3">
            <p className="text-green-400 text-xs flex items-center gap-1">↙ Receitas</p>
            <p className="text-white font-semibold mt-0.5">{fmt(data.totalReceitas)}</p>
          </div>
          <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3">
            <p className="text-red-400 text-xs flex items-center gap-1">↗ Despesas</p>
            <p className="text-white font-semibold mt-0.5">{fmt(data.totalDespesas)}</p>
          </div>
        </div>
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

      {/* Linhas de resumo */}
      <div className="bg-zinc-900 border border-green-900/40 rounded-2xl divide-y divide-zinc-800 overflow-hidden">
        <ResumoRow
          icone="💳"
          tone="bg-amber-950/60 text-amber-400"
          titulo="Despesas Pagas"
          valor={`${data.percentualPago}%`}
          subtitulo={`${fmt(data.quantoSeguroGastar)} ainda seguro pra gastar`}
        />
        <ResumoRow
          icone="💎"
          tone="bg-violet-950/60 text-violet-400"
          titulo="Patrimônio Líquido"
          valor={fmt(data.patrimonioLiquido)}
          subtitulo="Acumulado histórico (tudo já pago)"
        />
      </div>

      <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5">
        <h3 className="text-zinc-300 text-sm mb-3">Despesas por categoria</h3>
        <CategoriaBar label="Fixa" valor={data.porCategoria.Fixa.despesas} total={data.totalDespesas} ocultar={ocultar} />
        <CategoriaBar label="Variável" valor={data.porCategoria.Variavel.despesas} total={data.totalDespesas} ocultar={ocultar} />
      </div>

      <EvolucaoChart serie={evolucao} />

      <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5">
        <h3 className="text-zinc-300 text-sm mb-3">Pendências (a vencer / atrasadas)</h3>
        {data.pendencias.length === 0 ? (
          <p className="text-zinc-500 text-sm">Nenhuma pendência 🎉</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {data.pendencias.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <p className="text-white">{p.fonte_descricao}</p>
                  <p className="text-zinc-500">Vencimento: {p.vencimento}</p>
                </div>
                <div className="text-right">
                  <p className="text-white">{fmt(p.valor)}</p>
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

function ResumoRow({ icone, tone, titulo, valor, subtitulo }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${tone}`}>{icone}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{titulo}</p>
        <p className="text-zinc-500 text-xs truncate">{subtitulo}</p>
      </div>
      <p className="text-white font-semibold shrink-0">{valor}</p>
    </div>
  );
}

function CategoriaBar({ label, valor, total, ocultar }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>{label}</span>
        <span>
          {ocultar ? '••••••' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
