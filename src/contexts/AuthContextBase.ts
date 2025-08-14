// Base auth context: types + context only. No JSX/Provider here.
import { createContext } from 'react';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { User } from './types';

export type ConnectionSpeed = 'slow' | 'medium' | 'fast';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  os: string;
  browser: string;
  isOnline: boolean;
  connectionSpeed: ConnectionSpeed;
}

export interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
}

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  isUserLoggedIn: () => boolean;

  isLoading: boolean;
  authInitialized: boolean;
  error: string | null;

  authMetrics: AuthMetrics;
  deviceInfo: DeviceInfo;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: Partial<User>, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  getLastLoginInfo: () => { date: Date | null; device: string | null };
}

// Named export expected by AuthContext.tsx
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
