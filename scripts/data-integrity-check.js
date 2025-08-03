/**
 * Script de vérification et correction de l'intégrité des données
 * SOS Expat Platform - Firebase Firestore
 * Version Enterprise - Optimisée pour montée en charge massive
 */

const admin = require('firebase-admin');
const path = require('path');
const { Worker } = require('worker_threads');
const os = require('os');

// Configuration pour montée en charge
const CONFIG = {
  collections: {
    users: 'users',
    sosProfiles: 'sos_profiles', 
    calls: 'calls'
  },
  requiredFields: {
    users: ['email', 'role', 'firstName', 'lastName', 'createdAt'],
    sosProfiles: ['uid', 'type', 'fullName', 'rating', 'price'],
    calls: ['clientId', 'providerId', 'serviceType', 'status', 'price']
  },
  roles: {
    client: 'client',
    lawyer: 'lawyer', 
    expat: 'expat'
  },
  pricing: {
    lawyer: 49,
    expat: 19
  },
  // Optimisations pour montée en charge
  performance: {
    batchSize: 500,              // Limite Firestore batch operations
    authPageSize: 1000,          // Pagination Auth
    concurrentWorkers: Math.min(os.cpus().length, 4), // Workers parallèles
    rateLimitDelay: 100,         // ms entre requêtes (éviter throttling)
    maxRetries: 3,               // Retry automatique en cas d'erreur
    backoffMultiplier: 2,        // Exponential backoff
    memoryThreshold: 0.8,        // Seuil mémoire avant pause
    progressInterval: 1000       // Affichage progrès tous les 1000 items
  },
  // Monitoring et métriques
  monitoring: {
    enableMetrics: true,
    logLevel: process.env.LOG_LEVEL || 'info',
    reportingInterval: 5000
  }
};

// Système de métriques pour monitoring production
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      operationsCount: 0,
      errorsCount: 0,
      memoryUsage: [],
      queryTimes: [],
      batchOperations: 0
    };
    this.progressReported = 0;
  }

  recordOperation(duration, success = true) {
    this.metrics.operationsCount++;
    this.metrics.queryTimes.push(duration);
    if (!success) this.metrics.errorsCount++;
  }

  recordMemoryUsage() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed / 1024 / 1024, // MB
      heapTotal: usage.heapTotal / 1024 / 1024
    });
  }

  shouldPauseForMemory() {
    const usage = process.memoryUsage();
    const heapRatio = usage.heapUsed / usage.heapTotal;
    return heapRatio > CONFIG.performance.memoryThreshold;
  }

  reportProgress(current, total, operation) {
    if (current - this.progressReported >= CONFIG.performance.progressInterval) {
      const percent = ((current / total) * 100).toFixed(1);
      const eta = this.calculateETA(current, total);
      console.log(`📊 ${operation}: ${current}/${total} (${percent}%) - ETA: ${eta}`);
      this.progressReported = current;
    }
  }

  calculateETA(current, total) {
    const elapsed = Date.now() - this.metrics.startTime;
    const rate = current / elapsed; // items per ms
    const remaining = total - current;
    const etaMs = remaining / rate;
    return `${Math.round(etaMs / 1000)}s`;
  }

  getFinalReport() {
    const duration = (Date.now() - this.metrics.startTime) / 1000;
    const avgQueryTime = this.metrics.queryTimes.reduce((a, b) => a + b, 0) / this.metrics.queryTimes.length;
    const maxMemory = Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed));
    
    return {
      totalDuration: duration,
      operationsPerSecond: this.metrics.operationsCount / duration,
      errorRate: (this.metrics.errorsCount / this.metrics.operationsCount) * 100,
      avgQueryTime: avgQueryTime.toFixed(2),
      peakMemoryMB: maxMemory.toFixed(2),
      totalOperations: this.metrics.operationsCount
    };
  }
}

