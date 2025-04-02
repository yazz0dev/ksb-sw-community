// src/views/RequestEvent.vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router'; // Import useRoute
import { collection, getDocs, query, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import ManageTeamsComponent from '../components/ManageTeamsComponent.vue';

interface Student {
    uid: string;
    name: string;
    role: string;
}

interface TeamMember {
    teamName: string;
    members: string[];
    isNew: boolean;
    // Added optional fields that might exist when editing
    submissions?: any[];
    ratings?: any[];
}

// --- Core State ---
const isTeamEvent = ref<boolean>(false);

// --- Form Fields ---
const eventName = ref<string>('');
const eventType = ref<string>('Hackathon');
const description = ref<string>('');
const startDate = ref<string>(''); // Will hold start date for Admin, desired start date for User
const endDate = ref<string>(''); // Will hold end date for Admin, desired end date for User
const selectedOrganizers = ref<string[]>([]); // Renamed from selectedCoOrganizers

// --- Team Definition State ---
const teams = ref<TeamMember[]>([{
    teamName: '',
    members: [],
    isNew: true
}]);

// --- Organizer/Student State ---
const availableStudents = ref<Student[]>([]);
const studentNameCache = ref<Record<string, string>>({});
const organizerSearch = ref<string>(''); // Keep for search input
const showOrganizerDropdown = ref<boolean>(false);

// --- General State ---
const store = useStore();
const router = useRouter();
const route = useRoute(); // Get route object
const errorMessage = ref<string>('');
const hasActiveRequest = ref<boolean>(false);
const loadingCheck = ref<boolean>(true);
const loadingStudents = ref<boolean>(true);
const isSubmitting = ref<boolean>(false);
const editingEventId = ref<string | null>(null); // To store the ID of the event being edited
const rejectionReason = ref<string | null>(null); // To store the rejection reason if editing a rejected event
const isLoadingEventData = ref<boolean>(false); // Loading state for fetching event data
const conflictingEventEndDate = ref<Date | null>(null); // NEW: Store end date of conflict
const isCheckingConflict = ref<boolean>(false); // <<< ADD THIS LINE BACK

// --- NEW: Event Category Lists ---
const teamEventCategories = [
    { value: 'Hackathon', label: 'Hackathon' },
    { value: 'Ideathon', label: 'Ideathon' },
    { value: 'Debate', label: 'Debate' },
    { value: 'Design Competition', label: 'Design Competition' },
    { value: 'Tech Business plan', label: 'Tech Business plan' },
    { value: 'Treasure hunt', label: 'Treasure hunt' },
    { value: 'Open Source', label: 'Open Source' },
    { value: 'Other', label: 'Other' }
];
const individualEventCategories = [
    { value: 'Topic Presentation', label: 'Topic Presentation' },
    { value: 'Debug competition', label: 'Debug competition' },
    { value: 'Discussion session', label: 'Discussion session' },
    { value: 'Testing', label: 'Testing' },
    { value: 'Hands-on Presentation', label: 'Hands-on Presentation' },
    { value: 'Quiz', label: 'Quiz' },
    { value: 'Program logic solver', label: 'Program logic solver' },
    { value: 'Google Search', label: 'Google Search' },
    { value: 'Typing competition', label: 'Typing competition' },
    { value: 'Algorithm writing', label: 'Algorithm writing' },
    { value: 'Other', label: 'Other' }
];

// --- Computed ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin' );
const minDate = computed(() => {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
});
const canAddMoreOrganizers = computed(() => selectedOrganizers.value.length < 5); // Updated limit
const totalAllocatedXp = computed(() => {
    return ratingCriteria.value.reduce((sum, criteria) => sum + (criteria.points || 0), 0);
});

// --- NEW: Computed property for available categories ---
const availableEventCategories = computed(() => {
    return isTeamEvent.value ? teamEventCategories : individualEventCategories;
});

// --- Rating Criteria State ---
const ratingCriteria = ref<{ label: string; role: string; points: number }[]>([
    { label: '', role: '', points: 5 } // Start with one empty constraint
]);
const defaultCriteriaLabels = [ 'Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology' ];
const availableRoles = [
    { value: 'fullstack', label: 'Full Stack Developer' },
    { value: 'presenter', label: 'Presenter' },
    { value: 'designer', label: 'Designer' },
    { value: 'problemSolver', label: 'Problem Solver' }
];

// --- Multi-step Form State ---
const currentStep = ref<number>(1);
const canAddTeam = ref<boolean>(true); // Track if new teams can be added
const dateErrorMessages = ref<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' }); // Reactive error messages
const isFindingNextDate = ref<boolean>(false); // Disable button while finding date

// --- Helper Functions ---
const getSubmitButtonText = () => {
    if (isSubmitting.value) return 'Submitting...';
    if (isTeamEvent.value && !hasValidTeams.value) return 'At least 2 teams required';
    if (selectedOrganizers.value.length === 0) return 'Organizer Required'; // Added organizer check
    if (isAdmin.value) return 'Create Event';
    return 'Submit Event Request';
};

async function fetchUserNames(userIds: string[]) {
    const idsToFetch = [...new Set(userIds)].filter(id => id && !studentNameCache.value.hasOwnProperty(id));
    if (idsToFetch.length === 0) return;
    try {
        const fetchPromises = idsToFetch.map(async (id) => {
            try {
                const userDocRef = doc(db, 'users', id);
                const docSnap = await getDoc(userDocRef);
                studentNameCache.value[id] = docSnap.exists() ? (docSnap.data().name || id) : id;
            } catch { studentNameCache.value[id] = id; }
        });
        await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Error fetching user names:", error);
         idsToFetch.forEach(id => { if (!studentNameCache.value.hasOwnProperty(id)) studentNameCache.value[id] = id; });
    }
}

const fetchStudents = async () => {
    loadingStudents.value = true;
    errorMessage.value = '';
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);

        const students = querySnapshot.docs
            .map(doc => ({ uid: doc.id, name: doc.data().name || '', role: doc.data().role || 'Student' }))
            // Filter out Admins (Users can't select themselves in this combined input)
            .filter(user => user.role !== 'Admin')
            .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

        students.forEach(student => { if (student.name) { studentNameCache.value[student.uid] = student.name; }});
        availableStudents.value = students;

    } catch (error) {
        console.error('Error fetching students:', error);
        errorMessage.value = 'Failed to load student list';
    } finally {
        loadingStudents.value = false;
    }
};

