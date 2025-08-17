"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
var firestore_1 = require("firebase/firestore");
var firebase_1 = require("../../config/firebase");
var AdminLayout_1 = require("../../components/admin/AdminLayout");
var Button_1 = require("../../components/common/Button");
var Modal_1 = require("../../components/common/Modal");
var ErrorBoundary_1 = require("../../components/common/ErrorBoundary");
var AuthContext_1 = require("../../contexts/AuthContext");
var AdminBackups = function () {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var currentUser = (0, AuthContext_1.useAuth)().user;
    var _a = (0, react_1.useState)([]), backups = _a[0], setBackups = _a[1];
    var _b = (0, react_1.useState)(true), isLoading = _b[0], setIsLoading = _b[1];
    var _c = (0, react_1.useState)(false), showCreateModal = _c[0], setShowCreateModal = _c[1];
    var _d = (0, react_1.useState)(false), showRestoreModal = _d[0], setShowRestoreModal = _d[1];
    var _e = (0, react_1.useState)(false), showDeleteModal = _e[0], setShowDeleteModal = _e[1];
    var _f = (0, react_1.useState)(null), selectedBackup = _f[0], setSelectedBackup = _f[1];
    var _g = (0, react_1.useState)(false), isActionLoading = _g[0], setIsActionLoading = _g[1];
    var _h = (0, react_1.useState)([
        'users', 'calls', 'payments', 'reviews', 'documents'
    ]), selectedCollections = _h[0], setSelectedCollections = _h[1];
    var _j = (0, react_1.useState)(null), restoreFile = _j[0], setRestoreFile = _j[1];
    var _k = (0, react_1.useState)(''), backupStatus = _k[0], setBackupStatus = _k[1];
    var _l = (0, react_1.useState)(false), showBackupModal = _l[0], setShowBackupModal = _l[1];
    var availableCollections = [
        'users', 'calls', 'payments', 'reviews', 'documents', 'notifications',
        'call_sessions', 'booking_requests', 'invoices', 'sos_profiles', 'analytics'
    ];
    (0, react_1.useEffect)(function () {
        // Check if user is admin
        if (!currentUser || currentUser.role !== 'admin') {
            navigate('/admin-login');
            return;
        }
        loadBackups();
    }, [currentUser, navigate]);
    var loadBackups = function () { return __awaiter(void 0, void 0, void 0, function () {
        var mockBackups;
        return __generator(this, function (_a) {
            try {
                setIsLoading(true);
                setBackupStatus('Sauvegarde en cours... Cela peut prendre plusieurs minutes.');
                mockBackups = [
                    {
                        id: 'backup-2025-01-15-10h30',
                        type: 'automatic',
                        status: 'completed',
                        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
                        createdBy: 'system',
                        fileUrl: 'https://example.com/backups/backup-2025-01-15-10h30.json',
                        fileSize: 5243890,
                        collections: ['users', 'calls', 'payments', 'reviews', 'documents']
                    },
                    {
                        id: 'backup-2025-01-14-22h30',
                        type: 'automatic',
                        status: 'completed',
                        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 1000),
                        createdBy: 'system',
                        fileUrl: 'https://example.com/backups/backup-2025-01-14-22h30.json',
                        fileSize: 5198432,
                        collections: ['users', 'calls', 'payments', 'reviews', 'documents']
                    },
                    {
                        id: 'backup-2025-01-13-manual',
                        type: 'manual',
                        status: 'completed',
                        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
                        completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
                        createdBy: 'admin1',
                        fileUrl: 'https://example.com/backups/backup-2025-01-13-manual.json',
                        fileSize: 5120000,
                        collections: ['users', 'calls', 'payments', 'reviews', 'documents', 'notifications']
                    }
                ];
                // En production, on chargerait depuis Firestore
                // const backupsQuery = query(
                //   collection(db, 'backups'),
                //   orderBy('createdAt', 'desc'),
                //   limit(50)
                // );
                // const backupsSnapshot = await getDocs(backupsQuery);
                // // Process results
                // const backupsData = backupsSnapshot.docs.map(doc => ({
                //   ...doc.data(),
                //   id: doc.id,
                //   createdAt: doc.data().createdAt?.toDate() || new Date(),
                //   completedAt: doc.data().completedAt?.toDate()
                // })) as Backup[];
                // Update state
                setBackups(mockBackups);
            }
            catch (error) {
                console.error('Error loading backups:', error);
            }
            finally {
                setIsLoading(false);
            }
            return [2 /*return*/];
        });
    }); };
    var handleCreateBackup = function () { return __awaiter(void 0, void 0, void 0, function () {
        var now, backupId, backupRef_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setIsActionLoading(true);
                    now = new Date();
                    backupId = "backup-".concat(now.getFullYear(), "-").concat(String(now.getMonth() + 1).padStart(2, '0'), "-").concat(String(now.getDate()).padStart(2, '0'), "-").concat(String(now.getHours()).padStart(2, '0'), "h").concat(String(now.getMinutes()).padStart(2, '0'));
                    return [4 /*yield*/, (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'backups'), {
                            type: 'manual',
                            status: 'pending',
                            createdAt: (0, firestore_1.serverTimestamp)(),
                            createdBy: (currentUser === null || currentUser === void 0 ? void 0 : currentUser.id) || 'admin',
                            collections: selectedCollections
                        })];
                case 1:
                    backupRef_1 = _a.sent();
                    // Simulate backup process
                    setTimeout(function () { return __awaiter(void 0, void 0, void 0, function () {
                        var error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    // Update backup status
                                    return [4 /*yield*/, (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, 'backups', backupRef_1.id), {
                                            status: 'completed',
                                            completedAt: (0, firestore_1.serverTimestamp)(),
                                            fileUrl: "https://example.com/backups/backup-".concat(Date.now(), ".json"),
                                            fileSize: Math.floor(Math.random() * 10000000) // Random file size for demo
                                        })];
                                case 1:
                                    // Update backup status
                                    _a.sent();
                                    setBackupStatus('Sauvegarde terminée avec succès');
                                    setTimeout(function () { return setBackupStatus(''); }, 3000);
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_2 = _a.sent();
                                    console.error('Error updating backup status:', error_2);
                                    setBackupStatus('Erreur lors de la mise à jour du statut de la sauvegarde');
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }, 5000);
                    // Show success message
                    setBackupStatus('Sauvegarde initiée. Vérifiez l\'état dans quelques minutes.');
                    return [3 /*break*/, 4];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error creating backup:', error_1);
                    alert('Erreur lors de la création de la sauvegarde');
                    return [3 /*break*/, 4];
                case 3:
                    setIsActionLoading(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleRestoreBackup = function () { return __awaiter(void 0, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, 3, 4]);
                    setIsActionLoading(true);
                    // Simulate restore process
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                case 1:
                    // Simulate restore process
                    _a.sent();
                    // Show success message
                    alert('Restauration effectuée avec succès');
                    // Close modal
                    setShowRestoreModal(false);
                    setRestoreFile(null);
                    return [3 /*break*/, 4];
                case 2:
                    error_3 = _a.sent();
                    console.error('Error restoring backup:', error_3);
                    alert('Erreur lors de la restauration de la sauvegarde');
                    return [3 /*break*/, 4];
                case 3:
                    setIsActionLoading(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleDeleteBackup = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!selectedBackup)
                return [2 /*return*/];
            try {
                setIsActionLoading(true);
                // En production, on supprimerait dans Firestore
                // await deleteDoc(doc(db, 'backups', selectedBackup.id));
                // Update local state
                setBackups(function (prev) { return prev.filter(function (backup) { return backup.id !== selectedBackup.id; }); });
                // Close modal
                setShowDeleteModal(false);
                setSelectedBackup(null);
                // Show success message
                alert('Sauvegarde supprimée avec succès');
            }
            catch (error) {
                console.error('Error deleting backup:', error);
                alert('Erreur lors de la suppression de la sauvegarde');
            }
            finally {
                setIsActionLoading(false);
            }
            return [2 /*return*/];
        });
    }); };
    var formatDate = function (date) {
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };
    var formatFileSize = function (bytes) {
        if (!bytes)
            return 'N/A';
        var units = ['B', 'KB', 'MB', 'GB'];
        var size = bytes;
        var unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return "".concat(size.toFixed(2), " ").concat(units[unitIndex]);
    };
    var getStatusBadge = function (status) {
        switch (status) {
            case 'completed':
                return (<span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
            <lucide_react_1.CheckCircle size={12} className="mr-1"/>
            Terminé
          </span>);
            case 'failed':
                return (<span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
            <lucide_react_1.AlertTriangle size={12} className="mr-1"/>
            Échoué
          </span>);
            case 'pending':
            default:
                return (<span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center">
            <lucide_react_1.Clock size={12} className="mr-1"/>
            En cours
          </span>);
        }
    };
    var getTypeBadge = function (type) {
        switch (type) {
            case 'automatic':
                return (<span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center">
            <lucide_react_1.RefreshCw size={12} className="mr-1"/>
            Automatique
          </span>);
            case 'manual':
                return (<span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center">
            <lucide_react_1.Save size={12} className="mr-1"/>
            Manuel
          </span>);
            default:
                return (<span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center">
            <lucide_react_1.Database size={12} className="mr-1"/>
            {type}
          </span>);
        }
    };
    return (<AdminLayout_1.default>
      <ErrorBoundary_1.default fallback={<div className="p-8 text-center">Une erreur est survenue lors du chargement des sauvegardes. Veuillez réessayer.</div>}>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des sauvegardes</h1>
            <div className="flex items-center space-x-4">
              <Button_1.default onClick={function () { return setShowRestoreModal(true); }} variant="outline">
                <lucide_react_1.Upload size={18} className="mr-2"/>
                Restaurer
              </Button_1.default>
              <Button_1.default onClick={function () { return setShowCreateModal(true); }} className="bg-red-600 hover:bg-red-700">
                <lucide_react_1.Save size={18} className="mr-2"/>
                Sauvegarder maintenant
              </Button_1.default>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <lucide_react_1.Database className="h-5 w-5 text-blue-400"/>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Sauvegarde automatique
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Une sauvegarde automatique de la base de données est effectuée toutes les 12 heures.
                    Les 50 dernières sauvegardes sont conservées.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Backups Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taille
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (<tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                        <p className="mt-2">Chargement des sauvegardes...</p>
                      </td>
                    </tr>) : backups.length > 0 ? (backups.map(function (backup) { return (<tr key={backup.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {backup.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeBadge(backup.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(backup.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(backup.fileSize)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(backup.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {backup.status === 'completed' && backup.fileUrl && (<a href={backup.fileUrl} download className="text-blue-600 hover:text-blue-800" title="Télécharger">
                                <lucide_react_1.Download size={18}/>
                              </a>)}
                            <button onClick={function () {
                setSelectedBackup(backup);
                setShowDeleteModal(true);
            }} className="text-red-600 hover:text-red-800" title="Supprimer">
                              <lucide_react_1.Trash size={18}/>
                            </button>
                          </div>
                        </td>
                      </tr>); })) : (<tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <lucide_react_1.Database className="w-6 h-6 text-blue-600 mr-3"/>
                          <h3 className="text-lg font-semibold text-gray-900">Sauvegardes automatiques</h3>
                          <p className="text-gray-600 mb-4">Les sauvegardes automatiques sont exécutées toutes les 12 heures et conservées pendant 30 jours.</p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <lucide_react_1.Clock className="h-5 w-5 text-blue-400"/>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">Prochaine sauvegarde automatique</h3>
                                <div className="mt-1 text-sm text-blue-700">
                                  <p>
                                    {new Date(Date.now() + 12 * 60 * 60 * 1000).toLocaleString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <Button_1.default onClick={function () { return setShowBackupModal(true); }} className="w-full bg-blue-600 hover:bg-blue-700">
                            Créer une sauvegarde manuelle
                          </Button_1.default>
                        </div>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Backup Modal */}
        <Modal_1.default isOpen={showCreateModal} onClose={function () { return setShowCreateModal(false); }} title="Créer une sauvegarde" size="medium">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <lucide_react_1.Database className="h-5 w-5 text-blue-400"/>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Sauvegarde manuelle
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Vous êtes sur le point de créer une sauvegarde manuelle de la base de données.
                      Sélectionnez les collections à inclure dans la sauvegarde.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Collections à sauvegarder</h4>
              <div className="grid grid-cols-2 gap-2">
                {availableCollections.map(function (collection) { return (<div key={collection} className="flex items-center">
                    <input id={"collection-".concat(collection)} type="checkbox" checked={selectedCollections.includes(collection)} onChange={function (e) {
                if (e.target.checked) {
                    setSelectedCollections(function (prev) { return __spreadArray(__spreadArray([], prev, true), [collection], false); });
                }
                else {
                    setSelectedCollections(function (prev) { return prev.filter(function (c) { return c !== collection; }); });
                }
            }} className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"/>
                    <label htmlFor={"collection-".concat(collection)} className="ml-2 block text-sm text-gray-700">
                      {collection}
                    </label>
                  </div>); })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button_1.default onClick={function () { return setShowCreateModal(false); }} variant="outline" disabled={isActionLoading}>
                Annuler
              </Button_1.default>
              <Button_1.default onClick={handleCreateBackup} className="bg-red-600 hover:bg-red-700" loading={isActionLoading} disabled={selectedCollections.length === 0}>
                <lucide_react_1.Save size={16} className="mr-2"/>
                Lancer la sauvegarde
              </Button_1.default>
            </div>
          </div>
        </Modal_1.default>

        {/* Restore Backup Modal */}
        <Modal_1.default isOpen={showRestoreModal} onClose={function () { return setShowRestoreModal(false); }} title="Restaurer une sauvegarde" size="medium">
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <lucide_react_1.AlertTriangle className="h-5 w-5 text-yellow-400"/>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Attention : Opération sensible
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      La restauration d'une sauvegarde remplacera les données actuelles.
                      Cette opération est irréversible.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="backupFile" className="block text-sm font-medium text-gray-700 mb-2">
                Fichier de sauvegarde
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <lucide_react_1.FileText className="mx-auto h-12 w-12 text-gray-400"/>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="backupFile" className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500">
                      <span>Sélectionner un fichier</span>
                      <input id="backupFile" name="backupFile" type="file" className="sr-only" accept=".json" onChange={function (e) {
            if (e.target.files && e.target.files[0]) {
                setRestoreFile(e.target.files[0]);
            }
        }}/>
                    </label>
                    <p className="pl-1">ou glisser-déposer</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    JSON uniquement, 50 MB maximum
                  </p>
                </div>
              </div>
              {restoreFile && (<div className="mt-2 text-sm text-gray-600">
                  Fichier sélectionné: {restoreFile.name} ({formatFileSize(restoreFile.size)})
                </div>)}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button_1.default onClick={function () { return setShowRestoreModal(false); }} variant="outline" disabled={isActionLoading}>
                Annuler
              </Button_1.default>
              <Button_1.default onClick={handleRestoreBackup} className="bg-yellow-600 hover:bg-yellow-700" loading={isActionLoading} disabled={!restoreFile}>
                <lucide_react_1.Upload size={16} className="mr-2"/>
                Restaurer la sauvegarde
              </Button_1.default>
            </div>
          </div>
        </Modal_1.default>

        {/* Delete Backup Modal */}
        <Modal_1.default isOpen={showDeleteModal} onClose={function () { return setShowDeleteModal(false); }} title="Confirmer la suppression" size="small">
          {selectedBackup && (<div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <lucide_react_1.AlertTriangle className="h-5 w-5 text-red-400"/>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Attention : Cette action est irréversible
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        Vous êtes sur le point de supprimer définitivement la sauvegarde :
                        <br />
                        <strong>{selectedBackup.id}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button_1.default onClick={function () { return setShowDeleteModal(false); }} variant="outline" disabled={isActionLoading}>
                  Annuler
                </Button_1.default>
                <Button_1.default onClick={handleDeleteBackup} className="bg-red-600 hover:bg-red-700" loading={isActionLoading}>
                  Confirmer la suppression
                </Button_1.default>
              </div>
            </div>)}
        </Modal_1.default>
      </ErrorBoundary_1.default>
    </AdminLayout_1.default>);
};
exports.default = AdminBackups;
