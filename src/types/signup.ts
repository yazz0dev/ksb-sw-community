// Collection Structure:
// - signup/{batchYear}/signup/{registrationId} - Individual registration documents
// - signup/{batchYear} - Batch configuration document with 'active' field
import { Timestamp } from 'firebase/firestore';

export interface studreg {
  id?: string; // Document ID (optional for new registrations)
  fullName: string;
  email: string;
  studentId: string;
  batchYear: number;
  hasLaptop: boolean;
  photoURL?: string;
  bio?: string;
  skills?: string[];
  status: 'pending_approval' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string; // Admin user ID who processed the registration
  rejectionReason?: string;
  signupSource: {
    batch?: number | null;
    token?: string | null;
    userAgent?: string;
    referrer?: string | null;
  };
  notes?: string; // Admin notes
}

export interface BatchSignupConfig {
  id?: string; // Document ID (batchYear as string)
  batchYear: number;
  active: boolean; // Whether signup is currently active for this batch
  createdAt: Timestamp;
  createdBy: string; // Admin user ID who created/activated this batch
  updatedAt?: Timestamp; // When this config was last updated
  updatedBy?: string; // Admin user ID who last updated this
  activatedAt?: Timestamp; // When this batch was last activated
  deactivatedAt?: Timestamp; // When this batch was last deactivated
  maxRegistrations?: number; // Optional limit on registrations for this batch
  currentRegistrations: number; // Current count of registrations for this batch year
  description?: string; // Optional description for this batch
  notes?: string; // Admin notes about this batch
}

export interface SignupLinkData {
  id?: string;
  batchYear: number;
  token?: string;
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: string; // Admin user ID
  expiresAt?: Timestamp;
  maxUses?: number;
  currentUses: number;
  description?: string;
}

export type RegistrationStatus = 'pending_approval' | 'approved' | 'rejected';

export interface RegistrationFormData {
  fullName: string;
  email: string;
  studentId: string;
  batchYearConfirm: number | null;
  hasLaptop: boolean | null;
  bio: string;
  agreeTerms: boolean;
}