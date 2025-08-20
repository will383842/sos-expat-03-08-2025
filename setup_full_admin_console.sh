#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------
# Full Admin Console setup (UI-only, safe)
# - Creates Sidebar+Topbar layout (V2)
# - Adds menu+routes (incl. aaaprofiles, Providers split)
# - Adds new modules: Communications, Affiliates, B2B
# - Adds Finance/Accounting pages: VAT, by-country, reconciliation, etc.
# - Adds RO services & types (no writes)
# - Generates placeholder pages if referenced ones are missing
# ---------------------------------------------

echo "==> Creating folders"
mkdir -p src/config src/contexts src/types src/utils
mkdir -p src/components/admin/{sidebar,topbar}
mkdir -p src/features/users/providers/{lawyers,expats}
mkdir -p src/features/{affiliates,comms,b2b}
mkdir -p src/services/{affiliates,comms,b2b}
mkdir -p src/features/finance/pages
mkdir -p src/services/finance
mkdir -p src/pages/admin || true

# Helper to create a stub page if not present
ensure_stub() {
  local file="$1"
  local title="$2"
  if [ ! -f "$file" ]; then
    mkdir -p "$(dirname "$file")"
    cat > "$file" <<EOX
import React from 'react';
export default function $(basename "$file" .tsx)(){ return <div style={{padding:16}}><h1>$title</h1><p>Stub page (placeholder). Replace with your real component if needed.</p></div>; }
EOX
    echo "  - Stub created: $file"
  else
    echo "  - Kept existing: $file"
  fi
}

echo "==> Placeholder component"
cat > src/components/admin/Placeholder.tsx << 'EOX'
import React from 'react';
export default function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="p-6 border border-dashed rounded">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="opacity-80">UI en cours. Aucune logique métier impactée.{note ? ' ' + note : ''}</p>
    </div>
  );
}
EOX

echo "==> AdminUIContext (period/country/language/currency)"
cat > src/contexts/AdminUIContext.tsx << 'EOX'
import React, { createContext, useContext, useMemo, useState } from 'react';
type PeriodPreset = '7d'|'30d'|'MTD'|'QTD'|'YTD'|'custom';
type AdminScope = { country?: string; language?: string; currency?: string; period: PeriodPreset; };
const AdminUIContext = createContext<{scope:AdminScope; setScope:(p:Partial<AdminScope>)=>void}>({scope:{period:'30d'}, setScope:()=>{}});
export const AdminUIProvider: React.FC<{children:React.ReactNode}> = ({children})=>{
  const [scope, setScopeState] = useState<AdminScope>({ period:'30d' });
  const setScope = (p: Partial<AdminScope>)=>setScopeState(s=>({...s, ...p}));
  const value = useMemo(()=>({scope, setScope}),[scope]);
  return <AdminUIContext.Provider value={value}>{children}</AdminUIContext.Provider>;
};
export const useAdminUI = ()=>useContext(AdminUIContext);
EOX

