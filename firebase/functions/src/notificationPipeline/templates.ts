import { getFirestore } from 'firebase-admin/firestore';
import { TemplatesByEvent } from './types';

const db = getFirestore();

export async function getTemplate(locale: 'fr-FR'|'en', eventId: string): Promise<TemplatesByEvent | null> {
  const col = db.collection('message_templates').doc(locale);
  let doc = await col.collection('items').doc(eventId).get();
  
  // Fallback vers 'en' si le template n'existe pas dans la locale demandée
  if (!doc.exists && locale !== 'en') {
    doc = await db.collection('message_templates').doc('en').collection('items').doc(eventId).get();
  }
  
  if (!doc.exists) return null;
  
  const templateData = doc.data() || {};
  
  // ADAPTATEUR : Convertir l'ancien format vers le nouveau
  // Tes JSON actuels ont la structure : { "email": { "subject": "...", "html": "..." } }
  // On doit les convertir vers : { "email": { "enabled": true, "subject": "...", "html": "..." } }
  
  return {
    _meta: templateData._meta,
    email: templateData.email ? {
      enabled: templateData.channels?.email !== false, // Par défaut enabled si pas spécifié
      subject: templateData.email.subject || "",
      html: templateData.email.html,
      text: templateData.email.text
    } : undefined,
    
    sms: templateData.sms ? {
      enabled: templateData.channels?.sms !== false,
      text: templateData.sms.text || templateData.sms.message || ""
    } : undefined,
    
    whatsapp: templateData.whatsapp ? {
      enabled: templateData.channels?.whatsapp !== false,
      templateName: templateData.whatsapp.twilio_template_name || "",
      params: templateData.whatsapp.params || []
    } : undefined,
    
    push: templateData.push ? {
      enabled: templateData.channels?.push !== false,
      title: templateData.push.title || "",
      body: templateData.push.body || "",
      deeplink: templateData.push.deeplink
    } : undefined,
    
    inapp: templateData.inapp ? {
      enabled: templateData.channels?.inapp !== false,
      title: templateData.inapp.title || "",
      body: templateData.inapp.body || templateData.inapp.message || ""
    } : undefined
  } as TemplatesByEvent;
}