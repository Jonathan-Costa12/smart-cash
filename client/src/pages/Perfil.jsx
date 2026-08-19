import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
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
          <p className="text-white font-medium truncate flex items-center gap-2">
            {user?.nome}
            {user?.isMaster && (
              <span className="text-[10px] uppercase tracking-wide bg-green-950/60 text-green-400 px-2 py-0.5 rounded-full">
                Master
              </span>
            )}
          </p>
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

      {user?.isMaster && <GerenciarUsuarios />}

      <button
        onClick={logout}
        className="w-full rounded-lg bg-zinc-900 border border-red-900/40 hover:bg-red-950/40 text-red-400 font-medium py-3 text-sm transition"
      >
        Sair da conta
      </button>
    </div>
  );
}

const emptyForm = { email: '', senha: '', nome: '' };

function GerenciarUsuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [saving, setSaving] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  function load() {
    setLoading(true);
    api
      .listUsuarios(token)
      .then(setUsuarios)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSucesso('');

    if (!form.nome.trim()) return setFormError('Nome é obrigatório');
    if (!form.email.trim()) return setFormError('E-mail é obrigatório');
    if (form.senha.length < 6) return setFormError('Senha deve ter pelo menos 6 caracteres');

    setSaving(true);
    try {
      await api.criarUsuario(token, { email: form.email.trim(), senha: form.senha, nome: form.nome.trim() });
      setSucesso(`Conta de ${form.nome.trim()} criada — já pode fazer login com o e-mail e senha cadastrados.`);
      setForm(emptyForm);
      setMostrarForm(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-300 text-sm font-medium">Usuários</h3>
        <button
          onClick={() => {
            setMostrarForm((v) => !v);
            setSucesso('');
          }}
          className="text-green-400 text-sm hover:underline"
        >
          {mostrarForm ? 'Cancelar' : '+ Nova conta'}
        </button>
      </div>

      {sucesso && <p className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-3">{sucesso}</p>}

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-zinc-800 pt-3">
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Nome</span>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="input" />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-zinc-400 mb-1">Senha (mín. 6 caracteres)</span>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className="input"
            />
          </label>
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 text-black font-medium py-2 text-sm transition"
          >
            {saving ? 'Criando...' : 'Criar conta'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-zinc-500 text-sm">Carregando...</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {usuarios.map((u) => (
            <li key={u.id} className="py-2 flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="text-white truncate">{u.nome}</p>
                <p className="text-zinc-500 truncate">{u.email}</p>
              </div>
              {u.isMaster && <span className="text-[10px] uppercase text-green-400 shrink-0">Master</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
