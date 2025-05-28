import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  documentId, 
  updateDoc, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { EnrichedStudentData, UserData, NameCacheEntry } from '@/types/student';
import type { XPData } from '@/types/xp';
import { getDefaultXPData, XP_COLLECTION_PATH } from '@/types/xp';
import { deepClone } from '@/utils/helpers';

const now = () => Timestamp.now();

/**
 * Fetch a student's profile data
 * @param uid Student's UID
 * @returns Promise that resolves with the student data or null
 */
export const fetchStudentData = async (uid: string): Promise<EnrichedStudentData | null> => {
  try {
    const studentDocRef = doc(db, 'students', uid);
    const xpDocRef = doc(db, XP_COLLECTION_PATH, uid);

    const [studentSnap, xpSnap] = await Promise.all([
      getDoc(studentDocRef),
      getDoc(xpDocRef)
    ]);

    if (!studentSnap.exists()) {
      console.warn(`Student profile for UID ${uid} not found in Firestore 'students' collection.`);
      return null;
    }

    const studentDocData = studentSnap.data();
    const studentData = { uid: studentSnap.id, ...studentDocData } as UserData;
    const xpData = xpSnap.exists() ? { uid: xpSnap.id, ...xpSnap.data() } as XPData : getDefaultXPData(uid);

    return {
      ...studentData,
      name: studentData.name ?? null,
      email: studentData.email ?? null,
      batchYear: studentDocData?.batchYear ?? 0,
      xpData: deepClone(xpData)
    };
  } catch (err) {
    console.error("Error fetching student data:", err);
    throw err;
  }
};

/**
 * Update a student's profile
 * @param uid Student's UID
 * @param updates Profile updates
 * @returns Promise that resolves when update is complete
 */
export const updateStudentProfile = async (
  uid: string,
  updates: Partial<Omit<UserData, 'uid' | 'email' | 'batchYear' | 'createdAt' | 'participatedEventIDs' | 'organizedEventIDs'>>
): Promise<void> => {
  try {
    const studentRef = doc(db, 'students', uid);
    const dataToUpdate = { ...updates, lastUpdatedAt: now() };
    await updateDoc(studentRef, dataToUpdate);
  } catch (err) {
    console.error("Error updating student profile:", err);
    throw err;
  }
};

/**
 * Fetch multiple user names by their UIDs
 * @param uids Array of user UIDs
 * @returns Promise that resolves with a map of UIDs to names
 */
export const fetchUserNamesBatch = async (uids: string[]): Promise<Record<string, string>> => {
  const uniqueUids = [...new Set(uids.filter(Boolean))];
  const namesMap: Record<string, string> = {};
  
  if (uniqueUids.length === 0) {
    return namesMap;
  }
  
  try {
    for (let i = 0; i < uniqueUids.length; i += 30) {
      const batchIds = uniqueUids.slice(i, i + 30);
      if (batchIds.length === 0) continue;
      
      const usersRef = collection(db, 'students');
      const q = query(usersRef, where(documentId(), 'in', batchIds));
      const snapshot = await getDocs(q);
      
      snapshot.forEach(docSnap => {
        const nameVal = docSnap.data()?.name || `Student (${docSnap.id.substring(0, 5)})`;
        namesMap[docSnap.id] = nameVal;
      });
    }
    
    // Add placeholders for missing IDs
    uniqueUids.forEach(id => {
      if (!namesMap[id]) {
        namesMap[id] = `Student (${id.substring(0, 5)})`;
      }
    });
    
    return namesMap;
  } catch (err) {
    console.error("Error fetching user names batch:", err);
    throw err;
  }
};

/**
 * Fetch all student profiles
 * @returns Promise that resolves with an array of user data
 */
export const fetchAllStudentProfiles = async (): Promise<UserData[]> => {
  try {
    const studentsCollectionRef = collection(db, 'students');
    const q = query(studentsCollectionRef, orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const fetchedUsers: UserData[] = [];
    querySnapshot.forEach((docSnap) => {
      const userData = { uid: docSnap.id, ...docSnap.data() } as UserData;
      fetchedUsers.push(userData);
    });
    
    return fetchedUsers;
  } catch (err) {
    console.error("Error fetching all student profiles:", err);
    throw err;
  }
};
