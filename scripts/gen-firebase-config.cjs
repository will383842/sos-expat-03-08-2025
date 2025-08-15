// scripts/gen-firebase-config.cjs
const fs = require('fs');
const path = require('path');

const cfg = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

const out = path.join(__dirname, '..', 'public', 'firebase-config.js');
fs.writeFileSync(out, 'self.__FIREBASE_CONFIG__ = ' + JSON.stringify(cfg, null, 2) + ';\n');
console.log('Wrote', out);