interface DebugContext {
  component: string;
  action: string;
  data?: any;
  error?: any;
  timestamp?: string;
}

export const debugLog = (context: DebugContext) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const timestamp = new Date().toISOString();
  const prefix = `🐛 [${context.component}] ${context.action}`;
  
  console.group(prefix);
  console.log('⏰ Timestamp:', timestamp);
  
  if (context.data) {
    console.log('📊 Data:', context.data);
  }
  
  if (context.error) {
    console.error('❌ Error:', context.error);
  }
  
  console.groupEnd();
};

// Utilisation dans BookingRequest:
debugLog({
  component: 'BookingRequest',
  action: 'Navigation to CallCheckout',
  data: { providerId, serviceData: serviceInfo }
});