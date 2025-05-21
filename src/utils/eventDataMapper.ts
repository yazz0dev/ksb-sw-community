// src/utils/eventDataMapper.ts
import { Timestamp, DocumentData } from 'firebase/firestore';
import {
    Event,
    EventStatus,
    EventFormat,
    EventCriteria,
    Team,
    Submission,
    OrganizerRating,
    WinnerInfo,
    GalleryItem
} from '@/types/event'; // Removed EventDetails, EventDate

// Helper function to convert JS Date or ISO string to Firestore Timestamp in IST
const getISTTimestamp = (dateInput: Date | string | Timestamp | { seconds: number, nanoseconds: number } | null | undefined): Timestamp | null => {
    if (!dateInput) return null;
    if (dateInput instanceof Timestamp) return dateInput;

    // Handle plain objects that look like Firestore Timestamps (from JSON.parse(JSON.stringify(timestamp)))
    if (typeof dateInput === 'object' && 'seconds' in dateInput && 'nanoseconds' in dateInput && !(dateInput instanceof Date)) {
        return new Timestamp(dateInput.seconds, dateInput.nanoseconds);
    }

    let dt: DateTime;
    if (dateInput instanceof Date) {
        dt = DateTime.fromJSDate(dateInput);
    } else if (typeof dateInput === 'string') {
        // Try to parse as ISO, if it fails, it might be a different format or invalid
        dt = DateTime.fromISO(dateInput);
        if (!dt.isValid) {
            // Attempt to parse common non-ISO formats if necessary, or throw error
            console.warn(`Invalid ISO string for date: ${dateInput}`);
            return null; // Or handle error appropriately
        }
    } else {
        console.warn(`Unsupported date input type: ${typeof dateInput}`);
        return null;
    }

    // Assuming you want to store in UTC, but ensure consistency.
    // If you specifically need to convert to IST and then to Timestamp:
    // dt = dt.setZone('Asia/Kolkata');
    // return Timestamp.fromDate(dt.toJSDate());
    // For now, let's assume the DateTime object is in the correct zone or UTC.
    return Timestamp.fromDate(dt.toJSDate());
};

// Maps the application's Event object structure to a Firestore-compatible structure.
export function mapEventDataToFirestore(eventData: Partial<Event>): Record<string, any> {
    const firestoreData: Record<string, any> = {};

    // Map top-level Event properties
    if (eventData.id) firestoreData.id = eventData.id; // Usually not needed for add/update directly
    firestoreData.status = eventData.status || EventStatus.Pending;
    firestoreData.requestedBy = eventData.requestedBy || null;
    firestoreData.votingOpen = typeof eventData.votingOpen === 'boolean' ? eventData.votingOpen : false;
    
    firestoreData.createdAt = getISTTimestamp(eventData.createdAt) || Timestamp.now(); // Default to now if not provided
    firestoreData.lastUpdatedAt = Timestamp.now(); // Always set on map
    
    if (eventData.completedAt) firestoreData.completedAt = getISTTimestamp(eventData.completedAt);
    if (eventData.closedAt) firestoreData.closedAt = getISTTimestamp(eventData.closedAt);
    
    firestoreData.criteria = Array.isArray(eventData.criteria) ? eventData.criteria : [];
    firestoreData.teams = Array.isArray(eventData.teams) ? eventData.teams : [];
    firestoreData.participants = Array.isArray(eventData.participants) ? eventData.participants : [];
    firestoreData.submissions = Array.isArray(eventData.submissions) ? eventData.submissions : [];
    firestoreData.organizerRating = Array.isArray(eventData.organizerRating) ? eventData.organizerRating : [];
    firestoreData.bestPerformerSelections = typeof eventData.bestPerformerSelections === 'object' ? eventData.bestPerformerSelections : {};
    if (eventData.rejectionReason) firestoreData.rejectionReason = eventData.rejectionReason;


    // Map nested EventDetails
    const details: Partial<EventDetails> = eventData.details || {};
    const firestoreDetails: Record<string, any> = {};

    firestoreDetails.name = details.name || '';
    firestoreDetails.description = details.description || '';
    firestoreDetails.bannerUrl = details.bannerUrl || null;
    firestoreDetails.location = details.location || null;
    firestoreDetails.format = details.format || EventFormat.Individual;
    
    const eventDate: Partial<EventDate> = details.date || {};
    firestoreDetails.date = {
        start: getISTTimestamp(eventDate.start),
        end: getISTTimestamp(eventDate.end)
    };
    
    firestoreDetails.organizers = Array.isArray(details.organizers) ? details.organizers : [];
    firestoreDetails.tags = Array.isArray(details.tags) ? details.tags : [];
    
    firestoreData.details = firestoreDetails;

    return firestoreData;
}

