import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Type pour définir la structure attendue
export interface TemplatesByEvent {
  email?: {
    subject?: string;
    body?: string;
    html?: string;
  };
  sms?: {
    message?: string;
  };
  whatsapp?: {
    message?: string;
    template_name?: string;
    parameters?: any[];
  };
  push?: {
    title?: string;
    body?: string;
    data?: Record<string, any>;
  };
  inapp?: {
    title?: string;
    message?: string;
    action?: string;
    data?: Record<string, any>;
  };
  defaults?: Record<string, any>;
}

export async function getTemplate(locale: 'fr-FR' | 'en', eventId: string): Promise<TemplatesByEvent | null> {
  const col = db.collection('message_templates').doc(locale);
  let doc = await col.collection('items').doc(eventId).get();
  
  // Fallback vers 'en' si le template n'existe pas dans la locale demandée
  if (!doc.exists && locale !== 'en') {
    doc = await db.collection('message_templates').doc('en').collection('items').doc(eventId).get();
  }
  
  if (!doc.exists) return null;
  
  // Récupération des defaults
  const defaultsSnap = await col.collection('_meta').doc('defaults').get();
  
  // Construction de l'objet avec tous les canaux
  const templateData = doc.data() || {};
  
  return {
    email: templateData.email || undefined,
    sms: templateData.sms || undefined,
    whatsapp: templateData.whatsapp || undefined,
    push: templateData.push || undefined,
    inapp: templateData.inapp || undefined,
    defaults: defaultsSnap.data() ?? {}
  } as TemplatesByEvent;
}