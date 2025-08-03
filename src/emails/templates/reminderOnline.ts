// reminderOnline.ts
import { baseTemplate } from './baseTemplate';

export const reminderOnline = ({
  firstName,
  time,
}: {
  firstName: string;
  time: string;
}) =>
  baseTemplate(`
    <h2>Bonjour ${firstName},</h2>
    <p>Vous êtes en ligne depuis <strong>${time}</strong>.</p>
    <p>N'oubliez pas de vous déconnecter si vous n'êtes plus disponible.</p>
    <p>L’équipe SOS</p>
  `);
