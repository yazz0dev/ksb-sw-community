import { doc, writeBatch, increment, Timestamp, type WriteBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import type { XPData, XpFirestoreFieldKey } from '@/types/xp';

// Helper to get current Firestore Timestamp, similar to createTimestamp in stores
const now = () => Timestamp.now();

/**
 * Type for XP field updates when awarding XP
 * This defines what XP fields can be incremented in a batch operation
 */
export type XpFieldUpdates = Partial<Pick<XPData, XpFirestoreFieldKey | 'count_wins' | 'totalCalculatedXp'>>;

/**
 * Applies XP awards to student profiles using a Firestore batch write.
 *
 * @param xpChangesMap - A map where keys are student IDs and values are XP field increments
 * @param options - Additional options for the batch operation
 * @returns The Firestore WriteBatch instance (will already be committed)
 * @throws Error if the batch write fails
 */
export const applyXpAwardsBatch = async (
  xpChangesMap: Record<string, XpFieldUpdates>,
  options: { skipCommit?: boolean } = {}
): Promise<WriteBatch> => {
  if (Object.keys(xpChangesMap).length === 0) {
    console.info('No XP changes to apply');
    return writeBatch(db); // Return empty batch
  }

  const batch = writeBatch(db);
  let operationsInBatch = 0;

  for (const [userId, xpIncrements] of Object.entries(xpChangesMap)) {
    if (!userId) {
      console.warn('Skipping XP update for empty user ID');
      continue;
    }
    
    const xpDocRef = doc(db, 'xp', userId);
    const updatePayload: Record<string, any> = { lastUpdatedAt: now() };
    let userHasUpdates = false;

    for (const key in xpIncrements) {
      if (key.startsWith('xp_') || key === 'count_wins' || key === 'totalCalculatedXp') {
        const typedKey = key as keyof typeof xpIncrements;
        const incrementValue = xpIncrements[typedKey];
        if (typeof incrementValue === 'number' && incrementValue !== 0) {
          updatePayload[key] = increment(incrementValue);
          userHasUpdates = true;
        }
      }
    }

    // Only add to batch if there are actual increments for the user
    if (userHasUpdates) {
      batch.set(xpDocRef, updatePayload, { merge: true });
      operationsInBatch++;
    }
  }

  try {
    if (operationsInBatch > 0 && !options.skipCommit) {
      await batch.commit();
      console.info(`Successfully applied XP updates for ${operationsInBatch} users`);
    }
    return batch; 
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to apply XP awards: ${errorMessage}`, error);
    throw new Error(`Failed to apply XP awards: ${errorMessage}`);
  }
};

/**
 * Creates an XP update object for a single role
 * @param role The XP role to update
 * @param amount The amount to increment
 * @returns An XpFieldUpdates object with the role and total XP updated
 */
export function createXpUpdate(role: XpFirestoreFieldKey, amount: number): XpFieldUpdates {
  if (amount <= 0) {
    console.warn(`Ignoring non-positive XP amount: ${amount} for role: ${role}`);
    return {};
  }
  
  return {
    [role]: amount,
    totalCalculatedXp: amount // Also update the total
  };
}