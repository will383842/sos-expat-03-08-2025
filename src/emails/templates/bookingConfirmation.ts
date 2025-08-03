// bookingConfirmation.ts
import { baseTemplate } from './baseTemplate';

export const bookingConfirmation = ({
  firstName,
  date,
  providerName,
  serviceTitle,
}: {
  firstName: string;
  date: string;
  providerName: string;
  serviceTitle: string;
}) =>
  baseTemplate(`
    <h2>Bonjour ${firstName},</h2>
    <p>Votre rendez-vous a bien été confirmé avec <strong>${provider