// --- UPDATED: Organizer Selection Helpers ---
const addOrganizer = (student: Student) => {
    // Prevent adding self if not Admin (implicitly handled by fetchStudents filter now)
    if (currentUser.value?.uid === student.uid && !isAdmin.value) {
        console.warn("Cannot add self as organizer via this input."); // User is added automatically on request
        return;
    }
    if (!selectedOrganizers.value.includes(student.uid) && selectedOrganizers.value.length < 5) {
        selectedOrganizers.value.push(student.uid);
    }
    organizerSearch.value = ''; // Clear search input
    showOrganizerDropdown.value = false;
};

const removeOrganizer = (uid: string) => {
    selectedOrganizers.value = selectedOrganizers.value.filter(id => id !== uid);
};

const handleSearchFocus = () => {
    showOrganizerDropdown.value = true;
};

const handleSearchBlur = () => {
    // Delay hiding to allow click event on dropdown items
    setTimeout(() => {
        showOrganizerDropdown.value = false;
        // Clear search if nothing was selected
        if (organizerSearch.value) {
             organizerSearch.value = '';
        }
    }, 200);
};

// Filtered students for dropdown (excluding already selected organizers)
const filteredStudentsForDropdown = computed(() => {
    if (!organizerSearch.value) return [];
    const lowerSearch = organizerSearch.value.toLowerCase();
    // Ensure current user isn't shown in dropdown unless Admin (since they're added automatically for requests)
    const excludeSelf = !isAdmin.value ? currentUser.value?.uid : null;

    return availableStudents.value.filter(s =>
        s.uid !== excludeSelf && // Exclude self if not admin
        s.name.toLowerCase().includes(lowerSearch) &&
        !selectedOrganizers.value.includes(s.uid)
    );
});
// --- END: Organizer Selection Helpers ---

// Team management functions (addTeam, removeTeam, isStudentAssignedElsewhere, getTeamAssignmentName)
// are handled within ManageTeamsComponent.vue

const getDefaultCriteriaLabel = (index: number) => defaultCriteriaLabels[index] || `Criteria ${index + 1}`;
const addConstraint = () => {
    if (ratingCriteria.value.length < 5) { ratingCriteria.value.push({ label: '', role: '', points: 5 }); }
};
const removeConstraint = (index: number) => {
    if (ratingCriteria.value.length > 1) { ratingCriteria.value.splice(index, 1); }
};

const prepareSubmissionData = () => {
    const xpAllocation = ratingCriteria.value
        .map((criteria, index) => ({
            constraintIndex: index,
            constraintLabel: criteria.label || getDefaultCriteriaLabel(index),
            role: criteria.role || 'general',
            points: criteria.points || 0
        }))
        .filter(allocation => allocation.points > 0);

    const finalOrganizers = isAdmin.value
        ? [...selectedOrganizers.value]
        : [...new Set([currentUser.value.uid, ...selectedOrganizers.value])];

    if (finalOrganizers.length === 0 || finalOrganizers.length > 5) {
        throw new Error(`An event must have between 1 and 5 organizers. Found ${finalOrganizers.length}.`);
    }

    return {
        xpAllocation,
        organizers: finalOrganizers
    };
};

const findNextAvailableDate = async (searchStart: Date): Promise<Date | null> => {
    const checkDate = new Date(searchStart); // Start from the provided date
    let foundDate: Date | null = null;
    let attempts = 0;
    const maxAttempts = 30; // Limit search

    while (!foundDate && attempts < maxAttempts) {
        // Check for conflict on checkDate
        const conflict = await store.dispatch('events/checkDateConflict', {
            startDate: checkDate,
            endDate: checkDate // Check single day
        });

        if (!conflict) {
            foundDate = new Date(checkDate);
            break;
        }
        checkDate.setDate(checkDate.getDate() + 1); // Move to next day
        attempts++;
    }
    return foundDate;
};

