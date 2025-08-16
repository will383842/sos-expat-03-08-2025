interface DebugContext {
  component: string;
  action: string;
  data?: unknown;
  error?: unknown;
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
export const logBookingNavigation = (providerId: string, serviceInfo: unknown) => {
  debugLog({
    component: 'BookingRequest',
    action: 'Navigation to CallCheckout',
    data: { providerId, serviceData: serviceInfo }
  });
};