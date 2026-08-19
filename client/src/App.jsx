import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Lancamentos from './pages/Lancamentos.jsx';
import LancamentoFoto from './pages/LancamentoFoto.jsx';
import Perfil from './pages/Perfil.jsx';
import BottomNav from './components/BottomNav.jsx';

function PrivateRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <CenteredMessage>Carregando...</CenteredMessage>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function CenteredMessage({ children }) {
  return <div className="flex h-screen items-center justify-center text-zinc-400">{children}</div>;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-green-900/40 bg-black/80 sticky top-0 backdrop-blur z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <span className="text-lg font-bold text-green-500">💰 Smart Cash</span>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 pb-28">{children}</main>
      <BottomNav />
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
      <Route
        path="/perfil"
        element={
          <PrivateRoute>
            <Shell>
              <Perfil />
            </Shell>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