// --- Date Conflict Validation --- UPDATED
const validateDatesForConflict = async () => {
    dateErrorMessages.value = { startDate: '', endDate: '' };
    errorMessage.value = '';
    conflictingEventEndDate.value = null; // Reset conflict end date

    if (!startDate.value || !endDate.value || !/^\d{4}-\d{2}-\d{2}$/.test(startDate.value) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate.value)) {
        return;
    }

    const startDateObj = new Date(startDate.value);
    const endDateObj = new Date(endDate.value);

    if (startDateObj > endDateObj) {
        dateErrorMessages.value.endDate = 'End date cannot be earlier than the start date.';
        return;
    }

    isCheckingConflict.value = true;
    try {
        const conflictingEvent = await store.dispatch('events/checkDateConflict', {
            startDate: startDateObj,
            endDate: endDateObj
        });

        if (conflictingEvent) {
            const conflictMsg = `Date conflict with event "${conflictingEvent.eventName}".`;
            dateErrorMessages.value.startDate = conflictMsg;
            dateErrorMessages.value.endDate = ' ';
            // Store the end date of the conflicting event
            if (conflictingEvent.endDate?.toDate) {
                conflictingEventEndDate.value = conflictingEvent.endDate.toDate();
            }
        } else {
            dateErrorMessages.value = { startDate: '', endDate: '' };
            conflictingEventEndDate.value = null; // Clear if no conflict
        }
    } catch (error: any) {
        console.error("Error checking date conflict:", error);
        dateErrorMessages.value.startDate = `Error checking date availability: ${error.message || 'Unknown error'}`;
        dateErrorMessages.value.endDate = ' ';
        conflictingEventEndDate.value = null; // Clear on error
    } finally {
        isCheckingConflict.value = false;
    }
};

// Watchers for date changes remain the same
watch(startDate, validateDatesForConflict);
watch(endDate, validateDatesForConflict);
watch(startDate, (newStartDate) => {
    if (!newStartDate) return; // Don't do anything if start date is cleared

    const startDateObj = new Date(newStartDate);
    let endDateObj = endDate.value ? new Date(endDate.value) : null;

    // If end date is empty or start date is now after end date, update end date
    if (!endDateObj || startDateObj > endDateObj) {
        endDate.value = newStartDate; // Set end date to match start date
        // Note: The watcher on endDate will automatically trigger validateDatesForConflict
    }
});

// --- NEW: Watcher to reset eventType when isTeamEvent changes ---
watch(isTeamEvent, (isTeam) => {
    const currentCategories = isTeam ? teamEventCategories : individualEventCategories;
    // Check if the currently selected eventType exists in the new list of categories
    if (!currentCategories.some(category => category.value === eventType.value)) {
        eventType.value = ''; // Reset if not valid for the new type
    }
});

// --- Set Next Available Date --- UPDATED
const setNextAvailableDate = async () => {
    isFindingNextDate.value = true;
    dateErrorMessages.value.startDate = ''; // Clear previous confirmation/error message
    dateErrorMessages.value.endDate = '';

    // Determine where to start searching
    let searchStartDate = new Date();
    searchStartDate.setDate(searchStartDate.getDate() + 1); // Default: tomorrow
    searchStartDate.setHours(0, 0, 0, 0);

    const hasConflictError = !!dateErrorMessages.value.startDate.includes('conflict');

    if (hasConflictError && conflictingEventEndDate.value) {
        // Start searching the day AFTER the conflicting event ends
        searchStartDate = new Date(conflictingEventEndDate.value);
        searchStartDate.setDate(searchStartDate.getDate() + 1);
        searchStartDate.setHours(0, 0, 0, 0);
        console.log("Conflict detected, starting search after:", searchStartDate);
    } else if (startDate.value && endDate.value && !hasConflictError) {
        // Start searching the day AFTER the current valid end date
        try {
             const currentEndDate = new Date(endDate.value);
             if (!isNaN(currentEndDate.getTime())) {
                searchStartDate = new Date(currentEndDate);
                searchStartDate.setDate(searchStartDate.getDate() + 1);
                searchStartDate.setHours(0, 0, 0, 0);
                console.log("No conflict, starting search after current end date:", searchStartDate);
            }
        } catch { /* Ignore potential date parsing errors, use default */ }
    }

    try {
        const nextDate = await findNextAvailableDate(searchStartDate);
        if (nextDate instanceof Date) {
            const dateString = nextDate.toISOString().split('T')[0];
            startDate.value = dateString;
            endDate.value = dateString; // Set end date to the same day
            // Provide confirmation - validation will run via watchers
            dateErrorMessages.value.startDate = 'Set to next available date.'; 
        } else {
            dateErrorMessages.value.startDate = 'No available dates found in the next 30 days.';
        }
    } catch (error) {
        console.error('Error finding next available date:', error);
        dateErrorMessages.value.startDate = 'Error finding next available date.';
    } finally {
        isFindingNextDate.value = false;
        // Explicitly re-validate after setting dates
        // Use timeout to ensure watchers have potentially run from date changes
        setTimeout(validateDatesForConflict, 50); 
    }
};

