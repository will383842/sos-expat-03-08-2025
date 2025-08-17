"use strict";
// 📁 src/serveremails/sendContactReply.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendContactReplyHandler = void 0;
var nodemailer_1 = require("nodemailer");
var contactReply_1 = require("./templates/contactReply");
var contactMessages_1 = require("./firebase/contactMessages");
var sendContactReplyHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, to, firstName, userMessage, adminReply, messageId, htmlContent, transporter, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (req.method !== 'POST') {
                    return [2 /*return*/, res.status(405).json({ success: false, error: 'Méthode non autorisée' })];
                }
                _a = req.body, to = _a.to, firstName = _a.firstName, userMessage = _a.userMessage, adminReply = _a.adminReply, messageId = _a.messageId;
                if (!to || !firstName || !userMessage || !adminReply || !messageId) {
                    return [2 /*return*/, res.status(400).json({ success: false, error: 'Champs requis manquants' })];
                }
                htmlContent = (0, contactReply_1.contactReply)({ firstName: firstName, userMessage: userMessage, adminReply: adminReply });
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 6]);
                transporter = nodemailer_1.default.createTransport({
                    host: 'smtp.zoho.eu',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.ZOHO_EMAIL, // ✅ corrigé ici
                        pass: process.env.ZOHO_PASS,
                    },
                });
                return [4 /*yield*/, transporter.sendMail({
                        from: "\"Ulixai Team - SOS Expat\" <".concat(process.env.ZOHO_EMAIL, ">"), // ✅ corrigé ici
                        to: to,
                        subject: '📬 Réponse à votre message - SOS Expat',
                        html: htmlContent,
                    })];
            case 2:
                _b.sent();
                return [4 /*yield*/, (0, contactMessages_1.saveContactReply)({
                        messageId: messageId,
                        to: to,
                        firstName: firstName,
                        userMessage: userMessage,
                        adminReply: adminReply,
                        sentSuccessfully: true,
                    })];
            case 3:
                _b.sent();
                return [2 /*return*/, res.status(200).json({ success: true })];
            case 4:
                err_1 = _b.sent();
                return [4 /*yield*/, (0, contactMessages_1.saveContactReply)({
                        messageId: messageId,
                        to: to,
                        firstName: firstName,
                        userMessage: userMessage,
                        adminReply: adminReply,
                        sentSuccessfully: false,
                        errorMessage: err_1.message,
                    })];
            case 5:
                _b.sent();
                return [2 /*return*/, res.status(500).json({ success: false, error: err_1.message })];
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.sendContactReplyHandler = sendContactReplyHandler;