echo "==> Menu config"
cat > src/config/adminMenu.ts << 'EOX'
export type AdminMenuItem = { id: string; label: string; path?: string; icon?: string; defaultOpen?: boolean; children?: AdminMenuItem[]; };
export const adminMenuTree: AdminMenuItem[] = [
  { id:'dash', label:'Tableaux de bord', defaultOpen:true, children:[
    { id:'dash-global', label:'Global', path:'/admin/dashboard/global', children:[
      { id:'dash-overview', label:'Vue d’ensemble', path:'/admin/dashboard/global' },
      { id:'dash-alerts', label:'Alertes & Incidents', path:'/admin/dashboard/alerts' },
      { id:'dash-reports', label:'Rapports rapides', path:'/admin/dashboard/reports' },
    ]},
    { id:'dash-ceo', label:'CEO', path:'/admin/dashboard/ceo' },
    { id:'dash-cfo', label:'CFO', path:'/admin/dashboard/cfo' },
    { id:'dash-mkt', label:'Marketing', path:'/admin/dashboard/marketing' },
    { id:'dash-ops', label:'Opérations', path:'/admin/dashboard/ops' },
    { id:'dash-country', label:'Par pays / région', path:'/admin/dashboard/by-country' },
    { id:'dash-provider', label:'Par type de prestataire', children:[
      { id:'lawyers', label:'Avocats', path:'/admin/dashboard/providers/lawyers' },
      { id:'expats', label:'Expatriés', path:'/admin/dashboard/providers/expats' },
    ]},
  ]},
  { id:'users', label:'Utilisateurs & Prestataires', children:[
    { id:'users-list', label:'Utilisateurs > Liste', path:'/admin/users/list' },
    { id:'users-segments', label:'Utilisateurs > Segments', path:'/admin/users/segments' },
    { id:'providers', label:'Prestataires', children:[
      { id:'providers-tabs', label:'Vue générale', path:'/admin/users/providers' },
      { id:'providers-lawyers', label:'Avocats', path:'/admin/users/providers/lawyers' },
      { id:'providers-expats', label:'Expatriés', path:'/admin/users/providers/expats' },
    ]},
    { id:'providers-kyc', label:'Validation & KYC', path:'/admin/approvals' },
    { id:'aaaprofiles', label:'AAA Profiles', path:'/admin/aaaprofiles' },
    { id:'reviews', label:'Avis & Notations', path:'/admin/reviews' },
  ]},
  { id:'calls', label:'Appels & Planification', children:[
    { id:'monitor', label:'Monitoring temps réel', path:'/admin/calls/monitor' },
    { id:'sessions', label:'Sessions d’appel', path:'/admin/calls/sessions' },
    { id:'planning', label:'Planification', path:'/admin/calls/planning' },
    { id:'qos', label:'Qualité audio (Twilio)', path:'/admin/calls/qos' },
  ]},
  { id:'finance', label:'Finances & Comptabilité', children:[
    { id:'payments', label:'Paiements', path:'/admin/finance/payments' },
    { id:'invoices', label:'Factures', path:'/admin/finance/invoices' },
    { id:'tva', label:'TVA', path:'/admin/finance/tva' },
    { id:'tva-returns', label:'TVA – Déclarations', path:'/admin/finance/tva/returns' },
    { id:'by-country', label:'Par pays / devise', path:'/admin/finance/by-country' },
    { id:'reco', label:'Rapprochement', path:'/admin/finance/reconciliation' },
    { id:'disputes', label:'Litiges', path:'/admin/finance/disputes' },
    { id:'refunds', label:'Remboursements', path:'/admin/finance/refunds' },
    { id:'ledger', label:'Grand livre', path:'/admin/finance/ledger' },
    { id:'exports', label:'Exports', path:'/admin/finance/exports' },
    { id:'budgets', label:'Budgets & Prévisions', path:'/admin/finance/budgets' },
    { id:'audit', label:'Audit financier', path:'/admin/finance/audit' },
  ]},
  { id:'bi', label:'Analytics & BI', children:[
    { id:'reports', label:'Rapports', path:'/admin/bi/reports' },
    { id:'cohorts', label:'Cohortes & Rétention', path:'/admin/bi/cohorts' },
    { id:'funnels', label:'Funnels & Conversion', path:'/admin/bi/funnels' },
    { id:'predict', label:'Prédictif & Anomalies', path:'/admin/bi/predict' },
  ]},
  { id:'comms', label:'Communications', children:[
    { id:'campaigns', label:'Campagnes', path:'/admin/comms/campaigns' },
    { id:'automations', label:'Automations (Journeys)', path:'/admin/comms/automations' },
    { id:'segments', label:'Segments/Audiences', path:'/admin/comms/segments' },
    { id:'templates', label:'Templates', path:'/admin/comms/templates' },
    { id:'deliverability', label:'Deliverability & Qualité', path:'/admin/comms/deliverability' },
    { id:'suppression', label:'Suppression Lists', path:'/admin/comms/suppression' },
    { id:'abtests', label:'A/B Tests', path:'/admin/comms/ab' },
    { id:'messages', label:'Messages (temps réel)', path:'/admin/comms/messages' },
    { id:'notifications', label:'Logs de notif', path:'/admin/comms/notifications' },
  ]},
  { id:'aff', label:'Affiliation & Ambassadeurs', children:[
    { id:'aff-list', label:'Affiliés', path:'/admin/affiliates' },
    { id:'aff-comm', label:'Règles de commission', path:'/admin/affiliates/commissions' },
    { id:'aff-pay', label:'Payouts affiliés', path:'/admin/affiliates/payouts' },
    { id:'amb', label:'Ambassadeurs', path:'/admin/ambassadors' },
  ]},
  { id:'b2b', label:'Entreprises (B2B)', children:[
    { id:'b2b-accounts', label:'Comptes', path:'/admin/b2b/accounts' },
    { id:'b2b-members', label:'Membres/Clients', path:'/admin/b2b/members' },
    { id:'b2b-pricing', label:'Tarifs & Contrats', path:'/admin/b2b/pricing' },
    { id:'b2b-billing', label:'Facturation & Abonnements', path:'/admin/b2b/billing' },
    { id:'b2b-invoices', label:'Factures', path:'/admin/b2b/invoices' },
    { id:'b2b-reports', label:'Rapports', path:'/admin/b2b/reports' },
  ]},
  { id:'cms', label:'CMS & Contenu', children:[
    { id:'media', label:'Médias', path:'/admin/cms/media' },
    { id:'legal', label:'Documents légaux', path:'/admin/cms/legal' },
  ]},
  { id:'tools', label:'Outils & Plateforme', children:[
    { id:'apis', label:'APIs & Webhooks', path:'/admin/tools/apis' },
    { id:'logs', label:'Logs & Traçabilité', path:'/admin/tools/logs' },
    { id:'backups', label:'Backups & DR', path:'/admin/tools/backups' },
  ]},
  { id:'settings', label:'Paramètres', children:[
    { id:'countries', label:'Pays', path:'/admin/settings/countries' },
    { id:'pricing', label:'Tarification & Promotions', path:'/admin/settings/pricing' },
    { id:'settings-root', label:'Généraux', path:'/admin/settings' },
  ]},
  { id:'admin', label:'Administration', children:[
    { id:'rbac', label:'Rôles & Permissions', path:'/admin/admin/rbac' },
    { id:'audit', label:'Audit admin', path:'/admin/admin/audit' },
  ]},
];
EOX

