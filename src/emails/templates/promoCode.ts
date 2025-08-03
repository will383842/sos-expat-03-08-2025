// promoCode.ts
import { baseTemplate } from './baseTemplate';

export const promoCode = ({
  firstName,
  code,
  discount,
  expiration,
}: {
  firstName: string;
  code: string;
  discount: string;
  expiration: string;
}) =>
  baseTemplate(`
    <h2>Bonjour ${firstName},</h2>
    <p>Voici votre code promo personnalisé :</p>
    <p style="font-size: 20px; font-weight: bold;">${code}</p>
    <p>⏳ ${discount} valable jusqu'au ${expiration}</p>
    <p>Utilisez-le lors de votre prochaine réservation sur SOS !</p>
  `);
