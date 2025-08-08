import { createContext } from 'react';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { User } from './types';

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  isUserLoggedIn: () => boolean;
  isLoading: boolean;
  authInitialized: boolean;
  error: string | null;
  authMetrics: {
    loginAttempts: number;
    lastAttempt: Date;
    successfulLogins: number;
    failedLogins: number;
    googleAttempts: number;
    roleRestrictionBlocks: number;
  };
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
    isOnline: boolean;
    connectionSpeed: 'slow' | 'medium' | 'fast';
  };
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