echo "==> Sidebar (renderer)"
cat > src/components/admin/sidebar/SidebarItem.tsx << 'EOX'
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AdminMenuItem } from '@/config/adminMenu';
export default function SidebarItem({ node, level=0 }: { node: AdminMenuItem; level?: number }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState<boolean>(Boolean(node.defaultOpen));
  const isActive = node.path ? pathname.startsWith(node.path) : false;
  const pad = `pl-${Math.min(2 + level*2, 10)}`;
  if (node.children?.length) {
    return (
      <div className="mb-1">
        <button onClick={() => setOpen(o=>!o)} className={`w-full ${pad} py-2 text-left rounded hover:bg-gray-800/40`}>
          <span className={isActive ? 'font-semibold' : ''}>{node.label}</span>
          <span className={`float-right transition ${open?'rotate-180':''}`}>▾</span>
        </button>
        {open && <div className="mt-1">{node.children.map(c => <SidebarItem key={c.id} node={c} level={level+1} />)}</div>}
      </div>
    );
  }
  return node.path ? (
    <Link to={node.path} className={`block ${pad} py-2 rounded ${isActive?'bg-gray-800 text-white':'text-gray-300 hover:bg-gray-800/40'}`}>
      {node.label}
    </Link>
  ) : null;
}
EOX

echo "==> Topbar components"
cat > src/components/admin/topbar/Breadcrumbs.tsx << 'EOX'
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.replace(/^\/|\/$/g,'').split('/').filter(Boolean);
  const items = parts.map((p,i)=>({ label: decodeURIComponent(p), path:'/' + parts.slice(0,i+1).join('/') }));
  if (items.length === 0) return null;
  return (
    <nav className="text-sm opacity-80">
      {items.map((it,i)=>(
        <span key={it.path}>
          {i>0 && ' / '}<Link className="hover:underline" to={it.path}>{it.label}</Link>
        </span>
      ))}
    </nav>
  );
}
EOX

cat > src/components/admin/topbar/GlobalSearch.tsx << 'EOX'
import React, { useState } from 'react';
export default function GlobalSearch(){
  const [q,setQ] = useState('');
  return (
    <input
      value={q}
      onChange={e=>setQ(e.target.value)}
      placeholder="Recherche universelle…"
      className="border rounded px-3 py-1 w-64 bg-transparent"
    />
  );
}
EOX

cat > src/components/admin/topbar/ScopeSelectors.tsx << 'EOX'
import React from 'react';
import { useAdminUI } from '@/contexts/AdminUIContext';
export default function ScopeSelectors(){
  const { scope, setScope } = useAdminUI();
  return (
    <div className="flex items-center gap-2">
      <select className="bg-transparent border rounded px-2 py-1" onChange={e=>setScope({country:e.target.value})}>
        <option value="">{scope.country || 'Pays'}</option>
      </select>
      <select className="bg-transparent border rounded px-2 py-1" onChange={e=>setScope({language:e.target.value})}>
        <option value="">{scope.language || 'Langue'}</option>
      </select>
      <select className="bg-transparent border rounded px-2 py-1" onChange={e=>setScope({currency:e.target.value})}>
        <option value="">{scope.currency || 'Devise'}</option>
      </select>
      <select className="bg-transparent border rounded px-2 py-1" onChange={e=>setScope({period:e.target.value as any})}>
        <option value="30d">{scope.period}</option>
        <option value="7d">7d</option><option value="30d">30d</option>
        <option value="MTD">MTD</option><option value="QTD">QTD</option><option value="YTD">YTD</option>
      </select>
    </div>
  );
}
EOX

cat > src/components/admin/topbar/FavoritesBar.tsx << 'EOX'
import React from 'react';
export default function FavoritesBar(){
  return <button className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700" title="Favoris">☆</button>;
}
EOX

