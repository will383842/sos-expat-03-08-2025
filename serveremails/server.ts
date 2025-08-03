// serveremails/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendContactReplyHandler } from './sendContactReply';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// ✅ Route unique : envoi d’un message de réponse
app.post('/api/sendContactReply', sendContactReplyHandler);

// ✅ Lancer le serveur
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
