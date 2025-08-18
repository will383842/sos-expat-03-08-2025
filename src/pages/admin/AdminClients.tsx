// src/pages/admin/AdminClients.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import {
  Users,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Button from "../../components/common/Button";
import AdminLayout from "../../components/admin/AdminLayout";

type ClientStatus = "active" | "suspended" | "pending";

interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  city?: string;
  status: ClientStatus;
  createdAt: Date;
  lastLoginAt?: Date;
  callsCount: number;
  totalSpent: number;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface FilterOptions {
  status: "all" | ClientStatus;
  country: string;
  emailVerified: "all" | "verified" | "unverified";
  dateRange: "all" | "today" | "week" | "month";
  searchTerm: string;
}

type FirestoreClientDoc = {
  role?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  status?: ClientStatus;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  callsCount?: number;
  totalSpent?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
};

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    country: "all",
    emailVerified: "all",
    dateRange: "all",
    searchTerm: "",
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0,
    thisMonth: 0,
  });

  const calculateStats = useCallback((clientsData: Client[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    setStats({
      total: clientsData.length,
      active: clientsData.filter((c) => c.status === "active").length,
      suspended: clientsData.filter((c) => c.status === "suspended").length,
      pending: clientsData.filter((c) => c.status === "pending").length,
      thisMonth: clientsData.filter((c) => c.createdAt >= startOfMonth).length,
    });
  }, []);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);

      // Construire la requête avec filtres
      const baseRef = collection(db, "users");
      let clientsQuery = query(
        baseRef,
        where("role", "==", "client"),
        orderBy("createdAt", "desc"),
        limit(100)
      );

      if (filters.status !== "all") {
        clientsQuery = query(
          baseRef,
          where("role", "==", "client"),
          where("status", "==", filters.status),
          orderBy("createdAt", "desc"),
          limit(100)
        );
      }

      const snapshot = await getDocs(clientsQuery);

      let clientsData: Client[] = snapshot.docs.map((d) => {
        const data = d.data() as unknown as FirestoreClientDoc;
        return {
          id: d.id,
          email: data.email ?? "",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          phone: data.phone ?? "",
          country: data.country ?? "",
          city: data.city ?? "",
          status: (data.status ?? "active") as ClientStatus,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          lastLoginAt: data.lastLoginAt ? data.lastLoginAt.toDate() : undefined,
          callsCount: data.callsCount ?? 0,
          totalSpent: data.totalSpent ?? 0,
          emailVerified: data.emailVerified ?? false,
          phoneVerified: data.phoneVerified ?? false,
        };
      });

      // Filtres côté client
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        clientsData = clientsData.filter(
          (client) =>
            client.firstName.toLowerCase().includes(searchLower) ||
            client.lastName.toLowerCase().includes(searchLower) ||
            client.email.toLowerCase().includes(searchLower)
        );
      }

      if (filters.country !== "all") {
        clientsData = clientsData.filter(
          (client) => client.country === filters.country
        );
      }

      if (filters.emailVerified !== "all") {
        const isVerified = filters.emailVerified === "verified";
        clientsData = clientsData.filter(
          (client) => client.emailVerified === isVerified
        );
      }

      if (filters.dateRange !== "all") {
        const now = new Date();
        const filterDate = new Date();

        switch (filters.dateRange) {
          case "today":
            filterDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            filterDate.setDate(now.getDate() - 7);
            break;
          case "month":
            filterDate.setMonth(now.getMonth() - 1);
            break;
        }

        clientsData = clientsData.filter(
          (client) => client.createdAt >= filterDate
        );
      }

      setClients(clientsData);
      calculateStats(clientsData);
    } catch (error) {
      console.error("Erreur chargement clients:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, calculateStats]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const handleStatusChange = async (
    clientId: string,
    newStatus: ClientStatus
  ) => {
    try {
      await updateDoc(doc(db, "users", clientId), {
        status: newStatus,
        updatedAt: new Date(),
      });

      setClients((prev) =>
        prev.map((client) =>
          client.id === clientId ? { ...client, status: newStatus } : client
        )
      );

      alert(`✅ Statut client mis à jour vers "${newStatus}"`);
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      alert("❌ Erreur lors de la mise à jour du statut");
    }
  };

  const handleBulkAction = async (action: "activer" | "suspendre" | "supprimer") => {
    if (selectedClients.length === 0) {
      alert("Veuillez sélectionner au moins un client");
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir ${action} ${selectedClients.length} client(s) ?`;
    if (!confirm(confirmMessage)) return;

    try {
      const promises = selectedClients.map(async (clientId) => {
        const updates: { status?: ClientStatus; updatedAt: Date } = {
          updatedAt: new Date(),
        };

        switch (action) {
          case "activer":
            updates.status = "active";
            await updateDoc(doc(db, "users", clientId), updates);
            return;
          case "suspendre":
            updates.status = "suspended";
            await updateDoc(doc(db, "users", clientId), updates);
            return;
          case "supprimer":
            await deleteDoc(doc(db, "users", clientId));
            return;
        }
      });

      await Promise.all(promises);

      if (action === "supprimer") {
        setClients((prev) =>
          prev.filter((client) => !selectedClients.includes(client.id))
        );
      } else {
        await loadClients();
      }

      setSelectedClients([]);
      alert(`✅ Action "${action}" appliquée à ${selectedClients.length} client(s)`);
    } catch (error) {
      console.error("Erreur action en lot:", error);
      alert("❌ Erreur lors de l'action en lot");
    }
  };

  const exportClients = () => {
    if (clients.length === 0) {
      alert("Aucun client à exporter.");
      return;
    }

    const csvData = clients.map((client) => ({
      ID: client.id,
      Email: client.email,
      Prénom: client.firstName,
      Nom: client.lastName,
      Téléphone: client.phone ?? "",
      Pays: client.country ?? "",
      Ville: client.city ?? "",
      Statut: client.status,
      "Date inscription": client.createdAt.toLocaleDateString("fr-FR"),
      "Dernière connexion":
        client.lastLoginAt?.toLocaleDateString("fr-FR") || "Jamais",
      "Nb appels": client.callsCount,
      "Total dépensé": `${client.totalSpent}€`,
      "Email vérifié": client.emailVerified ? "Oui" : "Non",
      "Téléphone vérifié": client.phoneVerified ? "Oui" : "Non",
    }));

    const headers = Object.keys(csvData[0]).join(",");
    const rows = csvData.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = [headers, ...rows].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: ClientStatus) => {
    switch (status) {
      case "active":
        return <CheckCircle size={16} />;
      case "suspended":
        return <XCircle size={16} />;
      case "pending":
        return <Calendar size={16} />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Users className="w-8 h-8 mr-3 text-blue-600" />
              Gestion des Clients
            </h1>
            <p className="text-gray-600 mt-1">
              {stats.total} clients • {stats.active} actifs • {stats.thisMonth} ce mois
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center"
            >
              <Filter size={16} className="mr-2" />
              Filtres
            </Button>

            <Button onClick={exportClients} variant="outline" className="flex items-center">
              <Download size={16} className="mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Clients</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Actifs</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Suspendus</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Ce mois</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Filtres de recherche</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Nom, email..."
                    value={filters.searchTerm}
                    onChange={(e) =>
                      setFilters({ ...filters, searchTerm: e.target.value })
                    }
                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      status: e.target.value as FilterOptions["status"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="pending">En attente</option>
                  <option value="suspended">Suspendu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email vérifié
                </label>
                <select
                  value={filters.emailVerified}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      emailVerified: e.target.value as FilterOptions["emailVerified"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="verified">Vérifié</option>
                  <option value="unverified">Non vérifié</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période d'inscription
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: e.target.value as FilterOptions["dateRange"],
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes les périodes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions en lot */}
        {selectedClients.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-blue-800">
                <strong>{selectedClients.length}</strong> client(s) sélectionné(s)
              </p>
              <div className="flex space-x-3">
                <Button
                  onClick={() => void handleBulkAction("activer")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Activer
                </Button>
                <Button
                  onClick={() => void handleBulkAction("suspendre")}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Suspendre
                </Button>
                <Button
                  onClick={() => void handleBulkAction("supprimer")}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tableau des clients */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement des clients...</span>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === clients.length && clients.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClients(clients.map((c) => c.id));
                          } else {
                            setSelectedClients([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localisation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inscription
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients((prev) => [...prev, client.id]);
                            } else {
                              setSelectedClients((prev) =>
                                prev.filter((id) => id !== client.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                              {client.firstName.charAt(0)}
                              {client.lastName.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Mail size={14} className="mr-2 text-gray-400" />
                            <span
                              className={
                                client.emailVerified ? "text-green-600" : "text-red-600"
                              }
                            >
                              {client.emailVerified ? "Vérifié" : "Non vérifié"}
                            </span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center">
                              <Phone size={14} className="mr-2 text-gray-400" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-2 text-gray-400" />
                          <span>
                            {client.city ? `${client.city}, ` : ""}
                            {client.country || "Non renseigné"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            client.status
                          )}`}
                        >
                          {getStatusIcon(client.status)}
                          <span className="ml-1 capitalize">{client.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div>{client.callsCount} appel(s)</div>
                          <div className="text-green-600 font-medium">
                            {client.totalSpent.toFixed(2)}€ dépensé
                          </div>
                          {client.lastLoginAt && (
                            <div className="text-xs text-gray-500">
                              Dernière connexion:{" "}
                              {client.lastLoginAt.toLocaleDateString("fr-FR")}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.createdAt.toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye size={16} />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <Edit size={16} />
                          </button>
                          <select
                            value={client.status}
                            onChange={(e) =>
                              void handleStatusChange(
                                client.id,
                                e.target.value as ClientStatus
                              )
                            }
                            className="text-xs border border-gray-300 rounded px-1 py-1"
                          >
                            <option value="active">Actif</option>
                            <option value="pending">En attente</option>
                            <option value="suspended">Suspendu</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {clients.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun client trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Aucun client ne correspond aux critères de recherche.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminClients;
