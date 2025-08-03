import { sendSmartMessage } from '../sendSmartMessage';

type CallData = {
  title: string;
  language: string;
};

export async function notifyClientWhatsApp(to: string, data: CallData) {
  await sendSmartMessage({
    toPhone: to,
    body: `✅ Votre appel avec un expert S.O.S Expat est prévu dans quelques minutes. Sujet : ${data.title}. Langue : ${data.language}.`,
    preferWhatsApp: true
  });
}
