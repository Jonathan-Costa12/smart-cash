import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, token } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, senha);
    } catch (err) {
      setError(err.message || 'Não foi possível entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-zinc-900 border border-green-900/40 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-green-500 mb-1">💰 Finanças Casal</h1>
        <p className="text-zinc-400 text-sm mb-6">Entre com sua conta</p>

        <label className="block text-sm text-zinc-300 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg bg-black border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="voce@exemplo.com"
        />

        <label className="block text-sm text-zinc-300 mb-1">Senha</label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-4 rounded-lg bg-black border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 text-black font-semibold py-2 transition"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
