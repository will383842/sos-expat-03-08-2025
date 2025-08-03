// src/emails/admin/AdminEmails/CampaignsPage.tsx
import React, { useEffect, useState } from "react";
import { getAllCampaigns } from "../../../../serveremails/services/campaignManager";
import { Campaign } from "../../types/emailTypes";
import { format } from "date-fns";

const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const data = await getAllCampaigns();
        setCampaigns(data);
      } catch (error) {
        console.error("Erreur lors du chargement des campagnes :", error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Campagnes programmées</h2>

      {loading ? (
        <p>Chargement des campagnes...</p>
      ) : campaigns.length === 0 ? (
        <p>Aucune campagne programmée pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2 border">Nom</th>
                <th className="px-4 py-2 border">Date d'envoi</th>
                <th className="px-4 py-2 border">Cibles</th>
                <th className="px-4 py-2 border">Statut</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b">
                  <td className="px-4 py-2">{campaign.name}</td>
                  <td className="px-4 py-2">{format(new Date(campaign.scheduledAt), "dd/MM/yyyy HH:mm")}</td>
                  <td className="px-4 py-2">{campaign.targets.join(", ")}</td>
                  <td className="px-4 py-2">{campaign.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
