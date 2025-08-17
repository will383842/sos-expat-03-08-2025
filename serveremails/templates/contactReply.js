"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactReply = void 0;
var baseTemplate_1 = require("./baseTemplate");
var contactReply = function (_a) {
    var firstName = _a.firstName, userMessage = _a.userMessage, adminReply = _a.adminReply;
    return (0, baseTemplate_1.baseTemplate)("\n    <h2>Bonjour ".concat(firstName, ",</h2>\n    <p>Nous avons bien re\u00E7u votre message :</p>\n    <blockquote style=\"color: #555; margin: 1em 0;\">\"").concat(userMessage, "\"</blockquote>\n    <p>Voici notre r\u00E9ponse :</p>\n    <p><strong>").concat(adminReply, "</strong></p>\n\n    <hr style=\"margin: 30px 0;\"/>\n\n    <p>\uD83D\uDE4F <strong>Vous avez aim\u00E9 notre service ?</strong></p>\n    <p>\uD83D\uDC49 <a href=\"https://wa.me/?text=Je%20recommande%20vivement%20SOS%20Expat%20pour%20les%20urgences%20\u00E0%20l\u2019\u00E9tranger%20!%20https://sos-expat.com\" target=\"_blank\" rel=\"noopener noreferrer\">\n      Cliquez ici pour le recommander \u00E0 un proche sur WhatsApp\n    </a> \u2764\uFE0F</p>\n\n    <p>\uD83D\uDCE2 <strong>Vous \u00EAtes prestataire ?</strong></p>\n    <p>\uD83C\uDFAF <a href=\"https://sos-expat.com/widgets/avis\" target=\"_blank\" rel=\"noopener noreferrer\">\n      Ajoutez notre widget d\u2019avis SOS Expat sur votre site et boostez votre visibilit\u00E9 !\n    </a></p>\n\n    <hr style=\"margin: 30px 0;\"/>\n    <p>\uD83D\uDCF1 T\u00E9l\u00E9chargez notre application PWA pour un acc\u00E8s rapide :<br/>\n    \uD83D\uDC49 <a href=\"https://sos-expat.com\" target=\"_blank\" rel=\"noopener noreferrer\">sos-expat.com</a></p>\n\n    <p style=\"margin-top: 40px;\">Merci pour votre confiance,<br/>L\u2019\u00E9quipe <strong>Ulixai - SOS Expat</strong></p>\n  "));
};
exports.contactReply = contactReply;