// Maps Firestore document data to the application's Event object structure.
// (This is similar to what's now in actions.fetching.ts, consider consolidating or ensuring consistency)
export function mapFirestoreToEventData(docId: string, firestoreData: Record<string, any>): Event {
    const detailsData = firestoreData.details || {};
    const dateData = detailsData.date || {};

    const eventDetails: EventDetails = {
        name: detailsData.name || '',
        description: detailsData.description || '',
        bannerUrl: detailsData.bannerUrl || null,
        location: detailsData.location || null,
        format: (detailsData.format || EventFormat.Individual) as EventFormat,
        date: {
            start: dateData.start instanceof Timestamp ? dateData.start : null,
            end: dateData.end instanceof Timestamp ? dateData.end : null,
        } as EventDate,
        organizers: Array.isArray(detailsData.organizers) ? detailsData.organizers : [],
        tags: Array.isArray(detailsData.tags) ? detailsData.tags : [],
    };

    // --- CRITERIA MAPPING (Array of Objects) ---
    const criteria: EventCriteria[] = Array.isArray(firestoreData.criteria) ? firestoreData.criteria.map((crit: any, index: number) => ({
        constraintIndex: typeof crit.constraintIndex === 'number' ? crit.constraintIndex : index,
        constraintLabel: crit.constraintLabel || `Criterion ${index + 1}`,
        constraintKey: crit.constraintKey || `criterion_${index + 1}`, // Ensure constraintKey
        xpValue: typeof crit.xpValue === 'number' ? crit.xpValue : (typeof crit.points === 'number' ? crit.points : 0), // Handle old 'points' field
        roleKey: crit.roleKey || crit.role || null, // Handle old 'role' field
        targetRole: crit.targetRole || null,
        votes: typeof crit.votes === 'object' && crit.votes !== null ? crit.votes : (typeof crit.criteriaSelections === 'object' && crit.criteriaSelections !== null ? crit.criteriaSelections : {}), // Handle old 'criteriaSelections'
    })) : [];

    // --- TEAMS MAPPING (Array of Objects) ---
    const teams: Team[] = Array.isArray(firestoreData.teams) ? firestoreData.teams.map((team: any) => ({
        id: team.id || null,
        teamName: team.teamName || 'Unnamed Team',
        members: Array.isArray(team.members) ? team.members.filter((m: any) => typeof m === 'string') : [],
        teamLead: team.teamLead || null,
    })) : [];
    
    // --- TEAM MEMBERS FLAT LIST ---
    // Consolidate all unique member UIDs from all teams for easier lookup/filtering
    const teamMembersFlat: string[] = teams.reduce((acc: string[], team: Team) => {
        team.members.forEach(memberId => {
            if (!acc.includes(memberId)) {
                acc.push(memberId);
            }
        });
        return acc;
    }, []);


    // --- SUBMISSIONS MAPPING (Array of Objects) ---
    const submissions: Submission[] = Array.isArray(firestoreData.submissions) ? firestoreData.submissions.map((sub: any) => ({
        projectName: sub.projectName || 'Untitled Project',
        link: sub.link || '#',
        submittedBy: sub.submittedBy || null,
        submittedAt: sub.submittedAt instanceof Timestamp ? sub.submittedAt : Timestamp.now(), // Default to now if invalid
        description: sub.description || null,
        participantId: sub.participantId || null,
        teamId: sub.teamId || null,
    })) : [];

    // --- ORGANIZER RATING MAPPING (Array of Objects) ---
    const organizerRating: OrganizerRating[] = Array.isArray(firestoreData.organizerRating) ? firestoreData.organizerRating.map((rating: any) => ({
        userId: rating.userId || null,
        score: typeof rating.score === 'number' ? rating.score : (typeof rating.rating === 'number' ? rating.rating : 0), // Handle old 'rating' field
        feedback: rating.feedback || null,
    })) : [];

    // --- WINNERS MAPPING (Object) ---
    // Winners structure is Record<string, string[]> or Record<string, string>
    // No complex mapping needed if structure is consistent, but ensure it's an object.
    const winners: WinnerInfo | undefined = typeof firestoreData.winners === 'object' && firestoreData.winners !== null ? firestoreData.winners : undefined;

    // --- GALLERY MAPPING (Array of Objects) ---
    const gallery: GalleryItem[] = Array.isArray(firestoreData.gallery) ? firestoreData.gallery.map((item: any) => ({
        url: item.url || '#',
        addedBy: item.addedBy || null,
        description: item.description || null,
    })) : [];

    // --- Construct the Event Object ---
    const event: Event = {
        id: docId,
        details: eventDetails,
        status: (firestoreData.status || EventStatus.Pending) as EventStatus,
        requestedBy: firestoreData.requestedBy || '',
        votingOpen: typeof firestoreData.votingOpen === 'boolean' ? firestoreData.votingOpen : false,
        createdAt: firestoreData.createdAt instanceof Timestamp ? firestoreData.createdAt : null,
        lastUpdatedAt: firestoreData.lastUpdatedAt instanceof Timestamp ? firestoreData.lastUpdatedAt : null,
        completedAt: firestoreData.completedAt instanceof Timestamp ? firestoreData.completedAt : null,
        closedAt: firestoreData.closedAt instanceof Timestamp ? firestoreData.closedAt : null,
        criteria: (Array.isArray(firestoreData.criteria) ? firestoreData.criteria : []) as EventCriteria[],
        teams: (Array.isArray(firestoreData.teams) ? firestoreData.teams : []) as Team[],
        participants: (Array.isArray(firestoreData.participants) ? firestoreData.participants : []) as string[],
        submissions: (Array.isArray(firestoreData.submissions) ? firestoreData.submissions : []) as Submission[],
        organizerRating: (Array.isArray(firestoreData.organizerRating) ? firestoreData.organizerRating : []) as OrganizerRating[],
        bestPerformerSelections: (typeof firestoreData.bestPerformerSelections === 'object' && firestoreData.bestPerformerSelections !== null ? firestoreData.bestPerformerSelections : {}) as Record<string, string>,
        rejectionReason: firestoreData.rejectionReason || null,
    };

    return event;
}
