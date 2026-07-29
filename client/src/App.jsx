import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import LancamentoFoto from './pages/LancamentoFoto.jsx';
import NotificationToggle from './components/NotificationToggle.jsx';

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <CenteredMessage>Carregando...</CenteredMessage>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function CenteredMessage({ children }) {
  return <div className="flex h-screen items-center justify-center text-slate-400">{children}</div>;
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const linkClass = (path) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${
      location.pathname === path ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">💰 Finanças Casal</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link className={linkClass('/')} to="/">
              Dashboard
            </Link>
            <Link className={linkClass('/lancamentos')} to="/lancamentos">
              Lançamentos
            </Link>
            <Link className={linkClass('/foto')} to="/foto">
              📷 Foto
            </Link>
            <NotificationToggle />
            <span className="text-sm text-slate-400 ml-2 hidden sm:inline">{user?.nome}</span>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Shell>
              <Dashboard />
            </Shell>
          </PrivateRoute>
        }
      />
      <Route
        path="/lancamentos"
        element={
          <PrivateRoute>
            <Shell>
              <Lancamentos />
            </Shell>
          </PrivateRoute>
        }
      />
      <Route
        path="/foto"
        element={
          <PrivateRoute>
            <Shell>
              <LancamentoFoto />
            </Shell>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
