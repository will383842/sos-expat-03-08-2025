import { sendSmartMessage } from '../sendSmartMessage';

type CallData = {
  title: string;
  language: string;
};

export async function notifyClientSMS(to: string, data: CallData) {
  await sendSmartMessage({
    toPhone: to,
    body: `Votre appel SOS Expat est prévu dans quelques minutes. Sujet : ${data.title}. Langue : ${data.language}.`,
    preferWhatsApp: false
  });
}
