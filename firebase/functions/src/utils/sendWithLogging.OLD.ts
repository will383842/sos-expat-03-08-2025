import { logNotification } from './logNotification';
import { logError } from './logError';

/**
 * Envoie un message (SMS, WhatsApp, vocal...) et loggue automatiquement.
 */
export async function sendWithLogging({
  to,
  channel,
  type,
  userId,
  content,
  sendFunction
}: {
  to: string;
  channel: 'whatsapp' | 'sms' | 'voice';
  type: 'notify' | 'success' | 'failure';
  userId?: string;
  content: string;
  sendFunction: () => Promise<void>;
}) {
  try {
    await sendFunction();

    await logNotification({
      to,
      channel,
      type,
      userId,
      content,
      status: 'sent'
    });
  } catch (error) {
    await logError(`sendWithLogging:${channel}`, error);

    await logNotification({
      to,
      channel,
      type,
      userId,
      content,
      status: 'failed'
    });
  }
}
