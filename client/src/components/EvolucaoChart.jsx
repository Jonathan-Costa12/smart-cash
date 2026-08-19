const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const currency = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const COR_RECEITA = '#16a34a';
const COR_DESPESA = '#b91c1c';

export default function EvolucaoChart({ serie }) {
  const semMovimentacao = !serie || serie.every((m) => m.receitas === 0 && m.despesas === 0);

  if (semMovimentacao) {
    return (
      <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5">
        <h3 className="text-white font-medium mb-1">Evolução dos Últimos {serie?.length || 6} Meses</h3>
        <p className="text-zinc-500 text-sm py-8 text-center">
          Sem movimentações nos últimos {serie?.length || 6} meses
        </p>
      </div>
    );
  }

  const maxValor = Math.max(...serie.flatMap((m) => [m.receitas, m.despesas]), 1);
  const alturaMax = 96; // px
  const ultimoIndex = serie.length - 1;

  return (
    <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Evolução dos Últimos {serie.length} Meses</h3>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_RECEITA }} />
            Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_DESPESA }} />
            Despesas
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1" style={{ height: alturaMax + 28 }}>
        {serie.map((m, i) => {
          const alturaReceita = Math.max((m.receitas / maxValor) * alturaMax, m.receitas > 0 ? 3 : 0);
          const alturaDespesa = Math.max((m.despesas / maxValor) * alturaMax, m.despesas > 0 ? 3 : 0);
          const [ano, mesNum] = m.mes.split('-');
          const label = `${MES_ABREV[Number(mesNum) - 1]}${i === 0 || mesNum === '01' ? `/${ano.slice(2)}` : ''}`;

          return (
            <div key={m.mes} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              <div className="flex items-end gap-[3px]" style={{ height: alturaMax }}>
                <div
                  title={`Receitas em ${label}: ${currency(m.receitas)}`}
                  className="w-2.5 sm:w-3 rounded-t"
                  style={{ height: alturaReceita, background: COR_RECEITA }}
                />
                <div
                  title={`Despesas em ${label}: ${currency(m.despesas)}`}
                  className="w-2.5 sm:w-3 rounded-t"
                  style={{ height: alturaDespesa, background: COR_DESPESA }}
                />
              </div>
              <span className={`text-[10px] ${i === ultimoIndex ? 'text-white font-medium' : 'text-zinc-500'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500 mt-3 text-center sm:hidden">Toque e segure numa barra pra ver o valor</p>
    </div>
  );
}
