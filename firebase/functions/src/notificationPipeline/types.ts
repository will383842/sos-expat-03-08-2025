export type Channel = "email" | "sms" | "whatsapp" | "push" | "inapp";

export type TemplateEmail = { enabled: boolean; subject: string; html?: string; text?: string };
export type TemplateSms   = { enabled: boolean; text: string };
export type TemplateWA    = { enabled: boolean; templateName: string; params?: string[] };
export type TemplatePush  = { enabled: boolean; title: string; body: string; deeplink?: string };
export type TemplateInApp = { enabled: boolean; title: string; body: string };

export type TemplatesByEvent = {
  _meta?: { updatedAt?: string; updatedBy?: string };
  email?: TemplateEmail; 
  sms?: TemplateSms; 
  whatsapp?: TemplateWA; 
  push?: TemplatePush; 
  inapp?: TemplateInApp;
};

export type ChannelConfig = { 
  enabled: boolean; 
  provider: string; 
  rateLimitH: number; 
  retries: number; 
  delaySec: number 
};

export type RoutingPerEvent = {
  strategy: "parallel" | "fallback";
  order?: Channel[];
  channels: Record<Channel, ChannelConfig>;
};

export type RoutingConfig = Record<string, RoutingPerEvent>;