cat > src/components/admin/topbar/ThemeToggle.tsx << 'EOX'
import React from 'react';
export default function ThemeToggle(){
  return (
    <button
      onClick={()=>document.documentElement.classList.toggle('dark')}
      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700"
      title="Clair/Sombre"
    >🌓</button>
  );
}
EOX

cat > src/components/admin/topbar/UserMenu.tsx << 'EOX'
import React from 'react';
export default function UserMenu(){
  return <div className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700">Profil</div>;
}
EOX

echo "==> AdminLayout V2"
cat > src/components/admin/AdminLayoutV2.tsx << 'EOX'
import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminUIProvider } from '@/contexts/AdminUIContext';
import { adminMenuTree } from '@/config/adminMenu';
import SidebarItem from './sidebar/SidebarItem';
import Breadcrumbs from './topbar/Breadcrumbs';
import GlobalSearch from './topbar/GlobalSearch';
import ScopeSelectors from './topbar/ScopeSelectors';
import FavoritesBar from './topbar/FavoritesBar';
import ThemeToggle from './topbar/ThemeToggle';
import UserMenu from './topbar/UserMenu';

export default function AdminLayoutV2() {
  return (
    <AdminUIProvider>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <aside className="w-72 shrink-0 bg-gray-900 text-gray-200 p-3 hidden md:block">
          <div className="px-2 py-3 text-lg font-semibold">Admin</div>
          <nav className="mt-2">{adminMenuTree.map(node => <SidebarItem key={node.id} node={node} />)}</nav>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 gap-3">
            <Breadcrumbs />
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <ScopeSelectors />
              <FavoritesBar />
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminUIProvider>
  );
}
EOX

echo "==> Users/Providers pages"
cat > src/features/users/providers/ProvidersTabs.tsx << 'EOX'
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
export default function ProvidersTabs(){
  const { pathname } = useLocation();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Prestataires</h1>
      <div className="flex gap-3 mb-6">
        <Link className={`px-3 py-1 rounded border ${pathname.includes('/lawyers')?'bg-gray-200 dark:bg-gray-800':''}`} to="/admin/users/providers/lawyers">Avocats</Link>
        <Link className={`px-3 py-1 rounded border ${pathname.includes('/expats')?'bg-gray-200 dark:bg-gray-800':''}`} to="/admin/users/providers/expats">Expatriés</Link>
      </div>
      <p>Sélectionnez un onglet.</p>
    </div>
  );
}
EOX

cat > src/features/users/providers/lawyers/LawyersList.tsx << 'EOX'
import React from 'react';
export default function LawyersList(){
  return <div><h2 className="text-xl font-semibold mb-2">Avocats — Liste</h2><p>Table, filtres (pays, barreau, KYC, langues).</p></div>;
}
EOX

cat > src/features/users/providers/lawyers/LawyerDetail.tsx << 'EOX'
import React from 'react';
export default function LawyerDetail(){
  return <div><h2 className="text-xl font-semibold mb-2">Avocat — Détail</h2><p>Profil, KYC, diplômes, langues, pays, historique.</p></div>;
}
EOX

cat > src/features/users/providers/expats/ExpatsList.tsx << 'EOX'
import React from 'react';
export default function ExpatsList(){
  return <div><h2 className="text-xl font-semibold mb-2">Expatriés — Liste</h2><p>Table, filtres (pays, expérience, langues).</p></div>;
}
EOX

cat > src/features/users/providers/expats/ExpatDetail.tsx << 'EOX'
import React from 'react';
export default function ExpatDetail(){
  return <div><h2 className="text-xl font-semibold mb-2">Expatrié — Détail</h2><p>Profil, expériences, langues, spécialités.</p></div>;
}
EOX

echo "==> Affiliates / Comms / B2B placeholders"
cat > src/features/affiliates/AdminAffiliatesList.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminAffiliatesList(){ return <Placeholder title="Affiliés - Liste" />; }
EOX
cat > src/features/affiliates/AdminAffiliateDetail.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminAffiliateDetail(){ return <Placeholder title="Affilié - Détail" />; }
EOX
cat > src/features/affiliates/AdminCommissionRules.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminCommissionRules(){ return <Placeholder title="Règles de commission" />; }
EOX
cat > src/features/affiliates/AdminAffiliatePayouts.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminAffiliatePayouts(){ return <Placeholder title="Payouts affiliés" />; }
EOX
cat > src/features/affiliates/AdminAmbassadorsList.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminAmbassadorsList(){ return <Placeholder title="Ambassadeurs - Liste" />; }
EOX
cat > src/features/affiliates/AdminAmbassadorDetail.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminAmbassadorDetail(){ return <Placeholder title="Ambassadeur - Détail" />; }
EOX

