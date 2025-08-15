// firebase/functions/testProduction.js

// Charger les variables d'environnement de test
require('dotenv').config({ path: '.env.production' });

// Importer les tests
const { runAllProductionTests } = require('./lib/tests/productionTests');

// Fonction principale
async function main() {
  console.log('\n🔍 Vérification des variables d\'environnement...\n');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ];
  
  let missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.log(`❌ ${varName}: MANQUANT`);
    } else {
      const value = process.env[varName];
      const masked = value.substring(0, 6) + '...' + value.substring(value.length - 4);
      console.log(`✅ ${varName}: ${masked}`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('\n⚠️ Variables manquantes:', missingVars.join(', '));
    console.log('Créez un fichier .env.production avec ces variables.\n');
    process.exit(1);
  }
  
  console.log('\n✅ Toutes les variables sont configurées.\n');
  
  // Lancer les tests
  const success = await runAllProductionTests();
  
  if (!success) {
    process.exit(1);
  }
}

// Exécuter
main().catch(console.error);