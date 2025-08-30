"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLang = resolveLang;
function resolveLang(input) {
    if (!input)
        return 'en';
    const s = String(input).toLowerCase();
    return s.startsWith('fr') ? 'fr-FR' : 'en';
}
//# sourceMappingURL=i18n.js.map