cat > src/features/comms/AdminCampaignsList.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminCampaignsList(){ return <Placeholder title="Campagnes" />; }
EOX
cat > src/features/comms/AdminCampaignEditor.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminCampaignEditor(){ return <Placeholder title="Éditeur de campagne" />; }
EOX
cat > src/features/comms/AdminCampaignOverview.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminCampaignOverview(){ return <Placeholder title="Campagne - Vue d’ensemble" />; }
EOX
cat > src/features/comms/AdminSegments.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminSegments(){ return <Placeholder title="Segments/Audiences" />; }
EOX
cat > src/features/comms/AdminJourneys.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminJourneys(){ return <Placeholder title="Automations / Journeys" />; }
EOX
cat > src/features/comms/AdminTemplates.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminTemplates(){ return <Placeholder title="Templates (Email/SMS/Push)" />; }
EOX
cat > src/features/comms/AdminDeliverability.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminDeliverability(){ return <Placeholder title="Deliverability & Qualité" />; }
EOX
cat > src/features/comms/AdminSuppressionLists.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminSuppressionLists(){ return <Placeholder title="Suppression lists" />; }
EOX
cat > src/features/comms/AdminABTests.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminABTests(){ return <Placeholder title="A/B Tests" />; }
EOX

cat > src/features/b2b/AdminB2BAccounts.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminB2BAccounts(){ return <Placeholder title="B2B - Comptes entreprise" />; }
EOX
cat > src/features/b2b/AdminB2BMembers.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminB2BMembers(){ return <Placeholder title="B2B - Membres/Clients" />; }
EOX
cat > src/features/b2b/AdminB2BPricing.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminB2BPricing(){ return <Placeholder title="B2B - Tarifs & Contrats" />; }
EOX
cat > src/features/b2b/AdminB2BBilling.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminB2BBilling(){ return <Placeholder title="B2B - Facturation & Abonnements" />; }
EOX
cat > src/features/b2b/AdminB2BInvoices.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminB2BInvoices(){ return <Placeholder title="B2B - Factures" />; }
EOX
cat > src/features/b2b/AdminB2BReports.tsx << 'EOX'
import React from 'react'; import Placeholder from '@/components/admin/Placeholder';
export default function AdminB2BReports(){ return <Placeholder title="B2B - Rapports" />; }
EOX

echo "==> Finance services & types"
cat > src/types/finance.ts << 'EOX'
export type Currency = string;
export interface CurrencyRate { base: Currency; quote: Currency; rate: number; asOf: string; }
export interface TaxRate { id: string; country: string; name: string; rate: number; }
export interface Payment { id: string; created: string; amount: number; currency: Currency; country?: string; status: 'succeeded'|'refunded'|'failed'|'disputed'; fee?: number; invoiceId?: string; tax?: number; }
export interface Invoice { id: string; created: string; total: number; currency: Currency; country?: string; tax?: number; taxRates?: TaxRate[]; paid: boolean; }
export interface Dispute { id: string; paymentId: string; amount: number; currency: Currency; status: 'needs_response'|'warning_closed'|'won'|'lost'; created: string; }
export interface Refund { id: string; paymentId: string; amount: number; currency: Currency; created: string; }
export interface CountryAmount { country: string; currency: Currency; gross: number; net: number; tax: number; count: number; }
export interface VatBucket { country: string; rate: number; taxable: number; tax: number; }
EOX

cat > src/services/finance/read.ts << 'EOX'
import type { Payment, Invoice, Dispute, Refund, TaxRate } from '@/types/finance';
export async function listPayments(params?: { from?: string; to?: string; country?: string }): Promise<Payment[]> { return []; }
export async function listInvoices(params?: { from?: string; to?: string; country?: string }): Promise<Invoice[]> { return []; }
export async function listDisputes(params?: { from?: string; to?: string; country?: string }): Promise<Dispute[]> { return []; }
export async function listRefunds(params?: { from?: string; to?: string; country?: string }): Promise<Refund[]> { return []; }
export async function listTaxRates(country?: string): Promise<TaxRate[]> { return []; }
EOX

