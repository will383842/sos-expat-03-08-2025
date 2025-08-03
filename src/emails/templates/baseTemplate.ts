// Types pour i18n et Firebase
interface EmailTemplateConfig {
  locale: string;
  theme: 'light' | 'dark';
  trackingId?: string;
  userId?: string;
  campaignId?: string;
}

interface EmailContent {
  title: string;
  subtitle: string;
  ctaText: string;
  shareText: string;
  footerText: string;
}

// Configuration i18n
const translations: Record<string, EmailContent> = {
  fr: {
    title: "SOS Expat",
    subtitle: "Votre passeport vers la liberté",
    ctaText: "Découvrir l'app",
    shareText: "Partagez la liberté avec vos proches",
    footerText: "Born to explore, made to protect"
  },
  en: {
    title: "SOS Expat",
    subtitle: "Your passport to freedom",
    ctaText: "Discover the app",
    shareText: "Share freedom with your loved ones",
    footerText: "Born to explore, made to protect"
  }
};

// Fonction de tracking Firebase optimisée
const generateTrackingPixel = (config: EmailTemplateConfig): string => {
  if (!config.trackingId) return '';
  
  const params = new URLSearchParams({
    tid: config.trackingId,
    uid: config.userId || 'anonymous',
    cid: config.campaignId || 'default',
    t: 'event',
    ec: 'email',
    ea: 'open',
    el: config.locale,
    cm: 'email',
    cs: 'newsletter'
  }).toString();
  
  return `<img src="https://www.google-analytics.com/collect?${params}" width="1" height="1" alt="" style="display:none;" />`;
};

