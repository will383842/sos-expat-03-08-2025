const fs = require('fs');

// Corriger callScheduler.ts
let callScheduler = fs.readFileSync('src/callScheduler.ts', 'utf8');
callScheduler = callScheduler.replace(/\s*const sessionData = doc\.data\(\) as CallSessionState;/, '');
fs.writeFileSync('src/callScheduler.ts', callScheduler);

// Corriger TwilioCallManager.ts
let twilioManager = fs.readFileSync('src/TwilioCallManager.ts', 'utf8');

// Remplacer forEach(doc => par forEach((doc: any) =>
twilioManager = twilioManager.replace(/forEach\(doc => {/g, 'forEach((doc: any) => {');

fs.writeFileSync('src/TwilioCallManager.ts', twilioManager);

console.log('✅ Corrections appliquées');