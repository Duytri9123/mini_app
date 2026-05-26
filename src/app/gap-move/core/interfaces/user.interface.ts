export type GmUserRole = 'customer' | 'driver' | 'dispatcher' | 'admin';
export type GmUserStatus = 'active' | 'pending' | 'blocked';

export interface GmUser {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: GmUserRole;
  status: GmUserStatus;
}
