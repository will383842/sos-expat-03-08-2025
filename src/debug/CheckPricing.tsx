import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

interface PricingDebugData {
  exists: boolean;
  lawyer_eur: any;
  lawyer_usd: any;
  expat_eur: any;
  expat_usd: any;
  typesOk: boolean;
  coherenceOk: boolean;
  currenciesOk: boolean;
  structure: 'VALID' | 'INVALID' | 'MISSING';
  lastCheck: string;
  cacheStatus: string;
}

export default function CheckPricing() {
  const [data, setData] = useState<PricingDebugData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkPricing = async () => {
    try {
      const startTime = Date.now();
      const snap = await getDoc(doc(db, "admin_config", "pricing"));
      const loadTime = Date.now() - startTime;
      
      if (!snap.exists()) {
        setData({
          exists: false,
          lawyer_eur: null,
          lawyer_usd: null,
          expat_eur: null,
          expat_usd: null,
          typesOk: false,
          coherenceOk: false,
          currenciesOk: false,
          structure: 'MISSING',
          lastCheck: new Date().toLocaleTimeString(),
          cacheStatus: `Load: ${loadTime}ms`
        });
        setError("❌ admin_config/pricing document introuvable");
        return;
      }

      const cfg = snap.data();
      
      // Validation structure
      const hasStructure = !!(
        cfg?.lawyer?.eur && cfg?.lawyer?.usd && 
        cfg?.expat?.eur && cfg?.expat?.usd
      );
      
      // Validation types
      const typesOk = hasStructure && [
        cfg.lawyer.eur,
        cfg.lawyer.usd,
        cfg.expat.eur,
        cfg.expat.usd
      ].every(service => 
        typeof service.totalAmount === "number" &&
        typeof service.connectionFeeAmount === "number" &&
        typeof service.providerAmount === "number" &&
        typeof service.duration === "number" &&
        typeof service.currency === "string"
      );
      
      // Validation cohérence des montants
      const coherenceOk = hasStructure && [
        cfg.lawyer.eur,
        cfg.lawyer.usd,
        cfg.expat.eur,
        cfg.expat.usd
      ].every(service => {
        const calculated = service.totalAmount - service.connectionFeeAmount;
        return Math.abs(calculated - service.providerAmount) < 0.01;
      });
      
      // Validation devises
      const currenciesOk = hasStructure && 
        cfg.lawyer.eur.currency === "eur" &&
        cfg.lawyer.usd.currency === "usd" &&
        cfg.expat.eur.currency === "eur" &&
        cfg.expat.usd.currency === "usd";

      setData({
        exists: true,
        lawyer_eur: cfg?.lawyer?.eur,
        lawyer_usd: cfg?.lawyer?.usd,
        expat_eur: cfg?.expat?.eur,
        expat_usd: cfg?.expat?.usd,
        typesOk,
        coherenceOk,
        currenciesOk,
        structure: (hasStructure && typesOk && coherenceOk && currenciesOk) ? 'VALID' : 'INVALID',
        lastCheck: new Date().toLocaleTimeString(),
        cacheStatus: `Load: ${loadTime}ms`
      });
      
      setError(null);
    } catch (e) {
      setError(`❌ ERROR: ${String(e)}`);
      setData(null);
    }
  };

  useEffect(() => {
    checkPricing();
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(checkPricing, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (error) return '#ff4444';
    if (!data) return '#666666';
    if (data.structure === 'VALID') return '#00aa00';
    if (data.structure === 'MISSING') return '#ff8800';
    return '#ffaa00';
  };

  const getStatusEmoji = () => {
    if (error) return '❌';
    if (!data) return '⏳';
    if (data.structure === 'VALID') return '✅';
    if (data.structure === 'MISSING') return '🚫';
    return '⚠️';
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '350px'
    }}>
      <details open={isExpanded} onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}>
        <summary style={{ 
          background: getStatusColor(),
          color: 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 'bold'
        }}>
          <span>{getStatusEmoji()} Pricing Debug</span>
          <span style={{ fontSize: '10px', opacity: 0.8 }}>
            {data?.lastCheck || 'Loading...'}
          </span>
        </summary>
        
        <div style={{ 
          background: "#111", 
          border: '1px solid #333',
          borderRadius: '8px',
          marginTop: '4px',
          overflow: 'hidden'
        }}>
          {/* Header Status */}
          <div style={{
            background: error ? '#330000' : data?.structure === 'VALID' ? '#003300' : '#332200',
            padding: '8px 12px',
            borderBottom: '1px solid #333'
          }}>
            <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
              Status: {error ? 'ERROR' : data?.structure || 'LOADING'}
            </div>
            <div style={{ color: '#ccc', fontSize: '10px' }}>
              Cache: {data?.cacheStatus || 'N/A'} | Last: {data?.lastCheck || 'N/A'}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{ padding: '12px', color: '#ff6666' }}>
              {error}
              <button 
                onClick={checkPricing}
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  background: '#444',
                  border: 'none',
                  borderRadius: '3px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Data Display */}
          {data && !error && (
            <div style={{ padding: '12px' }}>
              {/* Quick Status */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: data.typesOk ? '#0f0' : '#f80', marginBottom: '2px' }}>
                  Types: {data.typesOk ? '✅' : '❌'}
                </div>
                <div style={{ color: data.coherenceOk ? '#0f0' : '#f80', marginBottom: '2px' }}>
                  Cohérence: {data.coherenceOk ? '✅' : '❌'}
                </div>
                <div style={{ color: data.currenciesOk ? '#0f0' : '#f80', marginBottom: '2px' }}>
                  Devises: {data.currenciesOk ? '✅' : '❌'}
                </div>
              </div>

              {/* Detailed Data */}
              <details>
                <summary style={{ color: '#fff', cursor: 'pointer', marginBottom: '8px' }}>
                  📊 Données détaillées
                </summary>
                
                <div style={{ fontSize: '10px' }}>
                  {/* Lawyer Pricing */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#6cf', fontWeight: 'bold' }}>👨‍⚖️ LAWYER:</div>
                    <div style={{ color: '#ccc', marginLeft: '8px' }}>
                      EUR: {data.lawyer_eur?.totalAmount}€ 
                      (Fee: {data.lawyer_eur?.connectionFeeAmount}€, 
                      Provider: {data.lawyer_eur?.providerAmount}€)
                    </div>
                    <div style={{ color: '#ccc', marginLeft: '8px' }}>
                      USD: ${data.lawyer_usd?.totalAmount} 
                      (Fee: ${data.lawyer_usd?.connectionFeeAmount}, 
                      Provider: ${data.lawyer_usd?.providerAmount})
                    </div>
                  </div>

                  {/* Expat Pricing */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#6f6', fontWeight: 'bold' }}>🌍 EXPAT:</div>
                    <div style={{ color: '#ccc', marginLeft: '8px' }}>
                      EUR: {data.expat_eur?.totalAmount}€ 
                      (Fee: {data.expat_eur?.connectionFeeAmount}€, 
                      Provider: {data.expat_eur?.providerAmount}€)
                    </div>
                    <div style={{ color: '#ccc', marginLeft: '8px' }}>
                      USD: ${data.expat_usd?.totalAmount} 
                      (Fee: ${data.expat_usd?.connectionFeeAmount}, 
                      Provider: ${data.expat_usd?.providerAmount})
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Controls */}
          <div style={{
            background: '#222',
            padding: '6px 12px',
            borderTop: '1px solid #333',
            display: 'flex',
            gap: '8px'
          }}>
            <button 
              onClick={checkPricing}
              style={{
                padding: '4px 8px',
                background: '#444',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              🔄 Refresh
            </button>
            <button 
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
                alert('Debug data copied to clipboard!');
              }}
              style={{
                padding: '4px 8px',
                background: '#444',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              📋 Copy
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}