// --- Step Navigation ---
const handleStep1Submit = (e: Event) => {
    e.preventDefault();
    errorMessage.value = ''; // Clear previous errors
    // *** NEW: Validate XP Total ***
    if (totalAllocatedXp.value !== 50) {
        errorMessage.value = `Total allocated XP must be exactly 50. Current total: ${totalAllocatedXp.value} XP.`;
        window.scrollTo(0, 0); // Scroll to top to show error
        return;
    }

    if (isTeamEvent.value) {
        currentStep.value = 2;
    } else {
        handleSubmit(); // Directly submit if individual event
    }
};
const handleBack = () => {
    if (currentStep.value > 1) { currentStep.value--; } else { router.back(); }
};
const updateTeams = (newTeams: TeamMember[]) => {
    if (!Array.isArray(newTeams)) return;
    teams.value = newTeams.map(team => ({
        teamName: team.teamName || '', members: Array.isArray(team.members) ? [...team.members] : [], isNew: team.isNew || false
    }));
};
const updateCanAddTeam = (value: boolean) => { if (canAddTeam.value !== value) { canAddTeam.value = value; } };
const hasValidTeams = computed(() => {
    if (!isTeamEvent.value) return true;
    const teamsArr = teams.value;
    if (!Array.isArray(teamsArr) || teamsArr.length < 2) return false;
    return teamsArr.every(team => Boolean(team?.teamName?.trim()) && Array.isArray(team?.members) && team.members.length > 0);
});

// --- MAIN SUBMISSION LOGIC ---
const handleSubmit = async () => {
    // Run final validation before submitting
    await validateDatesForConflict();
    if (dateErrorMessages.value.startDate || dateErrorMessages.value.endDate) {
        errorMessage.value = 'Please resolve the date conflicts before submitting.';
        window.scrollTo(0, 0);
        return; // Stop submission if conflict exists
    }

    // *** NEW: Validate XP Total ***
    if (totalAllocatedXp.value !== 50) {
        errorMessage.value = `Total allocated XP must be exactly 50. Current total: ${totalAllocatedXp.value} XP. Please adjust criteria points.`;
        window.scrollTo(0, 0); // Scroll to top to show error
        return; // Stop submission if XP total is incorrect
    }

    // *** ADDED: Validate that xpAllocation is not empty after filtering ***
    if (totalAllocatedXp.value === 0) {
        errorMessage.value = `No XP points allocated. Please assign points (greater than 0) to at least one rating criterion.`;
        window.scrollTo(0, 0);
        return; // Stop submission if no XP is allocated
    }

    // Validate Organizer Selection for Admin
    if (isAdmin.value && selectedOrganizers.value.length === 0) {
        errorMessage.value = 'Please select at least one student organizer for the event.';
        window.scrollTo(0, 0);
        return;
    }

    // Validate total organizers (primary + co) <= 5
    const totalOrganizers = (isAdmin.value ? 1 : 1) + selectedOrganizers.value.length;
    if (totalOrganizers < 1 || totalOrganizers > 5) {
        errorMessage.value = `An event must have between 1 and 5 organizers (currently ${totalOrganizers}).`;
         window.scrollTo(0, 0);
         return;
    }

    errorMessage.value = '';
    isSubmitting.value = true;

    try {
        // Validate date inputs exist (redundant but safe)
        if (!startDate.value || !endDate.value) {
             throw new Error("Start and End dates are required.");
        }

        const startDateObj = new Date(startDate.value);
        const endDateObj = new Date(endDate.value);

        // Validate date objects
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
             throw new Error("Invalid date format provided.");
        }

        // Validate date range (Allow same day)
        // Set time to 00:00:00 for start and 23:59:59 for end for comparison
        const compareStart = new Date(startDateObj); compareStart.setHours(0,0,0,0);
        const compareEnd = new Date(endDateObj); compareEnd.setHours(23,59,59,999);

        if (compareStart > compareEnd) {
            dateErrorMessages.value.endDate = 'End date cannot be earlier than the start date.';
            throw new Error('Invalid date range');
        }

        // --- Prepare Base Data --- (Common for create/update)
        const commonData = prepareSubmissionData(); // Gets xpAllocation, organizers
        const preparedData: any = {
            eventName: eventName.value,
            eventType: eventType.value,
            description: description.value,
            isTeamEvent: isTeamEvent.value,
            xpAllocation: commonData.xpAllocation,
            organizers: commonData.organizers, // Use combined list from prepareSubmissionData
            // Teams (only if team event)
            teams: isTeamEvent.value ? teams.value.map(t => ({
                teamName: t.teamName.trim(),
                members: [...t.members],
                // Ensure submissions/ratings arrays exist, even if empty, when updating
                submissions: t.submissions || [],
                ratings: t.ratings || []
            })) : [],
            // Dates will be added based on context (create vs update, admin vs user)
        };

        // --- Determine Action: Create vs Update ---
        if (editingEventId.value) {
            // --- UPDATE EXISTING EVENT ---
            const updates = { ...preparedData };

            // Add appropriate dates (desired for pending/rejected, actual for approved if admin edits)
            // Note: updateEventDetails action internally handles date conversion to Timestamp
            if (isAdmin.value) {
                 updates.startDate = startDateObj;
                 updates.endDate = endDateObj;
                 // Admin can update organizers list directly
                 updates.organizers = commonData.organizers;
            } else {
                 updates.desiredStartDate = startDateObj;
                 updates.desiredEndDate = endDateObj;
                 // Non-admins CANNOT change organizers during update in this setup
                 // The updateEventDetails action should prevent this if not admin
                 // We pass the *original* organizers list if not admin to be safe
                 // OR rely on the action's permission check
                 // Let's rely on the action's permission check for now.
                 // If non-admin tries to submit a changed list, action should throw error.
                 updates.organizers = commonData.organizers;
            }

            // *** Special handling for resubmitting a REJECTED event ***
            if (rejectionReason.value !== null) { // Check if we were editing a rejected event
                updates.status = 'Pending';        // Reset status to Pending
                updates.rejectionReason = null;    // Clear the rejection reason
            }
            // If just editing a pending request, status remains Pending (no need to set explicitly unless changing)

            await store.dispatch('events/updateEventDetails', {
                eventId: editingEventId.value,
                updates: updates
            });
            alert('Event request updated successfully.');
            // Redirect after update (e.g., back to profile or admin list)
             router.push(isAdmin.value ? '/manage-requests' : '/profile');

        } else {
            // --- CREATE NEW EVENT / REQUEST ---
            const finalData = { ...preparedData };
            finalData.requester = currentUser.value.uid;
            finalData.status = isAdmin.value ? 'Approved' : 'Pending';

            if (isAdmin.value) {
                finalData.startDate = startDateObj;
                finalData.endDate = endDateObj;
                // organizers already set in finalData
                await store.dispatch('events/createEvent', finalData);
                alert('Event created successfully.');
                router.push('/manage-requests');
            } else {
                finalData.desiredStartDate = startDateObj;
                finalData.desiredEndDate = endDateObj;
                // organizers already set in finalData (includes requester)
                await store.dispatch('events/requestEvent', finalData);
                alert('Event request submitted successfully.');
                router.push('/profile');
            }
        }

    } catch (error: any) {
        console.error("Event submission/update error:", error);
        // Display specific date conflict errors from the action
        if (error.message.includes('Date conflict')) {
             dateErrorMessages.value.startDate = error.message;
             dateErrorMessages.value.endDate = ' '; // Add space to show error near end date too
        }
        errorMessage.value = error.message || 'Failed to process event submission.';
    } finally {
        isSubmitting.value = false;
    }
};

