// src/data/profile-photos.ts
import type { AaaPhoto } from '../pages/admin/AdminAaaProfiles';

// Exemple minimal — complète avec tes URLs DALL·E / libres de droits
export const PROFILE_PHOTOS: AaaPhoto[] = [
  // Avocats hommes
  { url: 'https://…/lawyer-m-01.jpg', role: 'lawyer', gender: 'male', countries: ['France','Canada'], weight: 2 },
  { url: 'https://…/lawyer-m-02.jpg', role: 'lawyer', gender: 'male' },

  // Avocates femmes
  { url: 'https://…/lawyer-f-01.jpg', role: 'lawyer', gender: 'female', countries: ['Thaïlande'] },

  // Expat hommes
  { url: 'https://…/expat-m-01.jpg', role: 'expat', gender: 'male' },

  // Expat femmes
  { url: 'https://…/expat-f-01.jpg', role: 'expat', gender: 'female', countries: ['Espagne','Portugal'] },
];
