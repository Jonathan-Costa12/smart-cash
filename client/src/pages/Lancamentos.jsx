import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

const currency = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

const emptyForm = {
  tipo: 'Despesa',
  categoria: 'Variavel',
  fonte_descricao: '',
  valor: '',
  vencimento: '',
  pagamento: '',
};

export default function Lancamentos() {
  const { token } = useAuth();
  const [mes, setMes] = useState(mesAtual());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .listLancamentos(token, { mes })
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token, mes]);

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      tipo: item.tipo,
      categoria: item.categoria,
      fonte_descricao: item.fonte_descricao,
      valor: String(item.valor),
      vencimento: item.vencimento,
      pagamento: item.pagamento || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const valorNum = Number(form.valor);
    if (!form.fonte_descricao.trim()) return setFormError('Descrição é obrigatória');
    if (!form.valor || Number.isNaN(valorNum) || valorNum <= 0) return setFormError('Informe um valor válido');
    if (!form.vencimento) return setFormError('Informe a data de vencimento');

    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      fonte_descricao: form.fonte_descricao.trim(),
      valor: valorNum,
      vencimento: form.vencimento,
      pagamento: form.pagamento || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.updateLancamento(token, editingId, payload);
      } else {
        await api.createLancamento(token, payload);
      }
      cancelEdit();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este lançamento?')) return;
    await api.deleteLancamento(token, id);
    load();
  }

  const statusColor = {
    Pago: 'text-emerald-400',
    'A vencer': 'text-amber-400',
    Atrasado: 'text-red-400',
    'Sem valor': 'text-slate-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-white">Lançamentos</h2>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-white text-sm"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-slate-300 text-sm font-medium">
          {editingId ? 'Editar lançamento' : 'Novo lançamento manual'}
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Tipo" value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v })} options={['Receita', 'Despesa']} />
          <Select
            label="Categoria"
            value={form.categoria}
            onChange={(v) => setForm({ ...form, categoria: v })}
            options={[
              { value: 'Fixa', label: 'Fixa' },
              { value: 'Variavel', label: 'Variável' },
            ]}
          />
        </div>

        <Field label="Descrição (fonte)">
          <input
            value={form.fonte_descricao}
            onChange={(e) => setForm({ ...form, fonte_descricao: e.target.value })}
            placeholder="Ex: Energia, Cartão Nubank, Salário"
            className="input"
          />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Valor (R$)">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="input"
              placeholder="0,00"
            />
          </Field>
          <Field label="Vencimento">
            <input
              type="date"
              value={form.vencimento}
              onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Pagamento (se já pago)">
            <input
              type="date"
              value={form.pagamento}
              onChange={(e) => setForm({ ...form, pagamento: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium px-4 py-2 text-sm transition"
          >
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar lançamento'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2 text-sm transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        {loading ? (
          <p className="text-slate-400 text-sm">Carregando...</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum lançamento neste mês.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800">
                  <th className="py-2 pr-3">Descrição</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">Vencimento</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-3 text-white">{item.fonte_descricao}</td>
                    <td className="py-2 pr-3 text-slate-300">{item.tipo}</td>
                    <td className="py-2 pr-3 text-slate-300">{item.categoria === 'Variavel' ? 'Variável' : 'Fixa'}</td>
                    <td className="py-2 pr-3 text-white">{currency(item.valor)}</td>
                    <td className="py-2 pr-3 text-slate-300">{item.vencimento}</td>
                    <td className={`py-2 pr-3 ${statusColor[item.status]}`}>{item.status}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <button onClick={() => startEdit(item)} className="text-indigo-400 hover:underline mr-3">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:underline">
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((opt) => {
          const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
          return (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          );
        })}
      </select>
    </Field>
  );
}
