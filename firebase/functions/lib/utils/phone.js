"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertE164 = assertE164;
function assertE164(phone, who) {
    if (!/^\+[1-9]\d{8,14}$/.test(phone || ''))
        throw new Error(`Invalid ${who} phone: ${phone}`);
    return phone;
}
//# sourceMappingURL=phone.js.map