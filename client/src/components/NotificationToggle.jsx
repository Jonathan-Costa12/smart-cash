import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { isPushSupported, getCurrentSubscription, subscribeToPush, unsubscribeFromPush } from '../push.js';

export default function NotificationToggle() {
  const { token } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supported = isPushSupported();

  useEffect(() => {
    if (!supported) return;
    getCurrentSubscription().then((sub) => setSubscribed(Boolean(sub)));
  }, [supported]);

  if (!supported) return null;

  async function toggle() {
    setError('');
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush(token);
        setSubscribed(false);
      } else {
        await subscribeToPush(token);
        setSubscribed(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        title={subscribed ? 'Notificações ativadas — clique para desativar' : 'Ativar notificações de contas vencendo hoje'}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
          subscribed
            ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        {loading ? '...' : subscribed ? '🔔 Ativadas' : '🔕 Ativar avisos'}
      </button>
      {error && <span className="text-xs text-red-400 max-w-[160px]">{error}</span>}
    </div>
  );
}
