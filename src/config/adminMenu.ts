export type AdminMenuItem = {
  id: string;
  label: string;
  path?: string;
  children?: AdminMenuItem[];
};

export const adminMenuTree: AdminMenuItem[] = [
  {
    id: 'finance',
    label: 'Finances & Facturation',
    children: [
      { id: 'payments',   label: 'Paiements',             path: '/admin/finance/payments' },
      { id: 'invoices',   label: 'Facturation',           path: '/admin/finance/invoices' },
      { id: 'tax',        label: 'TVA & Taxes',           path: '/admin/finance/taxes' },
      { id: 'recon',      label: 'Rapprochement',         path: '/admin/finance/reconciliation' },
      { id: 'disputes',   label: 'Litiges (Disputes)',    path: '/admin/finance/disputes' },
      { id: 'refunds',    label: 'Remboursements',        path: '/admin/finance/refunds' },
      { id: 'payouts',    label: 'Payouts prestataires',  path: '/admin/finance/payouts' },
      { id: 'exports',    label: 'Rapports & Exports',    path: '/admin/finance/exports' },
      { id: 'ledger',     label: 'Grand livre',           path: '/admin/finance/ledger' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    children: [
      { id: 'campaigns',      label: 'Campagnes',             path: '/admin/comms/campaigns' },
      { id: 'automations',    label: 'Automations',           path: '/admin/comms/automations' },
      { id: 'segments',       label: 'Segments',              path: '/admin/comms/segments' },
      { id: 'templates',      label: 'Templates',             path: '/admin/comms/templates' },
      { id: 'deliverability', label: 'Deliverability',        path: '/admin/comms/deliverability' },
      { id: 'suppression',    label: 'Suppression Lists',     path: '/admin/comms/suppression' },
      { id: 'abtests',        label: 'A/B Tests',             path: '/admin/comms/ab' },
      { id: 'messages',       label: 'Messages (temps réel)', path: '/admin/comms/messages' },
      { id: 'notifications',  label: 'Logs de notif',         path: '/admin/comms/notifications' },
    ],
  },
  {
    id: 'aff',
    label: 'Affiliation & Ambassadeurs',
    children: [
      { id: 'aff-list',    label: 'Affiliés',            path: '/admin/affiliates' },
      { id: 'aff-rules',   label: 'Règles commission',   path: '/admin/affiliates/commissions' },
      { id: 'aff-payouts', label: 'Payouts',             path: '/admin/affiliates/payouts' },
      { id: 'ambassadors', label: 'Ambassadeurs',        path: '/admin/ambassadors' },
    ],
  },
  {
    id: 'b2b',
    label: 'Entreprises (B2B)',
    children: [
      { id: 'b2b-accounts', label: 'Comptes',            path: '/admin/b2b/accounts' },
      { id: 'b2b-members',  label: 'Membres',            path: '/admin/b2b/members' },
      { id: 'b2b-pricing',  label: 'Tarifs & Contrats',  path: '/admin/b2b/pricing' },
      { id: 'b2b-billing',  label: 'Facturation',        path: '/admin/b2b/billing' },
      { id: 'b2b-invoices', label: 'Factures',           path: '/admin/b2b/invoices' },
      { id: 'b2b-reports',  label: 'Rapports',           path: '/admin/b2b/reports' },
    ],
  },
  {
    id: 'users',
    label: 'Utilisateurs & Prestataires',
    children: [
      { id: 'users-list',   label: 'Utilisateurs > Liste',   path: '/admin/users/list' },
      { id: 'providers',    label: 'Prestataires > Liste',   path: '/admin/providers' },
      { id: 'kyc',          label: 'Validation & KYC',       path: '/admin/approvals' },
      { id: 'aaaprofiles',  label: 'AAA Profiles',           path: '/admin/aaaprofiles' },
      { id: 'reviews',      label: 'Avis & Notations',       path: '/admin/reviews' },
    ],
  },
];
