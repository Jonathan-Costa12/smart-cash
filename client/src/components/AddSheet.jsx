import { useNavigate } from 'react-router-dom';

const OPCOES = [
  {
    key: 'despesa',
    icon: '➖',
    tone: 'bg-red-950/60 text-red-400',
    titulo: 'Despesa',
    subtitulo: 'Adicionar um gasto',
    to: '/lancamentos?tipo=Despesa',
  },
  {
    key: 'receita',
    icon: '➕',
    tone: 'bg-green-950/60 text-green-400',
    titulo: 'Receita',
    subtitulo: 'Adicionar uma entrada',
    to: '/lancamentos?tipo=Receita',
  },
  {
    key: 'foto',
    icon: '📷',
    tone: 'bg-amber-950/60 text-amber-400',
    titulo: 'Escanear Fatura',
    subtitulo: 'Importar comprovante com OCR',
    to: '/foto',
  },
];

export default function AddSheet({ onClose }) {
  const navigate = useNavigate();

  function ir(to) {
    onClose();
    navigate(to);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg bg-zinc-900 border-t border-green-900/40 rounded-t-3xl p-5 pb-8 animate-[slideUp_0.2s_ease-out]">
        <div className="w-10 h-1.5 rounded-full bg-zinc-700 mx-auto mb-4" />
        <h2 className="text-white text-lg font-semibold mb-4">Adicionar</h2>

        <div className="space-y-2">
          {OPCOES.map((op) => (
            <button
              key={op.key}
              onClick={() => ir(op.to)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition text-left"
            >
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${op.tone}`}>
                {op.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-white font-medium">{op.titulo}</span>
                <span className="block text-zinc-500 text-sm truncate">{op.subtitulo}</span>
              </span>
              <span className="text-zinc-600">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
