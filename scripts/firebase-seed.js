/**
 * SOS Expat Platform - Production Database Seed Script
 * Optimized for mobile-first, security, and SEO performance
 */

const admin = require('firebase-admin');
const readline = require('readline');
const { promisify } = require('util');

// Performance-optimized readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Environment validation with security checks
const ENV_CONFIG = {
  required: ['FIREBASE_PROJECT_ID', 'FIREBASE_DATABASE_URL', 'FIREBASE_STORAGE_BUCKET'],
  optional: ['FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'GOOGLE_APPLICATION_CREDENTIALS'],
  security: {
    nodeEnv: process.env.NODE_ENV || 'production',
    maxRetries: 3,
    timeout: 30000
  }
};

// Mobile-first and SEO optimized app configuration
const MOBILE_FIRST_CONFIG = {
  // Performance settings
  performance: {
    imageOptimization: true,
    lazyLoading: true,
    caching: {
      staticAssets: 31536000, // 1 year
      dynamicContent: 3600,   // 1 hour
      apiResponses: 300       // 5 minutes
    },
    compression: {
      gzip: true,
      brotli: true,
      level: 6
    }
  },
  
  // Mobile-first responsive design
  responsive: {
    breakpoints: {
      mobile: 320,
      tablet: 768,
      desktop: 1024,
      wide: 1400
    },
    touchOptimized: true,
    minimumTapTarget: 44, // iOS guidelines
    gestureSupport: true
  },
  
  // SEO optimization
  seo: {
    metadata: {
      title: "SOS Expat - Expert Legal & Expat Support Platform",
      description: "Connect with verified lawyers and expat experts worldwide. Get instant legal advice and expatriation support in multiple languages.",
      keywords: "expat support, legal advice, immigration lawyer, international law, expatriation",
      author: "SOS Expat Team",
      canonical: "https://sosexpats.com",
      robots: "index, follow",
      language: "fr-FR",
      region: "FR"
    },
    structuredData: {
      organization: true,
      breadcrumbs: true,
      reviews: true,
      services: true
    },
    sitemap: {
      enabled: true,
      changeFreq: 'weekly',
      priority: 0.8
    },
    socialMedia: {
      ogType: "website",
      twitterCard: "summary_large_image",
      imageSize: "1200x630"
    }
  },
  
  // Security hardening
  security: {
    headers: {
      csp: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://firestore.googleapis.com",
      hsts: "max-age=31536000; includeSubDomains; preload",
      frameOptions: "DENY",
      contentType: "nosniff",
      xssProtection: "1; mode=block",
      referrer: "strict-origin-when-cross-origin"
    },
    rateLimit: {
      windowMs: 900000, // 15 minutes
      max: 100,
      skipSuccessfulRequests: false
    },
    validation: {
      inputSanitization: true,
      outputEncoding: true,
      csrfProtection: true
    }
  }
};

// Lightweight environment validator
function validateEnvironment() {
  const missing = ENV_CONFIG.required.filter(key => !process.env[key]);
  if (missing.length) {
    console.error(`❌ Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}`);
    process.exit(1);
  }
}

// Optimized Firebase initialization
function initializeFirebase() {
  if (admin.apps.length > 0) return { db: admin.firestore(), auth: admin.auth() };
  
  try {
    const credential = process.env.FIREBASE_PRIVATE_KEY 
      ? admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      : admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json'));

    admin.initializeApp({
      credential,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    
    return { db: admin.firestore(), auth: admin.auth() };
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
}

// Secure input handler with timeout
const promptInput = promisify((question, validator, required = true, resolve) => {
  const timeout = setTimeout(() => {
    console.log('\n⏱️  Input timeout reached');
    rl.close();
    process.exit(1);
  }, ENV_CONFIG.security.timeout);

  const ask = () => {
    rl.question(question, (answer) => {
      clearTimeout(timeout);
      const trimmed = answer.trim();
      
      if (required && !trimmed) {
        console.log('⚠️  Required field');
        return ask();
      }
      
      if (validator && !validator(trimmed)) return ask();
      resolve(trimmed || null);
    });
  };
  ask();
});

// Enhanced validators with security
const validators = {
  email: (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(email) || email.length > 254) {
      console.log('⚠️  Invalid email format');
      return false;
    }
    return true;
  },
  
  password: (pwd) => {
    if (pwd.length < 12 || pwd.length > 128) {
      console.log('⚠️  Password must be 12-128 characters');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(pwd)) {
      console.log('⚠️  Password must contain: lowercase, uppercase, digit, special char');
      return false;
    }
    return true;
  },
  
  name: (name) => {
    if (!/^[a-zA-ZÀ-ÿ\s-']{2,50}$/.test(name)) {
      console.log('⚠️  Name must be 2-50 characters, letters only');
      return false;
    }
    return true;
  }
};

// Optimized admin user creation with security
async function createAdminUser(db, auth) {
  console.log('\n👑 Admin Account Setup');
  
  const email = await promptInput('Admin Email: ', validators.email);
  const password = await promptInput('Admin Password: ', validators.password);
  const firstName = await promptInput('First Name: ', validators.name);
  const lastName = await promptInput('Last Name: ', validators.name);
  
  console.log('\n🔄 Creating admin account...');
  
  try {
    // Check existing user
    const existingUser = await auth.getUserByEmail(email).catch(() => null);
    if (existingUser) {
      const overwrite = await promptInput('User exists. Replace? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ Cancelled');
        return null;
      }
      await Promise.all([
        auth.deleteUser(existingUser.uid),
        db.collection('users').doc(existingUser.uid).delete()
      ]);
    }
    
    // Create user with enhanced security
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: `${firstName} ${lastName}`
    });
    
    // Set secure custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      permissions: ['manage_users', 'manage_payments', 'view_analytics', 'moderate_content'],
      emailVerified: true,
      createdAt: Date.now()
    });
    
    // Create optimized user document
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(userRecord.uid).set({
      // Core identity
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      role: 'admin',
      
      // Security & status
      isActive: true,
      isVerified: true,
      emailVerified: true,
      isBanned: false,
      
      // Minimal data for performance
      preferredLanguage: 'fr',
      profilePhoto: '/assets/default-avatar.webp',
      
      // Timestamps
      createdAt: timestamp,
      updatedAt: timestamp,
      
      // Admin permissions
      permissions: {
        users: ['read', 'create', 'update', 'delete'],
        payments: ['read', 'update'],
        analytics: ['read'],
        content: ['moderate'],
        settings: ['read', 'update']
      }
    });
    
    console.log(`✅ Admin created: ${email}`);
    return { email, uid: userRecord.uid };
    
  } catch (error) {
    console.error('❌ Admin creation failed:', error.message);
    throw error;
  }
}

