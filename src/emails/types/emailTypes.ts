// emailTypes.ts
export interface Campaign {
  id?: string;
  name: string;
  scheduledAt: string;
  targets: string[]; // e.g. ['lawyer', 'expat']
  status: 'pending' | 'sent' | 'failed';
  templateId: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  template: string;
  data: Record<string, string>;
}

export type TemplateFunction = (data: Record<string, string>) => string;
