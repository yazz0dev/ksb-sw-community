// src/store/modules/events/actions.validation.ts
import { ActionContext } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/types/store';
import { getDocs, Timestamp, collection, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { Event, EventStatus } from '@/types/event';
import { User } from '@/types/user';
import { DateTime } from 'luxon';

export async function checkExistingRequests({ rootGetters }: ActionContext<EventState, RootState>): Promise<boolean> {
    const currentUser: User | null = rootGetters['user/getUser'];
    if (!currentUser?.uid) return false;

    const q = query(
        collection(db, 'events'),
        where('requestedBy', '==', currentUser.uid),
        where('status', 'in', [EventStatus.Pending, EventStatus.Approved, EventStatus.InProgress])
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}


export async function checkDateConflict(_: ActionContext<EventState, RootState>, { startDate, endDate, excludeEventId = null }: {
    startDate: Date | string | Timestamp;
    endDate: Date | string | Timestamp;
    excludeEventId?: string | null;
}): Promise<{ hasConflict: boolean; nextAvailableDate: Date | null; conflictingEvent: Event | null }> {
    let checkStartLuxon: DateTime, checkEndLuxon: DateTime;
    try {
        const convertToLuxon = (d: Date | string | Timestamp): DateTime => {
            let dt: DateTime;
            if (d instanceof Timestamp) dt = DateTime.fromJSDate(d.toDate());
            else if (d instanceof Date) dt = DateTime.fromJSDate(d);
            else dt = DateTime.fromISO(d);
            if (!dt.isValid) throw new Error(`Invalid date value: ${d}`);
            return dt.startOf('day');
        };
        checkStartLuxon = convertToLuxon(startDate);
        checkEndLuxon = convertToLuxon(endDate);
    } catch (e: any) {
        throw new Error('Invalid date(s) provided.');
    }
    const q = query(collection(db, 'events'), where('status', 'in', [EventStatus.Approved, EventStatus.InProgress]));
    const querySnapshot = await getDocs(q);
    let conflictingEvent: Event | null = null;
    for (const docSnap of querySnapshot.docs) {
        try {
            const event = docSnap.data() as Event;
            if (excludeEventId && event.id === excludeEventId) continue;
            const eventStart = event.details?.date?.start;
            const eventEnd = event.details?.date?.end;
            if (!eventStart || !eventEnd) continue;
            const eventStartLuxon = eventStart instanceof Timestamp ? DateTime.fromJSDate(eventStart.toDate()) : DateTime.fromISO(eventStart);
            const eventEndLuxon = eventEnd instanceof Timestamp ? DateTime.fromJSDate(eventEnd.toDate()) : DateTime.fromISO(eventEnd);
            const checkInterval = { start: checkStartLuxon, end: checkEndLuxon };
            const eventInterval = { start: eventStartLuxon, end: eventEndLuxon };
            // Overlap check
            if (checkInterval.start <= eventInterval.end && checkInterval.end >= eventInterval.start) {
                conflictingEvent = event;
                break;
            }
        } catch (dateError: any) {
            // skip event
        }
    }
    const nextAvailableDate = conflictingEvent?.details?.date?.end
        ? DateTime.fromJSDate(conflictingEvent.details.date.end.toDate()).plus({ days: 1 }).toJSDate()
        : null;
    return { hasConflict: !!conflictingEvent, nextAvailableDate, conflictingEvent };
}

export async function clearDateCheck({ commit }: ActionContext<EventState, RootState>) {
    console.log("Date check state cleared (if applicable).");
}
