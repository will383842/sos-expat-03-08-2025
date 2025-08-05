import { db, FieldValue } from './firebase';
import { NotificationLogData } from './types';

export async function logNotification(data: NotificationLogData) {
  try {
    const logData = {
      ...data,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
      environment: process.env.NODE_ENV || 'development'
    };

    await db.collection('notification_logs').add(logData);

    console.log(`[NOTIFICATION] ${data.channel.toUpperCase()} to ${data.to}: ${data.status}`);

    if (data.status === 'failed' && data.errorMessage) {
      await db.collection('error_logs').add({
        context: `notification_${data.channel}`,
        message: data.errorMessage,
        timestamp: FieldValue.serverTimestamp(),
        severity: 'medium',
        additionalData: {
          to: data.to,
          channel: data.channel,
          type: data.type
        }
      });
    }

  } catch (error) {
    console.error('Failed to log notification:', error);
    console.error('Notification data:', data);
  }
}
