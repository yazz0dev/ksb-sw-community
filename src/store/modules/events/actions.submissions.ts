// src/store/modules/events/actions.submissions.ts
import { ActionContext } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/types/store';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, Submission } from '@/types/event';
import { User } from '@/types/user';

export async function submitProjectToEvent({ rootGetters, dispatch }: ActionContext<EventState, RootState>, { eventId, submissionData }: { eventId: string; submissionData: Partial<Submission> }): Promise<void> {
    if (!submissionData?.projectName?.trim()) throw new Error("Project Name required.");
    if (!submissionData?.link?.trim()) throw new Error("Project Link required.");
    if (!submissionData.link.startsWith('http://') && !submissionData.link.startsWith('https://')) throw new Error("Invalid URL.");
    const eventRef = doc(db, 'events', eventId);
    try {
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) throw new Error('Event not found.');
        const eventData = eventSnap.data() as Event;
        const currentUser: User | null = rootGetters['user/getUser'];
        const userId = currentUser?.uid;
        if (!userId) throw new Error("User not authenticated.");
        let updatedEventDataForState: any = { ...eventData };
        // Add to submissions
        const submissionEntry = { ...submissionData, submittedBy: userId, submittedAt: Timestamp.now() };
        if (Array.isArray(eventData.submissions)) {
            updatedEventDataForState.submissions = [...eventData.submissions, submissionEntry];
        } else {
            updatedEventDataForState.submissions = [submissionEntry];
        }
        await updateDoc(eventRef, { submissions: arrayUnion(submissionEntry), lastUpdatedAt: Timestamp.now() });
        const freshSnap = await getDoc(eventRef);
        updatedEventDataForState.submissions = freshSnap.exists() ? (freshSnap.data() as Event).submissions : [];
        dispatch('updateLocalEvent', { id: eventId, changes: updatedEventDataForState });
    } catch (error: any) {
        throw error;
    }
}

