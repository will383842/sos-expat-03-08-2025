import { sendSmartMessage } from '../sendSmartMessage';

type CallData = {
  title: string;
  language: string;
};

export async function notifyProviderWhatsApp(to: string, data: CallData) {
  await sendSmartMessage({
    toPhone: to,
    body: `🔔 SOS Expat : Un client va vous appeler dans 5 minutes.\nTitre : ${data.title}\nLangue : ${data.language}`,
    preferWhatsApp: true,
  });
}
