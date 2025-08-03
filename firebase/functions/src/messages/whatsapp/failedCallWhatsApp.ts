import { sendSmartMessage } from '../sendSmartMessage';

export async function failedCallWhatsApp(to: string, isProvider: boolean) {
  await sendSmartMessage({
    toPhone: to,
    body: isProvider
      ? `❌ L'appel a échoué. Le client n’a pas répondu. Vous ne serez pas rémunéré.`
      : `❌ Le prestataire n’a pas répondu. Aucun paiement ne sera effectué. Vous pouvez choisir un autre expert sur S.O.S Expat.`,
    preferWhatsApp: true
  });
}