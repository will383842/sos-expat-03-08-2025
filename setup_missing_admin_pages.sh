#!/usr/bin/env bash
set -euo pipefail

echo "==> Création des dossiers"
mkdir -p src/pages/admin

pp() {
  local f="src/pages/admin/$1.tsx"
  if [[ -f "$f" ]]; then
    echo "skip $f (existe déjà)"
  else
    cat > "$f" <<'EOF'
import React from 'react';
export default function Page(){ 
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">[TITRE]</h1>
      <p className="text-sm opacity-80">Écran en UI-only pour l’instant (aucune logique métier impactée).</p>
    </div>
  );
}
EOF
    echo "ok  $f"
  fi
}

# ---- Finance avancée
pp AdminFinanceReconciliation
pp AdminFinanceDisputes
pp AdminFinanceRefunds
pp AdminFinanceLedger

# ---- Comms avancées
pp AdminCommsCampaigns
pp AdminCommsCampaignEditor
pp AdminCommsCampaignOverview
pp AdminCommsSegments
pp AdminCommsAutomations
pp AdminCommsTemplates
pp AdminCommsDeliverability
pp AdminCommsSuppression
pp AdminCommsABTests

# ---- Affiliés / Ambassadeurs
pp AdminAffiliatesList
pp AdminAffiliateDetail
pp AdminCommissionRules
pp AdminAffiliatePayouts
pp AdminAmbassadorsList
pp AdminAmbassadorDetail

# ---- B2B
pp AdminB2BAccounts
pp AdminB2BMembers
pp AdminB2BPricing
pp AdminB2BBilling
pp AdminB2BInvoices
pp AdminB2BReports

# Personnalise les titres pour l’aperçu
for f in src/pages/admin/*.tsx; do
  case "$f" in
    *AdminFinanceReconciliation.tsx) sed -i 's/\[TITRE\]/Finance · Rapprochement/g' "$f";;
    *AdminFinanceDisputes.tsx)       sed -i 's/\[TITRE\]/Finance · Litiges (Disputes)/g' "$f";;
    *AdminFinanceRefunds.tsx)        sed -i 's/\[TITRE\]/Finance · Remboursements/g' "$f";;
    *AdminFinanceLedger.tsx)         sed -i 's/\[TITRE\]/Finance · Grand livre/g' "$f";;

    *AdminCommsCampaigns.tsx)        sed -i 's/\[TITRE\]/Comms · Campagnes/g' "$f";;
    *AdminCommsCampaignEditor.tsx)   sed -i 's/\[TITRE\]/Comms · Éditeur de campagne/g' "$f";;
    *AdminCommsCampaignOverview.tsx) sed -i 's/\[TITRE\]/Comms · Détail campagne/g' "$f";;
    *AdminCommsSegments.tsx)         sed -i 's/\[TITRE\]/Comms · Segments/g' "$f";;
    *AdminCommsAutomations.tsx)      sed -i 's/\[TITRE\]/Comms · Automations (Journeys)/g' "$f";;
    *AdminCommsTemplates.tsx)        sed -i 's/\[TITRE\]/Comms · Templates/g' "$f";;
    *AdminCommsDeliverability.tsx)   sed -i 's/\[TITRE\]/Comms · Deliverability/g' "$f";;
    *AdminCommsSuppression.tsx)      sed -i 's/\[TITRE\]/Comms · Suppression lists/g' "$f";;
    *AdminCommsABTests.tsx)          sed -i 's/\[TITRE\]/Comms · A/B Tests/g' "$f";;

    *AdminAffiliatesList.tsx)        sed -i 's/\[TITRE\]/Affiliation · Liste des affiliés/g' "$f";;
    *AdminAffiliateDetail.tsx)       sed -i 's/\[TITRE\]/Affiliation · Détail affilié/g' "$f";;
    *AdminCommissionRules.tsx)       sed -i 's/\[TITRE\]/Affiliation · Règles de commission/g' "$f";;
    *AdminAffiliatePayouts.tsx)      sed -i 's/\[TITRE\]/Affiliation · Payouts/g' "$f";;
    *AdminAmbassadorsList.tsx)       sed -i 's/\[TITRE\]/Ambassadeurs · Liste/g' "$f";;
    *AdminAmbassadorDetail.tsx)      sed -i 's/\[TITRE\]/Ambassadeurs · Détail/g' "$f";;

    *AdminB2BAccounts.tsx)           sed -i 's/\[TITRE\]/B2B · Comptes Entreprise/g' "$f";;
    *AdminB2BMembers.tsx)            sed -i 's/\[TITRE\]/B2B · Membres/Clients/g' "$f";;
    *AdminB2BPricing.tsx)            sed -i 's/\[TITRE\]/B2B · Tarifs & Contrats/g' "$f";;
    *AdminB2BBilling.tsx)            sed -i 's/\[TITRE\]/B2B · Facturation & Abonnements/g' "$f";;
    *AdminB2BInvoices.tsx)           sed -i 's/\[TITRE\]/B2B · Factures/g' "$f";;
    *AdminB2BReports.tsx)            sed -i 's/\[TITRE\]/B2B · Rapports/g' "$f";;
  esac
done

echo "==> Terminé. Les pages placeholder sont prêtes."
