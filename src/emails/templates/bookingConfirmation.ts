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
    <p>Votre rendez-vous a bien été confirmé avec <strong>${providerName}</strong>.</p>
    <p><strong>Service :</strong> ${serviceTitle}</p>
    <p><strong>Date :</strong> ${date}</p>
    <br/>
    <p>Merci d’avoir choisi notre plateforme.</p>
  `);