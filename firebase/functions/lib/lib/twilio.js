"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioPhoneNumber = exports.twilioClient = void 0;
const twilio_1 = require("twilio");
const functions = __importStar(require("firebase-functions"));
// Récupérer la config Firebase Functions
const config = functions.config();
// Validation des variables d'environnement (avec tes noms)
if (!((_a = config.twilio) === null || _a === void 0 ? void 0 : _a.sid) || !((_b = config.twilio) === null || _b === void 0 ? void 0 : _b.token)) {
    throw new Error('Variables d\'environnement Twilio manquantes: twilio.sid et twilio.token requis');
}
if (!((_c = config.twilio) === null || _c === void 0 ? void 0 : _c.from)) {
    throw new Error('Variable d\'environnement twilio.from manquante');
}
// Validation du format
if (!config.twilio.from.startsWith('+')) {
    throw new Error('twilio.from doit être au format international (+33...)');
}
// Créer le client Twilio avec tes variables
exports.twilioClient = new twilio_1.Twilio(config.twilio.sid, // ← TON nom de variable
config.twilio.token // ← TON nom de variable
);
// Exporter aussi le numéro de téléphone pour les autres modules
exports.twilioPhoneNumber = config.twilio.from;
console.log('✅ Client Twilio initialisé avec succès');
exports.default = exports.twilioClient;
//# sourceMappingURL=twilio.js.map