// --- Lifecycle Hook ---
onMounted(async () => {
    loadingCheck.value = true;
    hasActiveRequest.value = false;
    try {
        if (!isAdmin.value) { hasActiveRequest.value = await store.dispatch('events/checkExistingRequests'); }
    } catch (error) {
        console.error("Error checking existing requests:", error);
        errorMessage.value = "Could not verify existing requests.";
        if (!isAdmin.value) hasActiveRequest.value = true;
    } finally { loadingCheck.value = false; }

    // Check if editing an existing event
    const editId = route.query.edit as string;
    if (editId) {
        editingEventId.value = editId;
        isLoadingEventData.value = true;
        errorMessage.value = ''; // Clear previous errors
        try {
            const eventData = await store.dispatch('events/fetchEventDetails', editId);
            if (eventData) {
                // Populate form fields from fetched data
                eventName.value = eventData.eventName || '';
                eventType.value = eventData.eventType || 'Hackathon';
                description.value = eventData.description || '';
                isTeamEvent.value = !!eventData.isTeamEvent;
                selectedOrganizers.value = Array.isArray(eventData.organizers) ? [...eventData.organizers] : [];
                // Set search text for organizer if admin and organizer exists
                if (isAdmin.value && selectedOrganizers.value.length > 0 && studentNameCache.value[selectedOrganizers.value[0]]) {
                    organizerSearch.value = studentNameCache.value[selectedOrganizers.value[0]];
                }

                // Use desired dates if pending/rejected, otherwise actual dates
                const start = eventData.status === 'Pending' || eventData.status === 'Rejected'
                                ? eventData.desiredStartDate
                                : eventData.startDate;
                const end = eventData.status === 'Pending' || eventData.status === 'Rejected'
                                ? eventData.desiredEndDate
                                : eventData.endDate;

                startDate.value = start?.toDate ? start.toDate().toISOString().split('T')[0] : '';
                endDate.value = end?.toDate ? end.toDate().toISOString().split('T')[0] : '';

                // Populate rating criteria
                if (Array.isArray(eventData.xpAllocation) && eventData.xpAllocation.length > 0) {
                     // Map xpAllocation back to the simpler ratingCriteria structure
                     // We now derive labels *directly* from xpAllocation
                     ratingCriteria.value = eventData.xpAllocation.map((alloc: any) => ({
                         label: alloc.constraintLabel || `Criteria ${alloc.constraintIndex + 1}`, // Get label from alloc
                         role: alloc.role === 'general' ? '' : alloc.role,
                         points: alloc.points || 5
                     })).sort((a:any, b:any) => a.constraintIndex - b.constraintIndex); // Ensure order if index exists
                     if (ratingCriteria.value.length === 0) {
                         ratingCriteria.value.push({ label: '', role: '', points: 5 });
                     }
                } else {
                     ratingCriteria.value = [{ label: '', role: '', points: 5 }];
                }


                // Populate teams if it's a team event
                if (isTeamEvent.value && Array.isArray(eventData.teams)) {
                    teams.value = eventData.teams.map((t: any) => ({
                        teamName: t.teamName || '',
                        members: Array.isArray(t.members) ? [...t.members] : [],
                        isNew: false // Mark as existing
                    }));
                     // Ensure name cache is populated for team members
                     const memberIds = teams.value.flatMap(t => t.members);
                     await fetchUserNames(memberIds);
                } else {
                    teams.value = [{ teamName: '', members: [], isNew: true }]; // Reset if not team event
                }

                // Handle rejection reason
                if (eventData.status === 'Rejected') {
                    rejectionReason.value = eventData.rejectionReason || null;
                } else {
                    rejectionReason.value = null; // Clear if not rejected
                }

                 // Ensure name cache is populated for the organizers if not already
                 if (selectedOrganizers.value.length > 0) {
                     await fetchUserNames(selectedOrganizers.value);
                 }

            } else {
                errorMessage.value = `Event with ID ${editId} not found. Cannot edit.`;
                editingEventId.value = null; // Reset editing state
            }
        } catch (error: any) {
            console.error("Error fetching event data for editing:", error);
            errorMessage.value = `Failed to load event data for editing: ${error.message}`;
            editingEventId.value = null; // Reset editing state
        } finally {
            isLoadingEventData.value = false;
        }
    }

    // Fetch students regardless of editing state
    await fetchStudents();
});

