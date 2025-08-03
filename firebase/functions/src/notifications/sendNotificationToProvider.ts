import * as admin from 'firebase-admin';
import { NotificationData } from './types';
import { logError } from '../utils/logError';
import { twilioClient } from '../lib/twilio';

const db = admin.firestore();

export const sendNotificationToProvider = async (data: NotificationData) => {
  const {
    type,
    recipientId,
    recipientEmail,
    recipientPhone,
    recipientName,
    recipientCountry,
    title,
    message,
    requestDetails,
    metadata,
  } = data;

  let status: 'success' | 'failed' = 'success';
  let channel: 'whatsapp' | 'sms' | 'push' = 'whatsapp';

  try {
    // 1. Tentative d'envoi WhatsApp via Twilio
    try {
      await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${recipientPhone}`,
      });
      channel = 'whatsapp';
    } catch (whatsappError) {
      // 2. Fallback vers SMS si WhatsApp échoue
      console.warn('WhatsApp échoué, tentative SMS...', whatsappError);
      try {
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: recipientPhone,
        });
        channel = 'sms';
      } catch (smsError) {
        console.error('SMS échoué aussi :', smsError);
        status = 'failed';
        await logError('sendNotificationToProvider:smsFailed', {
          recipientPhone,
          smsError,
        });
      }
    }

    // 3. Journalisation Firestore
    await db.collection('notification_logs').add({
      type,
      recipientId,
      recipientEmail,
      recipientPhone,
      recipientName,
      recipientCountry,
      title,
      message,
      requestDetails,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      channel,
      success: status === 'success',
    });

    return status === 'success';
  } catch (error) {
    console.error('Erreur globale sendNotificationToProvider :', error);
    await logError('sendNotificationToProvider:error', { error, data });
    return false;
  }
};
