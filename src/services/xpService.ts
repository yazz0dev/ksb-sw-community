import { doc, writeBatch, increment, Timestamp, type WriteBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import type { XPData, XpFirestoreFieldKey } from '@/types/xp'; // Assuming types are here

// Helper to get current Firestore Timestamp, similar to createTimestamp in stores
const now = () => Timestamp.now();

/**
 * Applies XP awards to student profiles using a Firestore batch write.
 *
 * @param xpChangesMap - A map where keys are student IDs and values are objects
 *                       containing XP field increments (e.g., { xp_participation: 10, count_wins: 1 }).
 * @returns The Firestore WriteBatch instance (note: it will be already committed by this function).
 * @throws Throws an error if the batch write fails.
 */
export const applyXpAwardsBatch = async (
  xpChangesMap: Record<string, Partial<Pick<XPData, XpFirestoreFieldKey | 'count_wins' | 'totalCalculatedXp'>>>
): Promise<WriteBatch> => {
  if (Object.keys(xpChangesMap).length === 0) {
    // No XP changes to apply, can return early or an empty batch
    // For now, let's proceed and Firestore will handle an empty batch if it occurs,
    // though typically this means no users earned XP.
  }

  const batch = writeBatch(db);
  let operationsInBatch = 0;

  for (const [userId, xpIncrements] of Object.entries(xpChangesMap)) {
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
    if (operationsInBatch > 0) {
        await batch.commit();
    }
    // Even if no operations, returning the batch object might be consistent for callers
    // though it won't have done anything.
    return batch; 
  } catch (error) {
    console.error("Error committing XP awards batch:", error);
    // Re-throw to allow the calling service/store to handle it
    throw new Error(`Failed to apply XP awards: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 