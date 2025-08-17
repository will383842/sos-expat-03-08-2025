"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.FieldValue = exports.auth = exports.messaging = exports.storage = exports.db = void 0;
var admin = require("firebase-admin");
// Initialiser Firebase Admin une seule fois
if (!admin.apps.length) {
    admin.initializeApp();
}
// AJOUT CRITIQUE : Configuration Firestore avec ignoreUndefinedProperties
exports.db = admin.firestore();
exports.db.settings({ ignoreUndefinedProperties: true });
exports.storage = admin.storage();
exports.messaging = admin.messaging();
exports.auth = admin.auth();
// Constantes utiles
exports.FieldValue = admin.firestore.FieldValue;
exports.Timestamp = admin.firestore.Timestamp;
