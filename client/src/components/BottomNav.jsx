import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AddSheet from './AddSheet.jsx';

const ITENS_ESQUERDA = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/lancamentos', label: 'Lançamentos', icon: '📋' },
];

const ITENS_DIREITA = [
  { to: '/foto', label: 'Foto', icon: '📷' },
  { to: '/perfil', label: 'Perfil', icon: '👤' },
];

function NavLink({ item, ativo }) {
  return (
    <Link
      to={item.to}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${
        ativo ? 'text-green-500' : 'text-zinc-500'
      }`}
    >
      <span className="text-lg leading-none">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const [sheetAberto, setSheetAberto] = useState(false);

  return (
    <>
      {sheetAberto && <AddSheet onClose={() => setSheetAberto(false)} />}

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 border-t border-green-900/40 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto relative flex items-stretch">
          {ITENS_ESQUERDA.map((item) => (
            <NavLink key={item.to} item={item} ativo={location.pathname === item.to} />
          ))}

          <div className="w-16 shrink-0" />

          {ITENS_DIREITA.map((item) => (
            <NavLink key={item.to} item={item} ativo={location.pathname === item.to} />
          ))}

          <button
            onClick={() => setSheetAberto(true)}
            aria-label="Adicionar lançamento"
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 text-black text-2xl font-bold flex items-center justify-center shadow-lg shadow-green-950/50 border-4 border-black transition"
          >
            +
          </button>
        </div>
      </nav>
    </>
  );
}
