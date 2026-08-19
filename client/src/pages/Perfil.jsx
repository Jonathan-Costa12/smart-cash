import { useAuth } from '../context/AuthContext.jsx';
import NotificationToggle from '../components/NotificationToggle.jsx';

export default function Perfil() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-semibold text-white">Perfil</h2>

      <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-green-600 text-black flex items-center justify-center text-xl font-bold shrink-0">
          {user?.nome?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <p className="text-white font-medium truncate">{user?.nome}</p>
          <p className="text-zinc-500 text-sm truncate">{user?.email}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5 space-y-3">
        <h3 className="text-zinc-300 text-sm font-medium">Notificações</h3>
        <p className="text-zinc-500 text-sm">
          Receba um aviso quando alguma conta vencer no dia — evita esquecer pagamentos e pagar juros.
        </p>
        <NotificationToggle />
      </div>

      <button
        onClick={logout}
        className="w-full rounded-lg bg-zinc-900 border border-red-900/40 hover:bg-red-950/40 text-red-400 font-medium py-3 text-sm transition"
      >
        Sair da conta
      </button>
    </div>
  );
}
