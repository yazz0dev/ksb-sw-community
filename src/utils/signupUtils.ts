import { collection, addDoc, query, where, getDocs, Timestamp, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import type { SignupLinkData, BatchSignupConfig } from '@/types/signup';

/**
 * Generate a random token for signup links
 */
export function generateSignupToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a signup link for a specific batch
 */
export function createBatchSignupLink(batchYear: number, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/signup?batch=${batchYear}`;
}

/**
 * Create a token-based signup link
 */
export function createTokenSignupLink(token: string, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/signup?token=${token}`;
}

/**
 * Validate batch year
 */
export function isValidBatchYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= 2020 && year <= currentYear + 5;
}

/**
 * Parse signup link parameters
 */
export function parseSignupParams(searchParams: URLSearchParams): {
  batchYear: number | null;
  token: string | null;
  isValid: boolean;
} {
  const batch = searchParams.get('batch');
  const token = searchParams.get('token');

  let batchYear: number | null = null;
  let isValid = false;

  if (batch) {
    const year = parseInt(batch);
    if (!isNaN(year) && isValidBatchYear(year)) {
      batchYear = year;
      isValid = true;
    }
  }

  if (token && typeof token === 'string' && token.length > 0) {
    isValid = true;
  }

  return {
    batchYear,
    token,
    isValid
  };
}

/**
 * Create a signup link record in Firestore (for admin use)
 */
export async function createSignupLinkRecord(
  batchYear: number,
  createdBy: string,
  options: {
    token?: string;
    expiresAt?: Date;
    maxUses?: number;
    description?: string;
  } = {}
): Promise<string> {
  const linkData: Omit<SignupLinkData, 'id'> = {
    batchYear,
    token: options.token || undefined,
    isActive: true,
    createdAt: Timestamp.now(),
    createdBy,
    expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : undefined,
    maxUses: options.maxUses || undefined,
    currentUses: 0,
    description: options.description || undefined
  };

  const docRef = await addDoc(collection(db, 'signupLinks'), linkData);
  return docRef.id;
}

/**
 * Validate a token-based signup link
 */
export async function validateSignupToken(token: string): Promise<{
  isValid: boolean;
  batchYear?: number;
  linkId?: string;
  error?: string;
}> {
  try {
    const linksRef = collection(db, 'signupLinks');
    const q = query(
      linksRef,
      where('token', '==', token),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { isValid: false, error: 'Invalid or expired signup token' };
    }

    const linkDoc = snapshot.docs[0];
    const linkData = linkDoc.data() as SignupLinkData;

    // Check if expired
    if (linkData.expiresAt && linkData.expiresAt.toDate() < new Date()) {
      return { isValid: false, error: 'Signup link has expired' };
    }

    // Check if max uses reached
    if (linkData.maxUses && linkData.currentUses >= linkData.maxUses) {
      return { isValid: false, error: 'Signup link has reached maximum uses' };
    }

    return {
      isValid: true,
      batchYear: linkData.batchYear,
      linkId: linkDoc.id
    };
  } catch (error) {
    console.error('Error validating signup token:', error);
    return { isValid: false, error: 'Error validating signup link' };
  }
}

/**
 * Check if batch signup is active
 */
export async function isBatchSignupActive(batchYear: number): Promise<boolean> {
  try {
    const batchDocRef = doc(db, 'signup', batchYear.toString());
    const batchDoc = await getDoc(batchDocRef);
    
    if (!batchDoc.exists()) {
      return false;
    }
    
    const batchData = batchDoc.data() as BatchSignupConfig;
    return batchData.active === true;
  } catch (error) {
    console.error('Error checking batch signup status:', error);
    return false;
  }
}

/**
 * Get batch signup configuration
 */
export async function getBatchSignupConfig(batchYear: number): Promise<BatchSignupConfig | null> {
  try {
    const batchDocRef = doc(db, 'signup', batchYear.toString());
    const batchDoc = await getDoc(batchDocRef);
    
    if (!batchDoc.exists()) {
      return null;
    }
    
    return { id: batchDoc.id, ...batchDoc.data() } as BatchSignupConfig;
  } catch (error) {
    console.error('Error getting batch signup config:', error);
    return null;
  }
}

/**
 * Create or update batch signup configuration (for admin use)
 */
export async function createOrUpdateBatchConfig(
  batchYear: number,
  adminUserId: string,
  options: {
    active?: boolean;
    maxRegistrations?: number;
    description?: string;
    notes?: string;
  } = {}
): Promise<void> {
  try {
    const batchDocRef = doc(db, 'signup', batchYear.toString());
    const existingDoc = await getDoc(batchDocRef);
    
    if (existingDoc.exists()) {
      // Update existing configuration
      const updateData: Partial<BatchSignupConfig> = {};
      
      if (options.active !== undefined) {
        updateData.active = options.active;
        if (options.active) {
          updateData.activatedAt = Timestamp.now();
        } else {
          updateData.deactivatedAt = Timestamp.now();
        }
      }
      
      if (options.maxRegistrations !== undefined) {
        updateData.maxRegistrations = options.maxRegistrations;
      }
      
      if (options.description !== undefined) {
        updateData.description = options.description;
      }
      
      if (options.notes !== undefined) {
        updateData.notes = options.notes;
      }
      
      await updateDoc(batchDocRef, updateData);
    } else {
      // Create new configuration
      const batchData: Omit<BatchSignupConfig, 'id'> = {
        batchYear,
        active: options.active ?? true,
        createdAt: Timestamp.now(),
        createdBy: adminUserId,
        currentRegistrations: 0,
        maxRegistrations: options.maxRegistrations,
        description: options.description,
        notes: options.notes
      };
      
      if (options.active !== false) {
        batchData.activatedAt = Timestamp.now();
      }
      
      await setDoc(batchDocRef, batchData);
    }
  } catch (error) {
    console.error('Error creating/updating batch config:', error);
    throw error;
  }
}

/**
 * Get the collection path for registrations in a specific batch
 */
export function getBatchRegistrationsPath(batchYear: number): string {
  return `signup/${batchYear}`;
}

/**
 * Increment registration count for a batch
 */
export async function incrementBatchRegistrationCount(batchYear: number): Promise<void> {
  try {
    const batchDocRef = doc(db, 'signup', batchYear.toString());
    await updateDoc(batchDocRef, {
      currentRegistrations: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing batch registration count:', error);
    throw error;
  }
}

/**
 * Format signup link for display
 */
export function formatSignupLinkForDisplay(
  batchYear: number,
  token?: string,
  baseUrl: string = window.location.origin
): string {
  if (token) {
    return createTokenSignupLink(token, baseUrl);
  }
  return createBatchSignupLink(batchYear, baseUrl);
}