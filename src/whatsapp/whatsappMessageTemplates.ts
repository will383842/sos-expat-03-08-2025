// src/whatsapp/whatsappMessageTemplates.ts

type MessageTemplate = {
  generate: (data: {
    firstName: string;
    country: string;
    title: string;
    description: string;
    language: string;
  }) => string;
};

const whatsappMessageTemplates: Record<string, MessageTemplate> = {
  fr: {
    generate: ({ firstName, country, title, description, language }) => `
Bonjour, vous avez reçu une nouvelle demande de consultation.
👤 Client : ${firstName}
🌍 Pays demandé : ${country}
📌 Titre : ${title}
📝 Détail : ${description}
🗣️ Langue parlée : ${language}
    `.trim(),
  },
  en: {
    generate: ({ firstName, country, title, description, language }) => `
Hello, you’ve received a new consultation request.
👤 Client: ${firstName}
🌍 Country requested: ${country}
📌 Title: ${title}
📝 Details: ${description}
🗣️ Language spoken: ${language}
    `.trim(),
  },
  es: {
    generate: ({ firstName, country, title, description, language }) => `
Hola, ha recibido una nueva solicitud de consulta.
👤 Cliente: ${firstName}
🌍 País solicitado: ${country}
📌 Título: ${title}
📝 Detalles: ${description}
🗣️ Idioma hablado: ${language}
    `.trim(),
  },
  it: {
    generate: ({ firstName, country, title, description, language }) => `
Ciao, hai ricevuto una nuova richiesta di consulenza.
👤 Cliente: ${firstName}
🌍 Paese richiesto: ${country}
📌 Titolo: ${title}
📝 Dettagli: ${description}
🗣️ Lingua parlata: ${language}
    `.trim(),
  },
  de: {
    generate: ({ firstName, country, title, description, language }) => `
Hallo, Sie haben eine neue Beratungsanfrage erhalten.
👤 Kunde: ${firstName}
🌍 Angefragtes Land: ${country}
📌 Titel: ${title}
📝 Details: ${description}
🗣️ Gesprochene Sprache: ${language}
    `.trim(),
  },
  pt: {
    generate: ({ firstName, country, title, description, language }) => `
Olá, você recebeu uma nova solicitação de consulta.
👤 Cliente: ${firstName}
🌍 País solicitado: ${country}
📌 Título: ${title}
📝 Detalhes: ${description}
🗣️ Idioma falado: ${language}
    `.trim(),
  },
  zh: {
    generate: ({ firstName, country, title, description, language }) => `
您好，您收到了一条新的咨询请求。
👤 客户：${firstName}
🌍 所请求的国家：${country}
📌 标题：${title}
📝 详情：${description}
🗣️ 所讲语言：${language}
    `.trim(),
  },
  ru: {
    generate: ({ firstName, country, title, description, language }) => `
Здравствуйте, вы получили новый запрос на консультацию.
👤 Клиент: ${firstName}
🌍 Запрошенная страна: ${country}
📌 Заголовок: ${title}
📝 Подробности: ${description}
🗣️ Разговорный язык: ${language}
    `.trim(),
  },
};

export default whatsappMessageTemplates;
