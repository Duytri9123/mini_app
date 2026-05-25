export type UserRole = 'customer' | 'staff' | 'station_manager' | 'chain_owner' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'banned';
export type UserGender = 'male' | 'female' | 'other';

export interface BjUser {
  id: string;
  phone?: string | null;
  email?: string | null;
  fullName: string;
  avatarUrl?: string | null;
  dateOfBirth?: string;
  gender?: UserGender;
  status?: UserStatus | string;
  role?: UserRole | string;
  googleId?: string | null;
  googleLinked?: boolean;
}
