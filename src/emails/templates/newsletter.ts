// newsletter.ts
import { baseTemplate } from './baseTemplate';

export const newsletter = ({
  greeting,
  content,
}: {
  greeting: string;
  content: string;
}) =>
  baseTemplate(`
    <h2>${greeting}</h2>
    <p>${content}</p>
    <hr/>
    <p style="font-size: 12px; color: #888;">Vous recevez ce message car vous êtes inscrit à notre newsletter.</p>
  `);