cat > src/services/finance/reports.ts << 'EOX'
import type { Payment, Invoice, CountryAmount, VatBucket } from '@/types/finance';
export function aggregateByCountry(payments: Payment[], invoices: Invoice[]) : CountryAmount[] {
  const map = new Map<string, CountryAmount>();
  const push = (country:string, currency:string, gross:number, tax:number)=>{
    const k = country+'|'+currency;
    const prev = map.get(k) || { country, currency, gross:0, net:0, tax:0, count:0 };
    prev.gross += gross; prev.tax += (tax||0); prev.net = prev.gross - prev.tax; prev.count += 1; map.set(k, prev);
  };
  for(const p of payments){ push(p.country||'UNK', p.currency, p.amount, p.tax||0); }
  for(const inv of invoices){ push(inv.country||'UNK', inv.currency, inv.total, inv.tax||0); }
  return Array.from(map.values());
}
export function bucketsVat(invoices: Invoice[]): VatBucket[] {
  const map = new Map<string, VatBucket>();
  for(const inv of invoices){
    const country = inv.country||'UNK';
    const rates = inv.taxRates?.length ? inv.taxRates : [{id:'', country, name:'n/a', rate: 0}];
    for(const tr of rates){
      const k = `${country}|${tr.rate}`;
      const prev = map.get(k) || { country, rate: tr.rate, taxable: 0, tax: 0 };
      prev.tax += inv.tax || 0;
      prev.taxable += Math.max(inv.total - (inv.tax||0), 0);
      map.set(k, prev);
    }
  }
  return Array.from(map.values());
}
export function toCsv(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v:any)=> `"${String(v??'').replace(/"/g,'""')}"`;
  return [headers.join(','), ...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n');
}
EOX

echo "==> Finance pages"
cat > src/features/finance/pages/Vat.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Vat(){ return <Placeholder title="TVA — Synthèse par pays/taux" />; }
EOX
cat > src/features/finance/pages/VatReturns.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function VatReturns(){ return <Placeholder title="TVA — Déclarations & exports" />; }
EOX
cat > src/features/finance/pages/CountryBreakdown.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function CountryBreakdown(){ return <Placeholder title="Ventilation par pays / devise" />; }
EOX
cat > src/features/finance/pages/Reconciliation.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Reconciliation(){ return <Placeholder title="Rapprochement (Stripe/banque/Firestore)" />; }
EOX
cat > src/features/finance/pages/Disputes.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Disputes(){ return <Placeholder title="Litiges (Stripe)" />; }
EOX
cat > src/features/finance/pages/Refunds.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Refunds(){ return <Placeholder title="Remboursements" />; }
EOX
cat > src/features/finance/pages/Ledger.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Ledger(){ return <Placeholder title="Grand livre (UI) + Export comptable" />; }
EOX
cat > src/features/finance/pages/Exports.tsx << 'EOX'
import React from 'react';
import Placeholder from '@/components/admin/Placeholder';
export default function Exports(){ return <Placeholder title="Exports CSV (CA/TVA/écritures/rapprochement)" />; }
EOX

echo "==> AdminRoutes V2 (using placeholders for missing imports if needed)"
cat > src/components/admin/AdminRoutesV2.tsx << 'EOX'
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayoutV2 from './AdminLayoutV2';
import Placeholder from './Placeholder';

// Try to import existing admin pages. If your paths differ, update these imports accordingly.
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminReports from '@/pages/admin/AdminReports';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminApprovals from '@/pages/admin/AdminApprovals';
import AdminAaaProfiles from '@/pages/admin/AdminAaaProfiles';
import AdminReviews from '@/pages/admin/AdminReviews';
import AdminCalls from '@/pages/admin/AdminCalls';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminInvoices from '@/pages/admin/AdminInvoices';
import AdminClientMessages from '@/pages/admin/AdminClientMessages';
import AdminNotifications from '@/pages/admin/AdminNotifications';
import AdminDocuments from '@/pages/admin/AdminDocuments';
import AdminLegalDocuments from '@/pages/admin/AdminLegalDocuments';
import AdminBackups from '@/pages/admin/AdminBackups';
import AdminCountries from '@/pages/admin/AdminCountries';
import AdminPricing from '@/pages/admin/AdminPricing';
import AdminSettings from '@/pages/admin/AdminSettings';

// Users/Providers
import ProvidersTabs from '@/features/users/providers/ProvidersTabs';
import LawyersList from '@/features/users/providers/lawyers/LawyersList';
import LawyerDetail from '@/features/users/providers/lawyers/LawyerDetail';
import ExpatsList from '@/features/users/providers/expats/ExpatsList';
import ExpatDetail from '@/features/users/providers/expats/ExpatDetail';

// New modules
import AdminAffiliatesList from '@/features/affiliates/AdminAffiliatesList';
import AdminAffiliateDetail from '@/features/affiliates/AdminAffiliateDetail';
import AdminCommissionRules from '@/features/affiliates/AdminCommissionRules';
import AdminAffiliatePayouts from '@/features/affiliates/AdminAffiliatePayouts';
import AdminAmbassadorsList from '@/features/affiliates/AdminAmbassadorsList';
import AdminAmbassadorDetail from '@/features/affiliates/AdminAmbassadorDetail';

