// Dossier : server/
// Fichier : index.ts

import express from 'express';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import cors from 'cors';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const port = 4242;

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10',
});

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint de création du PaymentIntent
app.post('/api/create-payment-intent', async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error('Erreur Stripe :', error.message);
    res.status(500).send({ error: error.message });
  }
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`✅ Serveur Stripe démarré sur http://localhost:${port}`);
});