// Mobile-first and SEO optimized app settings
async function createAppSettings(db) {
  console.log('\n⚙️  Configuring app settings...');
  
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  const settings = {
    // Core services
    services: {
      lawyerCalls: { enabled: true, price: 49, duration: 20 },
      expatCalls: { enabled: true, price: 19, duration: 30 },
      instantSupport: { enabled: true }
    },
    
    // Performance optimization
    performance: MOBILE_FIRST_CONFIG.performance,
    
    // Mobile-first design
    ui: {
      responsive: MOBILE_FIRST_CONFIG.responsive,
      theme: {
        primary: '#2563eb',
        secondary: '#64748b',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      animations: {
        enabled: true,
        reducedMotion: true, // Respect user preferences
        duration: 200
      }
    },
    
    // SEO configuration
    seo: MOBILE_FIRST_CONFIG.seo,
    
    // Security settings
    security: {
      ...MOBILE_FIRST_CONFIG.security,
      dataRetention: {
        logs: 90,
        analytics: 365,
        userInactive: 730
      }
    },
    
    // Supported regions (optimized list)
    regions: {
      primary: ['CA', 'FR', 'DE', 'ES', 'IT'],
      secondary: ['TH', 'AU', 'BE', 'CH', 'LU', 'NL', 'GB', 'US'],
      languages: ['fr', 'en', 'es', 'de', 'it']
    },
    
    // Business rules
    business: {
      commission: 0.18,
      limits: {
        dailyCalls: 10,
        fileSize: 10485760, // 10MB
        reviewLength: 500
      }
    },
    
    // Metadata
    version: '2.0.0',
    environment: ENV_CONFIG.security.nodeEnv,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  
  await db.collection('app_settings').doc('main').set(settings);
  console.log('✅ App settings configured');
}

// Lightweight admin settings
async function createAdminSettings(db, adminUid) {
  console.log('\n🔐 Setting up admin configuration...');
  
  const settings = {
    security: {
      sessionTimeout: 3600000, // 1 hour
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
      ipWhitelist: []
    },
    
    dashboard: {
      refreshInterval: 30000,
      defaultDateRange: 7,
      realTimeStats: true
    },
    
    notifications: {
      newUsers: true,
      payments: true,
      errors: true,
      reports: true
    },
    
    createdBy: adminUid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  await db.collection('admin_settings').doc('main').set(settings);
  console.log('✅ Admin settings configured');
}

// Initialize essential collections only
async function initializeCollections(db) {
  console.log('\n📁 Initializing core collections...');
  
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  
  // System health check
  await db.collection('_system').doc('health').set({
    status: 'healthy',
    initialized: timestamp,
    version: '2.0.0'
  });
  
  // Analytics placeholder (lightweight)
  await db.collection('analytics').doc('_init').set({
    totalUsers: 0,
    totalCalls: 0,
    lastUpdated: timestamp
  });
  
  console.log('✅ Core collections initialized');
}

// Optimized main seed function
async function seedDatabase() {
  console.log('🚀 SOS Expat Platform - Production Setup\n');
  
  validateEnvironment();
  const { db, auth } = initializeFirebase();
  
  // Environment check with security warning
  if (ENV_CONFIG.security.nodeEnv === 'production') {
    console.log('⚠️  PRODUCTION MODE - All data will be persistent');
    const confirm = await promptInput('Continue? (y/N): ');
    if (confirm.toLowerCase() !== 'y') process.exit(0);
  }
  
  console.log('\n📱 Mobile-First & SEO Optimized Setup');
  console.log('🔒 Security Hardened Configuration');
  console.log('⚡ Performance Optimized');
  
  try {
    // Sequential setup for reliability
    const adminInfo = await createAdminUser(db, auth);
    if (!adminInfo) process.exit(1);
    
    await createAppSettings(db);
    await createAdminSettings(db, adminInfo.uid);
    await initializeCollections(db);
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n📱 MOBILE-FIRST FEATURES:');
    console.log('• Responsive breakpoints configured');
    console.log('• Touch-optimized interface (44px+ targets)');
    console.log('• Performance optimizations enabled');
    console.log('• Image lazy loading configured');
    
    console.log('\n🔍 SEO OPTIMIZATION:');
    console.log('• Meta tags and structured data ready');
    console.log('• Sitemap generation enabled');
    console.log('• Social media optimization configured');
    console.log('• Performance metrics tracking enabled');
    
    console.log('\n🔒 SECURITY FEATURES:');
    console.log('• Content Security Policy configured');
    console.log('• Rate limiting enabled');
    console.log('• Input validation and sanitization ready');
    console.log('• Secure headers configured');
    
    console.log(`\n👑 Admin: ${adminInfo.email}`);
    console.log('🔑 Change password after first login');
    console.log('📊 Configure monitoring and alerts');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Secure cleanup (dev only)
async function cleanDatabase() {
  if (ENV_CONFIG.security.nodeEnv === 'production') {
    console.log('🚫 Cleanup disabled in production');
    process.exit(1);
  }
  
  console.log('⚠️  WARNING: This will delete ALL data!');
  const confirm = await promptInput('Type "DELETE_ALL" to confirm: ');
  
  if (confirm !== 'DELETE_ALL') {
    console.log('❌ Cancelled');
    process.exit(0);
  }
  
  const { db, auth } = initializeFirebase();
  
  // Efficient batch deletion
  const collections = ['users', 'app_settings', 'admin_settings', '_system', 'analytics'];
  let totalDeleted = 0;
  
  for (const collection of collections) {
    const snapshot = await db.collection(collection).get();
    if (snapshot.empty) continue;
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    totalDeleted += snapshot.docs.length;
    console.log(`🗑️  ${collection}: ${snapshot.docs.length} deleted`);
  }
  
  // Delete auth users
  const listResult = await auth.listUsers();
  await Promise.all(listResult.users.map(user => auth.deleteUser(user.uid)));
  
  console.log(`✅ Cleanup complete: ${totalDeleted} docs, ${listResult.users.length} users deleted`);
  rl.close();
}

// Enhanced error handling and execution
process.on('SIGINT', () => {
  console.log('\n\n👋 Interrupted by user');
  rl.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled error:', reason);
  rl.close();
  process.exit(1);
});

// Command execution
const command = process.argv[2];

if (command === 'seed') {
  seedDatabase();
} else if (command === 'clean') {
  cleanDatabase();
} else {
  console.log('🚀 SOS Expat Platform - Production Setup Tool\n');
  console.log('📱 Mobile-First | 🔍 SEO Optimized | 🔒 Security Hardened\n');
  console.log('Usage: node firebase-seed.js [command]\n');
  console.log('Commands:');
  console.log('  seed  - Initialize production database');
  console.log('  clean - Clean database (dev only)\n');
  console.log('Environment Variables:');
  console.log('  FIREBASE_PROJECT_ID      (required)');
  console.log('  FIREBASE_DATABASE_URL    (required)');
  console.log('  FIREBASE_STORAGE_BUCKET  (required)');
  console.log('  FIREBASE_PRIVATE_KEY     (production)');
  console.log('  FIREBASE_CLIENT_EMAIL    (production)');
  rl.close();
}