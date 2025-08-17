"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// serveremails/server.ts
var express_1 = require("express");
var cors_1 = require("cors");
var dotenv_1 = require("dotenv");
var sendContactReply_1 = require("./sendContactReply");
dotenv_1.default.config();
var app = (0, express_1.default)();
var PORT = process.env.PORT || 5001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ✅ Route unique : envoi d’un message de réponse
app.post('/api/sendContactReply', sendContactReply_1.sendContactReplyHandler);
// ✅ Lancer le serveur
app.listen(PORT, function () {
    console.log("\u2705 Server running on http://localhost:".concat(PORT));
});
