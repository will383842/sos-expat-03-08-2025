﻿// TemplatesManager.tsx
import React from 'react';
import {
  bookingConfirmation,
  contactReply,
  newsletter,
  promoCode,
  reminderOnline,
} from '../../templates';

const templates = [
  {
    name: 'ðŸ“… Confirmation de RDV',
    render: bookingConfirmation,
    exampleData: {
      firstName: 'Alice',
      date: '01/08/2025 Ã  14h30',
      providerName: 'Me Jean Dupont',
      serviceTitle: 'Visa Ã©tudiant',
    },
  },
  {
    name: 'ðŸ“¨ RÃ©ponse message contact',
    render: contactReply,
    exampleData: {
      firstName: 'Alice',
      userMessage: 'Bonjour, jâ€™ai besoin dâ€™aide pour mon dossier.',
      adminReply: 'Merci pour votre message. Voici comment procÃ©der...',
    },
  },
  {
    name: 'ðŸ“° Newsletter',
    render: newsletter,
    exampleData: {
      greeting: 'Bonjour Ã  tous ðŸ‘‹',
      content: 'Voici les nouveautÃ©s du mois de juillet.',
    },
  },
  {
    name: 'ðŸ·ï¸ Code promo',
    render: promoCode,
    exampleData: {
      firstName: 'Alice',
      code: 'WELCOME15',
      discount: '-15 % sur votre prochain appel',
      expiration: '30/08/2025',
    },
  },
  {
    name: 'â° Rappel prestataire en ligne',
    render: reminderOnline,
    exampleData: {
      firstName: 'Alice',
      time: '2 heures',
    },
  },
];

const TemplatesManager: React.FC = () => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">ðŸ§± AperÃ§u des templates disponibles</h2>
      <p className="text-gray-600 mb-6">
        Voici un aperÃ§u en temps rÃ©el de tous les templates d'emails intÃ©grÃ©s.
      </p>

      <div className="space-y-8">
        {templates.map((tpl, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-md shadow-sm bg-white p-4"
          >
            <h3 className="text-lg font-bold mb-2">{tpl.name}</h3>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: tpl.render(tpl.exampleData) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplatesManager;


