import { sendSmartMessage } from '../sendSmartMessage';

export async function successCallSMS(to: string) {
  await sendSmartMessage({
    toPhone: to,
    body: `Merci d’avoir utilisé S.O.S Expat. Vous pouvez laisser un avis.`,
    preferWhatsApp: false
  });
}
