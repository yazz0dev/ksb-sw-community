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
import { getAuth } from 'firebase/auth';
import { db } from '@/firebase';
import type { EnrichedStudentData, UserData, NameCacheEntry } from '@/types/student';
import type { XPData } from '@/types/xp';
import { getDefaultXPData, XP_COLLECTION_PATH } from '@/types/xp';
import { deepClone } from '@/utils/helpers';
import { Event, EventFormat, EventStatus } from '@/types/event';
import type { StudentPortfolioProject, StudentEventHistoryItem } from '@/types/student';

const STUDENT_COLLECTION_PATH = 'students'; // Define if not already defined at service level
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

    const enrichedData: EnrichedStudentData = {
      uid: studentData.uid,
      name: studentData.name ?? null,
      email: studentData.email ?? null,
      studentId: studentData.studentId,
      batchYear: studentData.batchYear,
      batch: studentData.batch,
      photoURL: studentData.photoURL ?? null,
      bio: studentData.bio,
      skills: studentData.skills,
      hasLaptop: studentData.hasLaptop,
      socialLinks: studentData.socialLinks,
      participatedEventIDs: studentData.participatedEventIDs,
      organizedEventIDs: studentData.organizedEventIDs,
      xpData: deepClone(xpData)
    };
    return enrichedData;
  } catch (err) {
    console.error(`Error fetching student data for UID ${uid}:`, err);
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
    // Ensure the current user is authenticated
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('You must be authenticated to update your profile');
    }

    // Error('User ID is required for profile updates');
    if (!uid) {
      throw new Error('User ID is required for profile updates');
    }

    if (auth.currentUser.uid !== uid) {
      throw new Error('You do not have permission to update this profile. Please try logging out and back in.');
    }

    const studentRef = doc(db, 'students', uid);
    const dataToUpdate = { ...updates, lastUpdatedAt: now() };
    await updateDoc(studentRef, dataToUpdate);
  } catch (err: any) {
    // More specific error handling for permission issues
    if (err.code === 'permission-denied') {
      throw new Error('You do not have permission to update this profile. Please try logging out and back in.');
    } else {
      console.error("Error updating student profile:", err);
      throw err;
    }
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

/**
 * Fetch all data required for the leaderboard (all students and their XP).
 * @returns Promise that resolves with an array of EnrichedStudentData.
 */
export const fetchLeaderboardData = async (): Promise<EnrichedStudentData[]> => {
  try {
    const studentsCollectionRef = collection(db, STUDENT_COLLECTION_PATH);
    const studentsSnapshot = await getDocs(studentsCollectionRef);
    
    if (studentsSnapshot.empty) {
      return []; // No students found
    }

    const leaderboardUsersPromises = studentsSnapshot.docs.map(async (studentDoc) => {
      const studentData = { uid: studentDoc.id, ...studentDoc.data() } as UserData;
      const xpDocRef = doc(db, XP_COLLECTION_PATH, studentDoc.id);
      const xpSnap = await getDoc(xpDocRef);
      const xpData = xpSnap.exists()
        ? ({ uid: xpSnap.id, ...xpSnap.data() } as XPData)
        : getDefaultXPData(studentDoc.id);

      // Construct EnrichedStudentData carefully, similar to fetchStudentData
      return {
        uid: studentData.uid,
        name: studentData.name ?? null,
        email: studentData.email ?? null,
        studentId: studentData.studentId,
        batchYear: studentData.batchYear,
        batch: studentData.batch,
        photoURL: studentData.photoURL ?? null,
        bio: studentData.bio,
        skills: studentData.skills,
        hasLaptop: studentData.hasLaptop,
        socialLinks: studentData.socialLinks,
        participatedEventIDs: studentData.participatedEventIDs,
        organizedEventIDs: studentData.organizedEventIDs,
        xpData: deepClone(xpData)
      } as EnrichedStudentData;
    });

    const enrichedUsers = await Promise.all(leaderboardUsersPromises);
    return enrichedUsers;
  } catch (err) {
    console.error("Error fetching leaderboard data:", err);
    throw err; // Re-throw for the store to handle
  }
};

/**
/**
 * Fetch student's projects for portfolio display based on event participation.
 * @param targetStudentId The UID of the student.
 * @param participatedEventIDs Array of event IDs the student participated in.
 * @param organizedEventIDs Array of event IDs the student organized.
 * @returns Promise that resolves with an array of StudentPortfolioProject.
 */
export const fetchStudentPortfolioProjects = async (
  targetStudentId: string,
  participatedEventIDs?: string[],
  organizedEventIDs?: string[]
): Promise<StudentPortfolioProject[]> => {
  const relevantEventIds = [...new Set([...(participatedEventIDs || []), ...(organizedEventIDs || [])])].filter(Boolean);
  if (relevantEventIds.length === 0) return [];
  
  try {
    const projects: StudentPortfolioProject[] = [];
    // Firestore 'in' query supports up to 30 elements in the array, so batch if necessary.
    // The original code used 30, so we will stick to that.
    for (let i = 0; i < relevantEventIds.length; i += 30) {
        const batchIds = relevantEventIds.slice(i, i + 30);
        if (batchIds.length === 0) continue;
        
        const eventQuery = query(collection(db, "events"), where(documentId(), 'in', batchIds));
        const eventSnapshot = await getDocs(eventQuery);
        
        eventSnapshot.forEach(eventDoc => {
            const event = eventDoc.data() as Event; // Assuming Event type is correctly defined and imported
            (event.submissions || []).forEach(sub => {
                let isRelevantSubmission = sub.submittedBy === targetStudentId;
                // If it's a team event, check if the student was part of the submitting team
                if (event.details.format === EventFormat.Team && sub.teamName) {
                    const team = event.teams?.find(t => t.teamName === sub.teamName);
                    if (team?.members.includes(targetStudentId)) {
                        isRelevantSubmission = true;
                    }
                }
                if (isRelevantSubmission) {
                    projects.push({
                        id: `${event.id}-${sub.projectName.replace(/\s+/g, '-')}`,
                        eventId: event.id,
                        eventName: event.details.eventName,
                        projectName: sub.projectName,
                        description: sub.description,
                        link: sub.link,
                        submittedAt: sub.submittedAt, // This will be Firestore Timestamp or undefined
                        eventFormat: event.details.format,
                        submittedBy: sub.submittedBy
                    });
                }
            });
        });
    }
    // Sort projects by submission date, newest first
    return projects.sort((a, b) =>
        (b.submittedAt instanceof Timestamp ? b.submittedAt.toMillis() : 0) -
        (a.submittedAt instanceof Timestamp ? a.submittedAt.toMillis() : 0)
    );
  } catch (error) {
    console.error(`Error fetching portfolio projects for ${targetStudentId}:`, error);
    throw error;
  }
};

/**
 * Fetch student's event history for display.
 * @param targetStudentId The UID of the student.
 * @param participatedEventIDs Array of event IDs the student participated in.
 * @param organizedEventIDs Array of event IDs the student organized.
 * @returns Promise that resolves with an array of StudentEventHistoryItem.
 */
export const fetchStudentEventHistory = async (
  targetStudentId: string,
  participatedEventIDs?: string[],
  organizedEventIDs?: string[]
): Promise<StudentEventHistoryItem[]> => {
  const relevantEventIds = [...new Set([...(participatedEventIDs || []), ...(organizedEventIDs || [])])].filter(Boolean);
  if (relevantEventIds.length === 0) return [];
  
  try {
    const history: StudentEventHistoryItem[] = [];
    // Batching for Firestore 'in' query (max 30 per query)
    for (let i = 0; i < relevantEventIds.length; i += 30) {
        const batchIds = relevantEventIds.slice(i, i + 30);
        if (batchIds.length === 0) continue;
        
        const eventQuery = query(collection(db, "events"), where(documentId(), 'in', batchIds));
        const eventSnapshot = await getDocs(eventQuery);
        
        eventSnapshot.forEach(eventDoc => {
            const event = eventDoc.data() as Event;
            // Include event if it's not in a preliminary/rejected state, OR if the student requested it (even if pending/rejected)
            if (![EventStatus.Pending, EventStatus.Rejected, EventStatus.Cancelled].includes(event.status as EventStatus) || 
                event.requestedBy === targetStudentId
            ) {
                let roleInEvent: StudentEventHistoryItem['roleInEvent'] = 'participant'; // Default role
                if (event.details.organizers?.includes(targetStudentId)) {
                    roleInEvent = 'organizer';
                } else if (event.details.format === EventFormat.Team) {
                    const team = event.teams?.find(t => t.members.includes(targetStudentId));
                    if (team) {
                        roleInEvent = team.teamLead === targetStudentId ? 'team_lead' : 'team_member';
                    }
                }
                // If still 'participant', ensure they were actually a participant if participants list exists and is used
                // This part of logic might need refinement based on how participation is tracked (e.g. explicit participants array vs. submission)
                // For now, if not organizer or specific team role, default to participant if they were involved.
                
                history.push({
                    eventId: event.id,
                    eventName: event.details.eventName,
                    eventStatus: event.status,
                    eventFormat: event.details.format,
                    roleInEvent,
                    date: event.details.date // This is EventDateRange { start: Timestamp, end?: Timestamp }
                });
            }
        });
    }
    // Sort history by event start date, newest first
    return history.sort((a, b) =>
        (b.date.start instanceof Timestamp ? b.date.start.toMillis() : 0) -
        (a.date.start instanceof Timestamp ? a.date.start.toMillis() : 0)
    );
  } catch (error) {
    console.error(`Error fetching event history for ${targetStudentId}:`, error);
    throw error;
  }
};

/**
 * Calculates the count of valid event participations for a student.
 * @param participatedEventIDs Array of event IDs the student is marked as having participated in.
 * @returns Promise that resolves with the count of valid participations.
 */
export const fetchStudentEventParticipationCount = async (
  participatedEventIDs?: string[]
): Promise<number> => {
  if (!participatedEventIDs || participatedEventIDs.length === 0) {
    return 0;
  }
  
  let validParticipationCount = 0;
  try {
    // Firestore 'in' query limit is 30; batching if necessary.
    for (let i = 0; i < participatedEventIDs.length; i += 30) {
      const batchIds = participatedEventIDs.slice(i, i + 30);
      if (batchIds.length === 0) continue;

      const eventQuery = query(collection(db, "events"), where(documentId(), 'in', batchIds));
      const eventSnapshot = await getDocs(eventQuery);
      
      eventSnapshot.forEach(eventDoc => {
        const event = eventDoc.data() as Event; // Assuming Event type includes 'status'
        // Count as valid if the event status is not Cancelled, Rejected, or Pending
        if (![EventStatus.Cancelled, EventStatus.Rejected, EventStatus.Pending].includes(event.status as EventStatus)) {
          validParticipationCount++;
        }
      });
    }
    return validParticipationCount;
  } catch (error) {
    console.error("Error fetching student event participation count:", error);
    throw error; // Re-throw for the store/caller to handle
  }
};
