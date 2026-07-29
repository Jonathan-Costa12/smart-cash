import cron from 'node-cron';
import { checkAndNotifyContasHoje } from './notificationCheck.js';

const CRON_EXPR = process.env.NOTIFICATION_CRON || '0 8 * * *';
const TZ = process.env.NOTIFICATION_TZ || 'America/Sao_Paulo';

export function startScheduler() {
  cron.schedule(
    CRON_EXPR,
    async () => {
      try {
        const result = await checkAndNotifyContasHoje();
        if (result.notificadas > 0 || result.contas.length > 0) {
          console.log(`[scheduler] ${result.contas.length} conta(s) vencendo hoje, ${result.notificadas} notificação(ões) enviada(s).`);
        }
      } catch (err) {
        console.error('[scheduler] erro ao verificar contas do dia:', err);
      }
    },
    { timezone: TZ }
  );
  console.log(`[scheduler] verificação diária de contas agendada: "${CRON_EXPR}" (${TZ})`);
}
