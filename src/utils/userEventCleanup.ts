// Utility to remove an eventId from all users' participatedEvent and organizedEvent arrays
import { db } from '@/firebase';
import { collection, getDocs, query, where, writeBatch, arrayRemove } from 'firebase/firestore';

/**
 * Removes the given eventId from all users' participatedEvent and organizedEvent arrays in Firestore
 */
export async function removeEventIdFromUsers(eventId: string): Promise<void> {
    if (!eventId) return;
    const usersRef = collection(db, 'users');
    // Query users who have this eventId in either array
    const q = query(usersRef, where('participatedEvent', 'array-contains', eventId));
    const q2 = query(usersRef, where('organizedEvent', 'array-contains', eventId));
    const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(q2)]);
    const affectedDocs = new Map();
    snap1.forEach(docSnap => affectedDocs.set(docSnap.id, docSnap.ref));
    snap2.forEach(docSnap => affectedDocs.set(docSnap.id, docSnap.ref));
    if (affectedDocs.size === 0) return;
    const batch = writeBatch(db);
    affectedDocs.forEach(ref => {
        batch.update(ref, {
            participatedEvent: arrayRemove(eventId),
            organizedEvent: arrayRemove(eventId),
        });
    });
    await batch.commit();
}
