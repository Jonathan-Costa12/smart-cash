import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const emptyForm = {
  tipo: 'Despesa',
  categoria: 'Variavel',
  fonte_descricao: '',
  valor: '',
  vencimento: '',
  pagamento: '',
};

export default function LancamentoFoto() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extraindo, setExtraindo] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [confianca, setConfianca] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setOcrError('');
    setShowForm(false);
    setConfianca(null);
  }

  async function handleExtrair() {
    if (!file) return;
    setExtraindo(true);
    setOcrError('');
    try {
      const imageBase64 = await fileToBase64(file);
      const dados = await api.ocrExtrair(token, { imageBase64, mediaType: file.type });
      setForm({
        tipo: dados.tipo_sugerido || 'Despesa',
        categoria: dados.categoria_sugerida || 'Variavel',
        fonte_descricao: dados.fornecedor || '',
        valor: dados.valor != null ? String(dados.valor) : '',
        vencimento: dados.data || '',
        pagamento: '',
      });
      setConfianca(dados.confianca || null);
      setShowForm(true);
    } catch (err) {
      setOcrError(err.message);
    } finally {
      setExtraindo(false);
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    setSaveError('');

    const valorNum = Number(form.valor);
    if (!form.fonte_descricao.trim()) return setSaveError('Descrição é obrigatória');
    if (!form.valor || Number.isNaN(valorNum) || valorNum <= 0) return setSaveError('Informe um valor válido');
    if (!form.vencimento) return setSaveError('Informe a data de vencimento');

    setSaving(true);
    try {
      await api.createLancamento(token, {
        tipo: form.tipo,
        categoria: form.categoria,
        fonte_descricao: form.fonte_descricao.trim(),
        valor: valorNum,
        vencimento: form.vencimento,
        pagamento: form.pagamento || null,
        origem: 'foto_ocr',
      });
      navigate('/lancamentos');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-semibold text-white">Lançamento por foto</h2>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <label className="block">
          <span className="block text-xs text-slate-400 mb-2">Foto do comprovante/boleto</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
          />
        </label>

        {previewUrl && (
          <img src={previewUrl} alt="Pré-visualização do comprovante" className="max-h-64 rounded-lg border border-slate-800 mx-auto" />
        )}

        {file && !showForm && (
          <button
            onClick={handleExtrair}
            disabled={extraindo}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium py-2 text-sm transition"
          >
            {extraindo ? 'Lendo comprovante...' : '🔎 Extrair dados da foto'}
          </button>
        )}

        {ocrError && (
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/40 text-amber-200 px-4 py-3 text-sm">
            {ocrError}
            <div className="mt-2">
              <a href="/lancamentos" className="underline text-amber-300">
                Prefere lançar manualmente enquanto isso?
              </a>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSalvar} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-300 text-sm font-medium">Confirme os dados extraídos</h3>
            {confianca && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  confianca === 'alta'
                    ? 'bg-emerald-900/40 text-emerald-300'
                    : confianca === 'media'
                    ? 'bg-amber-900/40 text-amber-300'
                    : 'bg-red-900/40 text-red-300'
                }`}
              >
                confiança: {confianca}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Revise os campos antes de salvar — a extração é automática e pode errar.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs text-slate-400 mb-1">Tipo</span>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="input">
                <option value="Receita">Receita</option>
                <option value="Despesa">Despesa</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs text-slate-400 mb-1">Categoria</span>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="input"
              >
                <option value="Fixa">Fixa</option>
                <option value="Variavel">Variável</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-xs text-slate-400 mb-1">Descrição (fonte)</span>
            <input
              value={form.fonte_descricao}
              onChange={(e) => setForm({ ...form, fonte_descricao: e.target.value })}
              className="input"
            />
          </label>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-xs text-slate-400 mb-1">Valor (R$)</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-slate-400 mb-1">Vencimento</span>
              <input
                type="date"
                value={form.vencimento}
                onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                className="input"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-slate-400 mb-1">Pagamento (se já pago)</span>
              <input
                type="date"
                value={form.pagamento}
                onChange={(e) => setForm({ ...form, pagamento: e.target.value })}
                className="input"
              />
            </label>
          </div>

          {saveError && <p className="text-sm text-red-400">{saveError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium py-2 text-sm transition"
          >
            {saving ? 'Salvando...' : '✅ Confirmar e salvar lançamento'}
          </button>
        </form>
      )}
    </div>
  );
}
