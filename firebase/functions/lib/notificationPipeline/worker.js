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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessageEventCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const render_1 = require("./render");
// ⚠️ On charge le provider Zoho au runtime pour éviter les problèmes d'ordre d'import
exports.onMessageEventCreate = (0, firestore_1.onDocumentCreated)({
    region: "us-central1",
    document: "message_events/{id}",
    // Aligné à la localisation Firestore (nam7 via Eventarc, implicite ici)
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const evt = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!evt)
        return;
    // Construit un contexte minimal pour le rendu
    const locale = String(evt.locale || ((_c = (_b = evt === null || evt === void 0 ? void 0 : evt.context) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.preferredLanguage) || "en")
        .toLowerCase()
        .startsWith("fr")
        ? "fr-FR"
        : "en";
    const ctx = Object.assign(Object.assign({}, evt), { locale });
    // Fallbacks de rendu si tu n'utilises pas encore templates.ts
    const subjectTpl = (_f = (_e = (_d = evt === null || evt === void 0 ? void 0 : evt.template) === null || _d === void 0 ? void 0 : _d.email) === null || _e === void 0 ? void 0 : _e.subject) !== null && _f !== void 0 ? _f : "✅ {{user.firstName}} — {{eventId}}";
    const htmlTpl = (_j = (_h = (_g = evt === null || evt === void 0 ? void 0 : evt.template) === null || _g === void 0 ? void 0 : _g.email) === null || _h === void 0 ? void 0 : _h.html) !== null && _j !== void 0 ? _j : "<p>Hello {{user.firstName}}, event {{eventId}} processed.</p>";
    const textTpl = (_m = (_l = (_k = evt === null || evt === void 0 ? void 0 : evt.template) === null || _k === void 0 ? void 0 : _k.email) === null || _l === void 0 ? void 0 : _l.text) !== null && _m !== void 0 ? _m : "Hello {{user.firstName}}, event {{eventId}} processed.";
    const subject = (0, render_1.render)(subjectTpl, ctx);
    const html = (0, render_1.render)(htmlTpl, ctx);
    const text = (0, render_1.render)(textTpl, ctx);
    const to = (_p = (_o = evt === null || evt === void 0 ? void 0 : evt.context) === null || _o === void 0 ? void 0 : _o.user) === null || _p === void 0 ? void 0 : _p.email;
    if (!to)
        return;
    const { sendZoho } = await Promise.resolve().then(() => __importStar(require("./providers/email/zohoSmtp")));
    await sendZoho(to, subject, html, text);
    // TODO: log message_deliveries ici si tu as déjà l'utilitaire
});
//# sourceMappingURL=worker.js.map