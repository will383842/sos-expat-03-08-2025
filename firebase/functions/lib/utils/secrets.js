"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_PASS = exports.EMAIL_USER = void 0;
const params_1 = require("firebase-functions/params");
exports.EMAIL_USER = (0, params_1.defineSecret)('EMAIL_USER');
exports.EMAIL_PASS = (0, params_1.defineSecret)('EMAIL_PASS');
//# sourceMappingURL=secrets.js.map