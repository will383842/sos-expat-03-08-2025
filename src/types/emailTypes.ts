export interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: 'draft' | 'sent' | 'scheduled';
  createdAt: Date;
}