</script>

<!-- Template and Style remain the same -->
<template>
    <div class="container mt-4">
        <!-- Header with Step Indicator -->
        <div class="d-flex align-items-center mb-4">
            <button class="btn btn-secondary me-3 btn-sm" @click="handleBack">
                <i class="fas fa-arrow-left me-1"></i>Back
            </button>
            <h2 class="mb-0">{{ editingEventId ? 'Edit Event Request' : (isAdmin ? 'Create New Event' : 'Request New Event') }}</h2>
        </div>

         <!-- Display Rejection Reason if applicable -->
         <div v-if="rejectionReason" class="alert alert-warning mb-4">
             <h5 class="alert-heading">Reason for Previous Rejection:</h5>
             <p class="mb-0">{{ rejectionReason }}</p>
             <hr>
             <p class="mb-0 small">Please review the reason above and make the necessary changes before resubmitting.</p>
         </div>

        <!-- Progress Steps -->
        <div v-if="!loadingCheck && !hasActiveRequest && !isAdmin" class="progress-steps mb-4">
            <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
                1. Event Details & XP
            </div>
            <div v-if="isTeamEvent" class="step" :class="{ active: currentStep === 2, disabled: currentStep < 2 }">
                2. Team Definition
            </div>
        </div>

        <!-- Loading & Error States -->
        <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
        <div v-if="!isAdmin && loadingCheck" class="text-center my-4">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span class="ms-2">Checking existing requests...</span>
        </div>
        <div v-else-if="!isAdmin && hasActiveRequest" class="alert alert-warning" role="alert">
            You already have an active or pending event request. You cannot submit another until it is resolved or cancelled.
        </div>
        <div v-if="loadingStudents || isLoadingEventData" class="text-center my-4">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span class="ms-2">{{ loadingStudents ? 'Loading student list...' : 'Loading event data...' }}</span>
        </div>

        <!-- Step 1: Event Details & XP -->
        <div v-if="currentStep === 1 && (!loadingStudents || isAdmin)">
            <form @submit.prevent="handleStep1Submit">
                <!-- Event Type Selection -->
                <div class="mb-4">
                    <label class="form-label d-block">Event Type</label>
                    <div class="btn-group">
                        <input type="radio" class="btn-check" name="eventTypeToggle" id="individualEvent"
                               v-model="isTeamEvent" :value="false" :disabled="isSubmitting">
                        <label class="btn btn-outline-primary" for="individualEvent">Individual Event</label>

                        <input type="radio" class="btn-check" name="eventTypeToggle" id="teamEvent"
                               v-model="isTeamEvent" :value="true" :disabled="isSubmitting">
                        <label class="btn btn-outline-primary" for="teamEvent">Team Event</label>
                    </div>
                </div>

                <!-- Basic Event Details -->
                <div class="mb-3">
                    <label for="eventName" class="form-label">Event Name <span class="text-danger">*</span></label>
                    <input type="text" id="eventName" v-model="eventName" required class="form-control" :disabled="isSubmitting" />
                </div>
                <div class="mb-3">
                    <label for="eventTypeSelect" class="form-label">Event Category <span class="text-danger">*</span></label>
                    <select id="eventTypeSelect" v-model="eventType" required class="form-select" size="5" :disabled="isSubmitting">
                        <!-- *** MODIFIED: Use computed property for options *** -->
                        <option v-for="category in availableEventCategories" :key="category.value" :value="category.value">
                            {{ category.label }}
                        </option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="description" class="form-label">Description <span class="text-danger">*</span></label>
                    <textarea id="description" v-model="description" required class="form-control" rows="4" :disabled="isSubmitting"></textarea>
                </div>

                <!-- Consolidated Organizer Selection -->
                 <div class="mb-3">
                    <label for="organizerSearchInput" class="form-label">
                        Organizers (Students only, max 5) <span v-if="isAdmin" class="text-danger">*</span>
                    </label>
                     <p v-if="!isAdmin" class="form-text text-muted small mt-0 mb-1">You are automatically included as an organizer. Add up to 4 co-organizers.</p>
                    <div class="position-relative">
                        <input type="text" id="organizerSearchInput"
                               v-model="organizerSearch"
                               class="form-control"
                               placeholder="Search students to add as organizers..."
                               @focus="handleSearchFocus"
                               @blur="handleSearchBlur"
                               :disabled="!canAddMoreOrganizers || isSubmitting || loadingStudents"
                               autocomplete="off">
                        <div v-if="showOrganizerDropdown && organizerSearch"
                             class="dropdown-menu d-block position-absolute w-100" style="max-height: 200px; overflow-y: auto;">
                             <button v-for="student in filteredStudentsForDropdown"
                                     :key="student.uid"
                                     class="dropdown-item" type="button"
                                     @click="addOrganizer(student)">
                                 {{ student.name }}
                             </button>
                             <div v-if="!filteredStudentsForDropdown.length" class="dropdown-item text-muted">
                                 No matching students found or already selected.
                             </div>
                        </div>
                    </div>
                     <div v-if="!canAddMoreOrganizers" class="form-text text-warning small mt-1">
                         Maximum of 5 organizers reached.
                     </div>
                    <!-- Selected Organizers List -->
                    <div v-if="selectedOrganizers.length > 0" class="mt-2 d-flex flex-wrap gap-2">
                        <span v-for="uid in selectedOrganizers" :key="uid" class="badge bg-secondary d-flex align-items-center">
                            {{ studentNameCache[uid] || uid }}
                            <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove"
                                    @click="removeOrganizer(uid)" style="font-size: 0.6em;"></button>
                        </span>
                    </div>
                     <div v-if="selectedOrganizers.length === 0 && isAdmin" class="form-text text-danger small mt-1">
                         At least one organizer selection is required.
                     </div>
                </div>

                <div class="row mb-3">
                    <div class="col-md-6">
                        <label :for="'date-start'" class="form-label">
                            {{ isAdmin ? 'Start Date' : 'Desired Start Date' }} <span class="text-danger">*</span>
                        </label>
                        <div class="input-group">
                            <input type="date" :id="'date-start'"
                                   v-model="startDate" required class="form-control"
                                   :min="minDate" :disabled="isSubmitting"
                                   placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"/>
                            <button class="btn btn-outline-secondary" type="button"
                                    @click="setNextAvailableDate"
                                    :disabled="isFindingNextDate || isSubmitting"
                                    title="Find the next available date starting after the current selection or conflict">
                                <span v-if="isFindingNextDate" class="spinner-border spinner-border-sm me-1" role="status"></span>
                                <i v-else class="fas fa-calendar-check"></i> Next Available
                            </button>
                        </div>
                        <div v-if="dateErrorMessages.startDate" class="form-text small mt-1"
                             :class="dateErrorMessages.startDate.includes('conflict') ? 'text-danger' : 'text-success'">
                             {{ dateErrorMessages.startDate }}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label :for="'date-end'" class="form-label">
                            {{ isAdmin ? 'End Date' : 'Desired End Date' }} <span class="text-danger">*</span>
                        </label>
                        <input type="date" :id="'date-end'"
                               v-model="endDate" required class="form-control"
                               :min="startDate || minDate" :disabled="isSubmitting || !startDate"
                               placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"/>
                        <div v-if="dateErrorMessages.endDate" class="form-text text-danger small mt-1">
                            {{ dateErrorMessages.endDate }}
                        </div>
                    </div>
                </div>

                <!-- XP Allocation Section -->
                <div class="card mb-4">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">Rating Criteria & XP Allocation</h5>
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            @click="addConstraint"
                            :disabled="ratingCriteria.length >= 5 || isSubmitting">
                            <i class="fas fa-plus"></i> Add Criterion
                        </button>
                    </div>
                    <div class="card-body">
                         <p class="text-muted small mb-3">Define up to 5 criteria for rating submissions. Assign XP points and optionally link criteria to specific roles for automatic winner calculation.</p>
                        <div v-for="(criteria, index) in ratingCriteria" :key="index"
                             class="row mb-3 align-items-center border-bottom pb-3 position-relative">
                             <!-- Input fields for label, role, points -->
                             <div class="col-md-4">
                                <label :for="'criteriaLabel'+index" class="form-label">
                                    Criteria {{ index + 1 }} Label <span class="text-danger">*</span>
                                </label>
                                <input type="text" :id="'criteriaLabel'+index"
                                       v-model="criteria.label"
                                       class="form-control form-control-sm"
                                       required
                                       :placeholder="getDefaultCriteriaLabel(index)"
                                       :disabled="isSubmitting">
                            </div>
                             <div class="col-md-3">
                                <label :for="'roleSelect'+index" class="form-label">Associated Role</label>
                                <select :id="'roleSelect'+index"
                                        v-model="criteria.role"
                                        class="form-select form-select-sm"
                                        :disabled="isSubmitting">
                                    <option value="">General</option>
                                    <option v-for="role in availableRoles"
                                            :key="role.value"
                                            :value="role.value">
                                        {{ role.label }}
                                    </option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label :for="'xpPoints'+index" class="form-label">
                                    XP Points ({{ criteria.points }})
                                </label>
                                <input type="range" :id="'xpPoints'+index"
                                       v-model.number="criteria.points"
                                       class="form-range" min="5" max="50" step="5"
                                       :disabled="isSubmitting">
                            </div>
                            <div class="col-md-1 text-end">
                                <button
                                    v-if="ratingCriteria.length > 1"
                                    type="button"
                                    class="btn btn-sm btn-outline-danger mt-3"
                                    @click="removeConstraint(index)"
                                    title="Remove this criterion"
                                    :disabled="isSubmitting">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div v-if="ratingCriteria.length < 1" class="alert alert-warning small py-2">
                            At least one rating criterion is required.
                        </div>
                        <!-- Display Total XP -->
                        <div class="mt-3 text-end fw-bold" :class="{ 'text-danger': totalAllocatedXp !== 50, 'text-success': totalAllocatedXp === 50 }">
                            Total Allocated XP: {{ totalAllocatedXp }} / 50
                        </div>
                         <div v-if="totalAllocatedXp !== 50" class="form-text text-danger small text-end">
                             Total XP must sum to exactly 50.
                         </div>
                    </div>
                </div>

                <!-- Step 1 Submit -->
                <button type="submit" class="btn btn-primary"
                        :disabled="isSubmitting || isCheckingConflict || selectedOrganizers.length === 0 || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate || totalAllocatedXp !== 50">
                    <span v-if="isSubmitting || isCheckingConflict" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ isSubmitting ? 'Processing...' : (isCheckingConflict ? 'Checking Dates...' : (isTeamEvent ? 'Next: Define Teams' : getSubmitButtonText())) }}
                </button>
                 <p v-if="!isSubmitting && (selectedOrganizers.length === 0 || dateErrorMessages.startDate || dateErrorMessages.endDate || totalAllocatedXp !== 50)" class="text-danger small mt-2">
                    Please correct the errors above (Dates, XP Total, Organizer selection).
                 </p>
            </form>
        </div>

        <!-- Step 2: Team Definition -->
        <div v-if="currentStep === 2 && isTeamEvent">
            <ManageTeamsComponent
                :initial-teams="teams"
                :students="availableStudents"
                :name-cache="studentNameCache"
                :is-submitting="isSubmitting"
                :can-auto-generate="false"
                @update:teams="updateTeams"
                @can-add-team="updateCanAddTeam"
            />
            <div class="mt-4 d-flex justify-content-between">
                 <button type="button" class="btn btn-secondary" @click="currentStep = 1" :disabled="isSubmitting">
                    <i class="fas fa-arrow-left me-1"></i> Back to Details
                </button>
                <button type="button" class="btn btn-primary"
                        @click="handleSubmit"
                        :disabled="isSubmitting || isCheckingConflict || !hasValidTeams || selectedOrganizers.length === 0 || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate || totalAllocatedXp !== 50"
                        :title="!hasValidTeams ? 'Ensure all teams have a name and at least one member. Minimum 2 teams required.' : (dateErrorMessages.startDate || dateErrorMessages.endDate ? 'Resolve date conflicts first.' : '')">
                     <span v-if="isSubmitting || isCheckingConflict" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ isSubmitting ? 'Submitting...' : (isCheckingConflict ? 'Checking Dates...' : getSubmitButtonText()) }}
                </button>
            </div>
            <p v-if="!isSubmitting && (!hasValidTeams || selectedOrganizers.length === 0 || dateErrorMessages.startDate || dateErrorMessages.endDate || totalAllocatedXp !== 50)" class="text-danger small mt-2">
                 <span v-if="!hasValidTeams">Please ensure at least two teams are defined, each with a name and at least one member.</span>
                 <span v-if="selectedOrganizers.length === 0">Please select at least one organizer.</span>
                 <span v-if="dateErrorMessages.startDate || dateErrorMessages.endDate">Please resolve date conflicts.</span>
                 <span v-if="totalAllocatedXp !== 50">Total XP must be 50.</span>
            </p>
        </div>
    </div>
</template>

<style scoped>
/* Styles are condensed for brevity but should match the previous version */
.progress-steps { display: flex; gap: 1rem; margin-bottom: 2rem; }
.step { padding: 0.5rem 1rem; border-radius: 4px; background: #e9ecef; color: #6c757d; }
.step.active { background: #007bff; color: white; }
.step.completed { background: #28a745; color: white; }
.step.disabled { opacity: 0.5; cursor: not-allowed; }
.form-range { height: auto; padding-top: 0.5rem; padding-bottom: 0.5rem; }
.input-group .btn { z-index: 2; } /* Ensure button is clickable over date input edge */
</style>