// Template principal optimisé
export const baseTemplate = (
  content: string, 
  config: EmailTemplateConfig = { locale: 'fr', theme: 'light' }
) => {
  const t = translations[config.locale] || translations.fr;
  const trackingPixel = generateTrackingPixel(config);
  const currentYear = new Date().getFullYear();
  
  // URLs optimisées avec tracking UTM
  const appUrl = `https://sos-expat.app?utm_source=email&utm_medium=cta&utm_campaign=${config.campaignId || 'default'}&utm_content=${config.locale}`;
  const shareUrl = encodeURIComponent(`🌍✈️ Découvrez SOS Expat pour voyager l'esprit libre : ${appUrl}`);
  const whatsappUrl = `https://wa.me/?text=${shareUrl}`;

  return `<!DOCTYPE html>
<html lang="${config.locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, minimum-scale=1.0, maximum-scale=5.0">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  
  <!-- SEO & Social Media Meta Tags -->
  <title>${t.title} - ${t.subtitle}</title>
  <meta name="description" content="SOS Expat : votre compagnon de voyage pour explorer le monde en toute sécurité. Application mobile pour expatriés et voyageurs.">
  <meta name="keywords" content="voyage, expatrié, sécurité, application mobile, SOS, assistance, international">
  <meta name="author" content="SOS Expat">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${appUrl}">
  <meta property="og:title" content="${t.title} - ${t.subtitle}">
  <meta property="og:description" content="Votre compagnon de voyage pour explorer le monde en toute sécurité">
  <meta property="og:image" content="https://sos-expat.app/assets/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="SOS Expat">
  <meta property="og:locale" content="${config.locale}_${config.locale.toUpperCase()}">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${appUrl}">
  <meta property="twitter:title" content="${t.title} - ${t.subtitle}">
  <meta property="twitter:description" content="Votre compagnon de voyage pour explorer le monde en toute sécurité">
  <meta property="twitter:image" content="https://sos-expat.app/assets/twitter-image.jpg">
  <meta name="twitter:creator" content="@sosexpat">
  
  <!-- Structured Data for AI/ChatGPT -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "${t.title}",
    "description": "Application mobile d'assistance pour voyageurs et expatriés",
    "applicationCategory": "TravelApplication",
    "operatingSystem": "iOS, Android",
    "url": "${appUrl}",
    "publisher": {
      "@type": "Organization",
      "name": "SOS Expat",
      "url": "https://sos-expat.app"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR"
    }
  }
  </script>
  
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  
  <style type="text/css">
    /* Reset & Base Styles */
    * { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    
    /* Mobile-First Responsive */
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding: 15px !important; }
      .mobile-text { font-size: 14px !important; line-height: 1.5 !important; }
      .mobile-title { font-size: 28px !important; }
      .mobile-button { padding: 14px 25px !important; font-size: 16px !important; }
      .mobile-hide { display: none !important; }
    }
    
    @media screen and (max-width: 480px) {
      .mobile-padding { padding: 12px !important; }
      .mobile-title { font-size: 24px !important; }
    }
    
    /* Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      .dark-bg { background-color: #1a1a1a !important; }
      .dark-text { color: #ffffff !important; }
      .dark-secondary { color: #e0e0e0 !important; }
    }
    
    /* High Contrast Mode */
    @media (prefers-contrast: high) {
      .high-contrast { border: 2px solid #000000 !important; }
    }
    
    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }
    
    /* Touch Optimization */
    .touch-target {
      min-height: 44px;
      min-width: 44px;
      display: inline-block;
      text-align: center;
    }
    
    /* Loading Performance */
    .preload-font { font-display: swap; }
  </style>
</head>

<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;" class="dark-bg">
  ${trackingPixel}
  
  <!-- Preconnect for performance -->
  <div style="display: none;">
    <link rel="preconnect" href="https://sos-expat.app">
    <link rel="preconnect" href="https://wa.me">
  </div>
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <tr>
      <td align="center" style="padding: 20px 0;">
        
        <!-- Email Content -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);" class="dark-bg">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px 30px; text-align: center; position: relative;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1); font-family: inherit;" class="mobile-title">
                      🚀 ${t.title}
                    </h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px; font-weight: 300;" class="mobile-text">
                      ${t.subtitle} 🗺️
                    </p>
                    <div style="position: absolute; top: 20px; right: 30px; opacity: 0.3; font-size: 24px;" class="mobile-hide" aria-hidden="true">✈️</div>
                    <div style="position: absolute; top: 30px; left: 30px; opacity: 0.3; font-size: 20px;" class="mobile-hide" aria-hidden="true">🌍</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;" class="mobile-padding">
              <div style="font-size: 16px; line-height: 1.6; color: #2c3e50;" class="mobile-text dark-text">
                ${content}
              </div>
            </td>
          </tr>
          
          <!-- CTA Section -->
          <tr>
            <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); border-radius: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 30px; text-align: center; position: relative;">
                    <div style="position: absolute; top: 15px; right: 20px; opacity: 0.2; font-size: 40px;" class="mobile-hide" aria-hidden="true">📱</div>
                    <div style="position: absolute; bottom: 15px; left: 20px; opacity: 0.2; font-size: 30px;" class="mobile-hide" aria-hidden="true">🔥</div>
                    
                    <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
                      🎯 Restez libre & protégé
                    </h3>
                    <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px 0; font-size: 15px;" class="mobile-text">
                      Téléchargez l'app qui révolutionne vos voyages
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 50px; background: #ffffff;">
                          <a href="${appUrl}" 
                             style="display: inline-block; background: #ffffff; color: #ee5a24; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);" 
                             class="touch-target mobile-button high-contrast"
                             target="_blank"
                             rel="noopener noreferrer"
                             role="button"
                             aria-label="${t.ctaText} - Ouvre dans un nouvel onglet">
                            🌟 ${t.ctaText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Share Section -->
          <tr>
            <td style="padding: 0 30px 40px 30px;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 18px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px; text-align: center; position: relative;">
                    <div style="position: absolute; top: 10px; left: 20px; opacity: 0.3; font-size: 25px;" class="mobile-hide" aria-hidden="true">💎</div>
                    <div style="position: absolute; bottom: 10px; right: 20px; opacity: 0.3; font-size: 20px;" class="mobile-hide" aria-hidden="true">🚀</div>
                    
                    <p style="color: #2c3e50; margin: 0 0 15px 0; font-size: 16px; font-weight: 500;" class="dark-text">
                      🎉 Vous kiffez l'expérience ?
                    </p>
                    <p style="color: #555; margin: 0 0 20px 0; font-size: 14px;" class="mobile-text dark-secondary">
                      ${t.shareText}
                    </p>
                    
                    <!-- Share Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 25px; background: #25D366;">
                          <a href="${whatsappUrl}" 
                             style="display: inline-block; background: #25D366; color: #ffffff; padding: 10px 25px; border-radius: 25px; text-decoration: none; font-weight: 500; font-size: 14px; box-shadow: 0 3px 10px rgba(37, 211, 102, 0.3);" 
                             class="touch-target mobile-button high-contrast"
                             target="_blank"
                             rel="noopener noreferrer"
                             role="button"
                             aria-label="Partager sur WhatsApp - Ouvre dans un nouvel onglet">
                            💬 Partager sur WhatsApp
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;" class="mobile-padding dark-bg">
              <p style="margin: 0; font-size: 13px; color: #6c757d;" class="dark-secondary">
                🌍 © ${currentYear} ${t.title} – ${t.footerText}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
  <!-- Analytics & Tracking -->
  <div style="display: none;">
    <img src="https://sos-expat.app/api/email-tracking?campaign=${config.campaignId}&user=${config.userId}&locale=${config.locale}" width="1" height="1" alt="" />
  </div>
  
</body>
</html>`;
};