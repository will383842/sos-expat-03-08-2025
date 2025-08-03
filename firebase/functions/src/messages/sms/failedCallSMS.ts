import { sendSmartMessage } from '../sendSmartMessage';

export async function failedCallSMS(to: string, isProvider: boolean) {
  await sendSmartMessage({
    toPhone: to,
    body: isProvider
      ? `L'appel a échoué. Le client n’a pas répondu.`
      : `Le prestataire n’a pas répondu. Aucun paiement ne sera effectué.`,
    preferWhatsApp: false
  });
}