import { sendSmartMessage } from '../sendSmartMessage';

export async function successCallWhatsApp(to: string) {
  await sendSmartMessage({
    toPhone: to,
    body: `✅ Votre appel a bien été réalisé. Merci d’avoir utilisé S.O.S Expat ! Vous pouvez maintenant laisser un avis.`,
    preferWhatsApp: true
  });
}
