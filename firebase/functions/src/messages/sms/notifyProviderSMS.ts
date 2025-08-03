import { sendSmartMessage } from '../sendSmartMessage';

type CallData = {
  title: string;
  language: string;
};

export async function notifyProviderSMS(to: string, data: CallData) {
  await sendSmartMessage({
    toPhone: to,
    body: `SOS Expat: un client va vous appeler dans 5min. Titre: ${data.title}. Langue: ${data.language}`,
    preferWhatsApp: false,
  });
}