import AdminCampaignsList from '@/features/comms/AdminCampaignsList';
import AdminCampaignEditor from '@/features/comms/AdminCampaignEditor';
import AdminCampaignOverview from '@/features/comms/AdminCampaignOverview';
import AdminSegments from '@/features/comms/AdminSegments';
import AdminJourneys from '@/features/comms/AdminJourneys';
import AdminTemplates from '@/features/comms/AdminTemplates';
import AdminDeliverability from '@/features/comms/AdminDeliverability';
import AdminSuppressionLists from '@/features/comms/AdminSuppressionLists';
import AdminABTests from '@/features/comms/AdminABTests';

import Vat from '@/features/finance/pages/Vat';
import VatReturns from '@/features/finance/pages/VatReturns';
import CountryBreakdown from '@/features/finance/pages/CountryBreakdown';
import Reconciliation from '@/features/finance/pages/Reconciliation';
import Disputes from '@/features/finance/pages/Disputes';
import Refunds from '@/features/finance/pages/Refunds';
import Ledger from '@/features/finance/pages/Ledger';
import Exports from '@/features/finance/pages/Exports';

import AdminB2BAccounts from '@/features/b2b/AdminB2BAccounts';
import AdminB2BMembers from '@/features/b2b/AdminB2BMembers';
import AdminB2BPricing from '@/features/b2b/AdminB2BPricing';
import AdminB2BBilling from '@/features/b2b/AdminB2BBilling';
import AdminB2BInvoices from '@/features/b2b/AdminB2BInvoices';
import AdminB2BReports from '@/features/b2b/AdminB2BReports';

export default function AdminRoutesV2(){
  return (
    <Routes>
      <Route element={<AdminLayoutV2 />}>
        {/* Dashboards */}
        <Route path="/admin/dashboard/global" element={<AdminDashboard/>} />
        <Route path="/admin/dashboard/alerts" element={<AdminReports/>} />
        <Route path="/admin/dashboard/reports" element={<AdminReports/>} />
        <Route path="/admin/dashboard/ceo" element={<AdminDashboard/>} />
        <Route path="/admin/dashboard/cfo" element={<AdminDashboard/>} />
        <Route path="/admin/dashboard/marketing" element={<AdminDashboard/>} />
        <Route path="/admin/dashboard/ops" element={<AdminDashboard/>} />
        <Route path="/admin/dashboard/by-country" element={<AdminDashboard/>} />
        <Route index path="/admin" element={<Navigate to="/admin/dashboard/global" replace />} />

        {/* Users & Providers (+ aaaprofiles) */}
        <Route path="/admin/users/list" element={<AdminUsers/>} />
        <Route path="/admin/users/segments" element={<Placeholder title="Segments utilisateurs" />} />
        <Route path="/admin/users/providers" element={<ProvidersTabs/>} />
        <Route path="/admin/users/providers/lawyers" element={<LawyersList/>} />
        <Route path="/admin/users/providers/lawyers/:id" element={<LawyerDetail/>} />
        <Route path="/admin/users/providers/expats" element={<ExpatsList/>} />
        <Route path="/admin/users/providers/expats/:id" element={<ExpatDetail/>} />
        <Route path="/admin/approvals" element={<AdminApprovals/>} />
        <Route path="/admin/aaaprofiles" element={<AdminAaaProfiles/>} />
        <Route path="/admin/reviews" element={<AdminReviews/>} />
        {/* Compat historique */}
        <Route path="/admin/providers" element={<AdminUsers/>} />

        {/* Calls */}
        <Route path="/admin/calls/monitor" element={<AdminCalls/>} />
        <Route path="/admin/calls/sessions" element={<AdminCalls/>} />
        <Route path="/admin/calls/planning" element={<Placeholder title="Planification d’appels" />} />
        <Route path="/admin/calls/qos" element={<Placeholder title="Qualité audio (Twilio)" />} />

        {/* Finance */}
        <Route path="/admin/finance/payments" element={<AdminPayments/>} />
        <Route path="/admin/finance/invoices" element={<AdminInvoices/>} />
        <Route path="/admin/finance/tva" element={<Vat/>} />
        <Route path="/admin/finance/tva/returns" element={<VatReturns/>} />
        <Route path="/admin/finance/by-country" element={<CountryBreakdown/>} />
        <Route path="/admin/finance/reconciliation" element={<Reconciliation/>} />
        <Route path="/admin/finance/disputes" element={<Disputes/>} />
        <Route path="/admin/finance/refunds" element={<Refunds/>} />
        <Route path="/admin/finance/ledger" element={<Ledger/>} />
        <Route path="/admin/finance/exports" element={<Exports/>} />
        <Route path="/admin/finance/budgets" element={<Placeholder title="Budgets & Prévisions" />} />
        <Route path="/admin/finance/audit" element={<Placeholder title="Audit financier (journal)" />} />

        {/* Communications */}
        <Route path="/admin/comms/campaigns" element={<AdminCampaignsList/>} />
        <Route path="/admin/comms/campaigns/new" element={<AdminCampaignEditor/>} />
        <Route path="/admin/comms/campaigns/:id" element={<AdminCampaignOverview/>} />
        <Route path="/admin/comms/segments" element={<AdminSegments/>} />
        <Route path="/admin/comms/automations" element={<AdminJourneys/>} />
        <Route path="/admin/comms/templates" element={<AdminTemplates/>} />
        <Route path="/admin/comms/deliverability" element={<AdminDeliverability/>} />
        <Route path="/admin/comms/suppression" element={<AdminSuppressionLists/>} />
        <Route path="/admin/comms/ab" element={<AdminABTests/>} />
        <Route path="/admin/comms/messages" element={<AdminClientMessages/>} />
        <Route path="/admin/comms/notifications" element={<AdminNotifications/>} />

        {/* Affiliates/Ambassadors */}
        <Route path="/admin/affiliates" element={<AdminAffiliatesList/>} />
        <Route path="/admin/affiliates/commissions" element={<AdminCommissionRules/>} />
        <Route path="/admin/affiliates/payouts" element={<AdminAffiliatePayouts/>} />
        <Route path="/admin/affiliates/:id" element={<AdminAffiliateDetail/>} />
        <Route path="/admin/ambassadors" element={<AdminAmbassadorsList/>} />
        <Route path="/admin/ambassadors/:id" element={<AdminAmbassadorDetail/>} />

        {/* B2B */}
        <Route path="/admin/b2b/accounts" element={<AdminB2BAccounts/>} />
        <Route path="/admin/b2b/members" element={<AdminB2BMembers/>} />
        <Route path="/admin/b2b/pricing" element={<AdminB2BPricing/>} />
        <Route path="/admin/b2b/billing" element={<AdminB2BBilling/>} />
        <Route path="/admin/b2b/invoices" element={<AdminB2BInvoices/>} />
        <Route path="/admin/b2b/reports" element={<AdminB2BReports/>} />

        {/* CMS / Tools / Settings */}
        <Route path="/admin/cms/media" element={<AdminDocuments/>} />
        <Route path="/admin/cms/legal" element={<AdminLegalDocuments/>} />
        <Route path="/admin/tools/backups" element={<AdminBackups/>} />
        <Route path="/admin/settings/countries" element={<AdminCountries/>} />
        <Route path="/admin/settings/pricing" element={<AdminPricing/>} />
        <Route path="/admin/settings" element={<AdminSettings/>} />
      </Route>
    </Routes>
  );
}
EOX