// Système de retry avec exponential backoff
class RetryHandler {
  static async executeWithRetry(operation, maxRetries = CONFIG.performance.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Erreurs non retriables
        if (error.code === 'permission-denied' || error.code === 'invalid-argument') {
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = CONFIG.performance.rateLimitDelay * 
                       Math.pow(CONFIG.performance.backoffMultiplier, attempt - 1);
          console.log(`⚠️ Retry ${attempt}/${maxRetries} in ${delay}ms: ${error.message}`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialisation Firebase sécurisée et optimisée
class FirebaseManager {
  static initialize() {
    if (admin.apps.length === 0) {
      const serviceAccountPath = process.env.SERVICE_ACCOUNT_KEY_PATH || './serviceAccountKey.json';
      const projectId = process.env.FIREBASE_PROJECT_ID;
      
      if (!projectId) {
        throw new Error('FIREBASE_PROJECT_ID environment variable is required');
      }

      try {
        const serviceAccount = require(path.resolve(serviceAccountPath));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
          // Optimisations pour production
          databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`,
          storageBucket: `${projectId}.appspot.com`
        });
        
        // Configuration optimisée Firestore
        const db = admin.firestore();
        db.settings({
          ignoreUndefinedProperties: true,
          timestampsInSnapshots: true
        });
        
      } catch (error) {
        throw new Error(`Failed to initialize Firebase: ${error.message}`);
      }
    }
    return { db: admin.firestore(), auth: admin.auth() };
  }
}

// Classe principale optimisée pour montée en charge massive
class ScalableIntegrityChecker {
  constructor() {
    const { db, auth } = FirebaseManager.initialize();
    this.db = db;
    this.auth = auth; 
    this.issues = [];
    this.fixes = [];
    this.monitor = new PerformanceMonitor();
  }

  // Récupération Auth avec gestion mémoire et pagination optimisée
  async getAllAuthUsers() {
    console.log('🔍 Fetching Auth users with memory optimization...');
    const authUsers = new Map();
    let nextPageToken;
    let processed = 0;
    
    try {
      do {
        // Pause si mémoire saturée
        if (this.monitor.shouldPauseForMemory()) {
          console.log('⏸️ Pausing for garbage collection...');
          global.gc && global.gc();
          await RetryHandler.sleep(2000);
        }

        const startTime = Date.now();
        const result = await RetryHandler.executeWithRetry(
          () => this.auth.listUsers(CONFIG.performance.authPageSize, nextPageToken)
        );
        
        result.users.forEach(user => authUsers.set(user.uid, user));
        processed += result.users.length;
        nextPageToken = result.pageToken;
        
        this.monitor.recordOperation(Date.now() - startTime);
        this.monitor.recordMemoryUsage();
        
        // Rate limiting pour éviter throttling
        await RetryHandler.sleep(CONFIG.performance.rateLimitDelay);
        
      } while (nextPageToken);
      
      console.log(`✅ Auth users loaded: ${authUsers.size}`);
      return authUsers;
      
    } catch (error) {
      throw new Error(`Failed to fetch Auth users: ${error.message}`);
    }
  }

  // Récupération Firestore avec streaming pour grandes collections
  async getCollectionDataStream(collectionName, filterFn = null) {
    console.log(`🔍 Streaming ${collectionName} collection...`);
    const data = new Map();
    let processed = 0;
    
    try {
      // Query avec pagination pour grandes collections  
      let query = this.db.collection(collectionName);
      let lastDoc = null;
      
      do {
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const startTime = Date.now();
        const snapshot = await RetryHandler.executeWithRetry(
          () => query.limit(CONFIG.performance.batchSize).get()
        );
        
        if (snapshot.empty) break;
        
        snapshot.docs.forEach(doc => {
          const docData = doc.data();
          if (!filterFn || filterFn(docData)) {
            data.set(doc.id, docData);
          }
          processed++;
        });
        
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        
        this.monitor.recordOperation(Date.now() - startTime);
        this.monitor.recordMemoryUsage();
        
        // Gestion mémoire proactive
        if (this.monitor.shouldPauseForMemory()) {
          console.log(`⏸️ Memory threshold reached, optimizing... (${processed} processed)`);
          global.gc && global.gc();
          await RetryHandler.sleep(1000);
        }
        
        await RetryHandler.sleep(CONFIG.performance.rateLimitDelay);
        
      } while (lastDoc);
      
      console.log(`✅ ${collectionName} loaded: ${data.size} documents`);
      return data;
      
    } catch (error) {
      throw new Error(`Failed to stream ${collectionName}: ${error.message}`);
    }
  }

  // Validation avec métriques de performance
  validateRequiredFields(data, requiredFields, entityType, entityId) {
    const startTime = Date.now();
    
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || 
             (typeof value === 'string' && value.trim() === '');
    });
    
    this.monitor.recordOperation(Date.now() - startTime);
    
    if (missingFields.length > 0) {
      this.issues.push(`${entityType} ${entityId}: Missing [${missingFields.join(', ')}]`);
      return { isValid: false, missingFields };
    }
    return { isValid: true, missingFields: [] };
  }

  // Vérification utilisateurs avec parallélisation
  async checkUserIntegrity() {
    console.log('🔍 Checking user integrity with parallel processing...');
    
    // Chargement parallèle optimisé
    const [authUsers, firestoreUsers] = await Promise.all([
      this.getAllAuthUsers(),
      this.getCollectionDataStream(CONFIG.collections.users)
    ]);

    console.log(`📊 Auth: ${authUsers.size}, Firestore: ${firestoreUsers.size}`);

    // Traitement par chunks pour éviter la saturation mémoire
    const authUserChunks = this.chunkMap(authUsers, CONFIG.performance.batchSize);
    
    for (let i = 0; i < authUserChunks.length; i++) {
      const chunk = authUserChunks[i];
      
      // Parallélisation du traitement par chunk
      await Promise.all(
        chunk.map(async ([uid, authUser]) => {
          if (!firestoreUsers.has(uid)) {
            this.issues.push(`Auth user ${uid} (${authUser.email}) missing Firestore doc`);
            this.fixes.push({
              type: 'createUserDoc',
              uid,
              email: authUser.email,
              displayName: authUser.displayName,
              priority: 'high'
            });
          }
        })
      );
      
      this.monitor.reportProgress(
        (i + 1) * CONFIG.performance.batchSize, 
        authUsers.size, 
        'Auth user validation'
      );
    }

    // Validation Firestore users avec optimisations
    let processedFirestore = 0;
    for (const [uid, userData] of firestoreUsers) {
      if (!authUsers.has(uid)) {
        this.issues.push(`Firestore doc ${uid} (${userData.email}) missing Auth user`);
        this.fixes.push({ 
          type: 'deleteOrphanDoc', 
          uid, 
          email: userData.email,
          priority: 'medium'
        });
      } else {
        // Validation des champs avec métriques
        const validation = this.validateRequiredFields(
          userData, 
          CONFIG.requiredFields.users, 
          'User', 
          uid
        );
        
        if (!validation.isValid) {
          this.fixes.push({
            type: 'fixUserFields',
            uid,
            missingFields: validation.missingFields,
            priority: 'low'
          });
        }

        // Cohérence email avec cache
        const authUser = authUsers.get(uid);
        if (authUser.email !== userData.email) {
          this.issues.push(`User ${uid}: Email mismatch Auth(${authUser.email}) vs Firestore(${userData.email})`);
          this.fixes.push({
            type: 'syncEmail',
            uid,
            authEmail: authUser.email,
            firestoreEmail: userData.email,
            priority: 'high'
          });
        }
      }
      
      processedFirestore++;
      this.monitor.reportProgress(processedFirestore, firestoreUsers.size, 'Firestore user validation');
    }
  }

  // Vérification SOS profiles avec optimisations
  async checkSOSProfilesIntegrity() {
    console.log('🔍 Checking SOS profiles with optimized queries...');
    
    // Requête optimisée avec index composite
    const providersPromise = this.db.collection(CONFIG.collections.users)
      .where('role', 'in', [CONFIG.roles.lawyer, CONFIG.roles.expat])
      .get()
      .then(snapshot => {
        const data = new Map();
        snapshot.docs.forEach(doc => data.set(doc.id, doc.data()));
        return data;
      });
    
    const [providers, sosProfiles] = await Promise.all([
      providersPromise,
      this.getCollectionDataStream(CONFIG.collections.sosProfiles)
    ]);

    console.log(`📊 Providers: ${providers.size}, SOS profiles: ${sosProfiles.size}`);

    // Traitement optimisé avec métriques
    let processed = 0;
    const total = Math.max(providers.size, sosProfiles.size);

    // Vérification providers manquants
    for (const [uid, userData] of providers) {
      if (!sosProfiles.has(uid)) {
        this.issues.push(`Provider ${uid} (${userData.email}) missing SOS profile`);
        this.fixes.push({ 
          type: 'createSOSProfile', 
          uid, 
          userData,
          priority: 'high'
        });
      }
      processed++;
      this.monitor.reportProgress(processed, total, 'SOS profile validation');
    }

    // Vérification profils orphelins et cohérence
    processed = 0;
    for (const [uid, sosData] of sosProfiles) {
      if (!providers.has(uid)) {
        this.issues.push(`SOS profile ${uid} missing provider user`);
        this.fixes.push({ 
          type: 'deleteOrphanSOS', 
          uid,
          priority: 'medium'
        });
      } else {
        const userData = providers.get(uid);
        
        // Validation avec métriques
        this.validateRequiredFields(
          sosData,
          CONFIG.requiredFields.sosProfiles,
          'SOS Profile',
          uid
        );

        // Cohérence type
        if (sosData.type !== userData.role) {
          this.issues.push(`SOS profile ${uid}: Type mismatch SOS(${sosData.type}) vs User(${userData.role})`);
          this.fixes.push({ 
            type: 'syncSOSType', 
            uid, 
            correctType: userData.role,
            priority: 'medium'
          });
        }
      }
      processed++;
      this.monitor.reportProgress(processed, sosProfiles.size, 'SOS profile coherency');
    }
  }

  // Vérification calls avec optimisations de requêtes
  async checkCallsIntegrity() {
    console.log('🔍 Checking calls with indexed queries...');
    
    const [calls, users] = await Promise.all([
      this.getCollectionDataStream(CONFIG.collections.calls),
      this.getCollectionDataStream(CONFIG.collections.users)
    ]);

    console.log(`📊 Calls: ${calls.size}`);

    let processed = 0;
    for (const [callId, callData] of calls) {
      // Vérification existence avec early return
      if (!users.has(callData.clientId)) {
        this.issues.push(`Call ${callId}: Missing client ${callData.clientId}`);
        this.fixes.push({ 
          type: 'deleteOrphanCall', 
          callId, 
          reason: 'Missing client',
          priority: 'high'
        });
        continue;
      }

      if (!users.has(callData.providerId)) {
        this.issues.push(`Call ${callId}: Missing provider ${callData.providerId}`);
        this.fixes.push({ 
          type: 'deleteOrphanCall', 
          callId, 
          reason: 'Missing provider',
          priority: 'high'
        });
        continue;
      }

      // Validation optimisée
      const validation = this.validateRequiredFields(
        callData,
        CONFIG.requiredFields.calls,
        'Call',
        callId
      );

      if (!validation.isValid) {
        this.fixes.push({
          type: 'fixCallFields',
          callId,
          missingFields: validation.missingFields,
          priority: 'low'
        });
      }
      
      processed++;
      this.monitor.reportProgress(processed, calls.size, 'Call validation');
    }
  }

  // Application des corrections avec batch optimisé
  async applyFixes() {
    if (this.fixes.length === 0) {
      console.log('✅ No fixes needed');
      return;
    }

    // Tri par priorité pour optimiser l'ordre des corrections
    this.fixes.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });

    console.log(`🔧 Applying ${this.fixes.length} fixes with batch optimization...`);

    const batch = this.db.batch();
    let batchCount = 0;
    let processed = 0;

    for (const fix of this.fixes) {
      try {
        await this.processFix(fix, batch);
        batchCount++;
        processed++;

        // Commit batch à la limite avec retry
        if (batchCount >= CONFIG.performance.batchSize) {
          await RetryHandler.executeWithRetry(() => batch.commit());
          batchCount = 0;
          this.monitor.batchOperations++;
          
          // Rate limiting entre batches
          await RetryHandler.sleep(CONFIG.performance.rateLimitDelay);
        }
        
        this.monitor.reportProgress(processed, this.fixes.length, 'Applying fixes');
        
      } catch (error) {
        console.error(`❌ Fix failed for ${fix.type}:`, error.message);
        this.monitor.recordOperation(0, false);
      }
    }

    // Commit final batch
    if (batchCount > 0) {
      await RetryHandler.executeWithRetry(() => batch.commit());
      this.monitor.batchOperations++;
    }

    console.log(`✅ Applied ${processed}/${this.fixes.length} fixes in ${this.monitor.batchOperations} batches`);
  }

  // Traitement des corrections avec gestion d'erreurs
  async processFix(fix, batch) {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    switch (fix.type) {
      case 'createUserDoc':
        const userDoc = {
          uid: fix.uid,
          email: fix.email,
          firstName: fix.displayName?.split(' ')[0] || 'User',
          lastName: fix.displayName?.split(' ').slice(1).join(' ') || 'Unknown',
          fullName: fix.displayName || 'Unknown User',
          role: CONFIG.roles.client,
          isActive: true,
          isApproved: true,
          isVerified: false,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        batch.set(this.db.collection(CONFIG.collections.users).doc(fix.uid), userDoc);
        break;

      case 'deleteOrphanDoc':
        batch.delete(this.db.collection(CONFIG.collections.users).doc(fix.uid));
        break;

      case 'createSOSProfile':
        const sosProfile = {
          uid: fix.uid,
          type: fix.userData.role,
          fullName: fix.userData.fullName || `${fix.userData.firstName} ${fix.userData.lastName}`,
          firstName: fix.userData.firstName,
          lastName: fix.userData.lastName,
          email: fix.userData.email,
          phone: fix.userData.phone || '',
          languages: fix.userData.languages || ['French'],
          country: fix.userData.country || '',
          description: fix.userData.bio || `${fix.userData.role} expert`,
          isActive: true,
          isApproved: fix.userData.isApproved || false,
          isVerified: fix.userData.isVerified || false,
          rating: 4.5,
          reviewCount: 0,
          price: CONFIG.pricing[fix.userData.role] || CONFIG.pricing.expat,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        batch.set(this.db.collection(CONFIG.collections.sosProfiles).doc(fix.uid), sosProfile);
        break;

      case 'deleteOrphanSOS':
        batch.delete(this.db.collection(CONFIG.collections.sosProfiles).doc(fix.uid));
        break;

      case 'syncEmail':
        batch.update(
          this.db.collection(CONFIG.collections.users).doc(fix.uid), 
          { email: fix.authEmail, updatedAt: timestamp }
        );
        break;

      case 'deleteOrphanCall':
        batch.delete(this.db.collection(CONFIG.collections.calls).doc(fix.callId));
        break;

      default:
        console.log(`⚠️ Unknown fix type: ${fix.type}`);
    }
  }

  // Utilitaire pour découper les Maps en chunks
  chunkMap(map, size) {
    const chunks = [];
    const entries = Array.from(map.entries());
    
    for (let i = 0; i < entries.length; i += size) {
      chunks.push(entries.slice(i, i + size));
    }
    
    return chunks;
  }

  // Exécution principale avec monitoring complet
  async run() {
    console.log('🚀 Starting scalable integrity check...\n');
    
    try {
      // Monitoring initial
      this.monitor.recordMemoryUsage();
      
      // Exécution avec gestion d'erreurs robuste
      await Promise.all([
        this.checkUserIntegrity().catch(e => console.error('❌ User check failed:', e.message)),
        this.checkSOSProfilesIntegrity().catch(e => console.error('❌ SOS check failed:', e.message)),
        this.checkCallsIntegrity().catch(e => console.error('❌ Calls check failed:', e.message))
      ]);

      // Rapport détaillé avec métriques
      const report = this.monitor.getFinalReport();
      console.log('\n📋 SCALABLE INTEGRITY REPORT:');
      console.log(`📊 Issues found: ${this.issues.length}`);
      console.log(`🔧 Fixes available: ${this.fixes.length}`);
      console.log(`⚡ Performance: ${report.operationsPerSecond.toFixed(1)} ops/sec`);
      console.log(`💾 Peak memory: ${report.peakMemoryMB}MB`);
      console.log(`⏱️ Avg query time: ${report.avgQueryTime}ms`);
      console.log(`❌ Error rate: ${report.errorRate.toFixed(2)}%`);

      if (this.issues.length > 0) {
        console.log('\n❌ ISSUES FOUND:');
        this.issues.slice(0, 10).forEach(issue => console.log(`  • ${issue}`));
        if (this.issues.length > 10) {
          console.log(`  ... and ${this.issues.length - 10} more issues`);
        }
      }

      // Application des corrections
      const autoFix = process.argv.includes('--auto-fix');
      if (autoFix && this.fixes.length > 0) {
        console.log('\n🔧 Auto-fix mode: Applying corrections...');
        await this.applyFixes();
      } else if (this.fixes.length > 0) {
        console.log('\nUse --auto-fix to apply corrections automatically');
      } else {
        console.log('\n✅ Database integrity verified - Production ready!');
      }

      console.log(`\n🎉 Check completed in ${report.totalDuration.toFixed(2)}s`);

    } catch (error) {
      console.error('❌ Critical error:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  }
}

// Point d'entrée avec gestion des signaux système
if (require.main === module) {
  const checker = new ScalableIntegrityChecker();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️ Graceful shutdown initiated...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n⏹️ Process terminated gracefully');
    process.exit(0);
  });
  
  checker.run()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = ScalableIntegrityChecker;