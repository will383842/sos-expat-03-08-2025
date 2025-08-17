export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