echo "==> Optional stubs for referenced existing pages (only if missing)"
ensure_stub "src/pages/admin/AdminDashboard.tsx" "Admin Dashboard (stub)"
ensure_stub "src/pages/admin/AdminReports.tsx" "Admin Reports (stub)"
ensure_stub "src/pages/admin/AdminUsers.tsx" "Admin Users (stub)"
ensure_stub "src/pages/admin/AdminApprovals.tsx" "Admin Approvals (stub)"
ensure_stub "src/pages/admin/AdminAaaProfiles.tsx" "Admin AAA Profiles (stub)"
ensure_stub "src/pages/admin/AdminReviews.tsx" "Admin Reviews (stub)"
ensure_stub "src/pages/admin/AdminCalls.tsx" "Admin Calls (stub)"
ensure_stub "src/pages/admin/AdminPayments.tsx" "Admin Payments (stub)"
ensure_stub "src/pages/admin/AdminInvoices.tsx" "Admin Invoices (stub)"
ensure_stub "src/pages/admin/AdminClientMessages.tsx" "Admin Client Messages (stub)"
ensure_stub "src/pages/admin/AdminNotifications.tsx" "Admin Notifications (stub)"
ensure_stub "src/pages/admin/AdminDocuments.tsx" "Admin Documents (stub)"
ensure_stub "src/pages/admin/AdminLegalDocuments.tsx" "Admin Legal Documents (stub)"
ensure_stub "src/pages/admin/AdminBackups.tsx" "Admin Backups (stub)"
ensure_stub "src/pages/admin/AdminCountries.tsx" "Admin Countries (stub)"
ensure_stub "src/pages/admin/AdminPricing.tsx" "Admin Pricing (stub)"
ensure_stub "src/pages/admin/AdminSettings.tsx" "Admin Settings (stub)"

echo "==> Done."
echo ""
echo "NEXT STEP:"
echo "1) Ensure Tailwind has darkMode:'class' in tailwind.config.js"
echo "2) Open your main router (e.g., src/App.tsx) and mount AdminRoutesV2:"
echo "   import AdminRoutesV2 from '@/components/admin/AdminRoutesV2';"
echo "   // inside <BrowserRouter>:"
echo "   <AdminRoutesV2 />"
echo "3) Start dev server: npm run dev (or yarn/pnpm). Open /admin"
