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
const eventType = ref<string>('Topic Presentation');
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
            role: criteria.role ? criteria.role : 'general',
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

// --- Date Conflict Validation ---
const validateDatesForConflict = async () => {
    dateErrorMessages.value = { startDate: '', endDate: '' };
    // Clear global error message only if it's a date conflict error
    if (errorMessage.value.includes('Date conflict') || errorMessage.value.includes('resolve the date conflicts')) {
        errorMessage.value = '';
    }
    conflictingEventEndDate.value = null; // Reset conflict end date

    if (!startDate.value || !endDate.value || !/^\d{4}-\d{2}-\d{2}$/.test(startDate.value) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate.value)) {
        return; // Don't validate if dates are invalid/empty
    }

    const startDateObj = new Date(startDate.value);
    const endDateObj = new Date(endDate.value);
    // Add time to avoid off-by-one day issues due to timezone
    startDateObj.setUTCHours(0, 0, 0, 0);
    endDateObj.setUTCHours(23, 59, 59, 999);

    if (startDateObj > endDateObj) {
        dateErrorMessages.value.endDate = 'End date cannot be earlier than the start date.';
        return;
    }

    isCheckingConflict.value = true;
    try {
        const conflictingEvent = await store.dispatch('events/checkDateConflict', {
            startDate: startDateObj,
            endDate: endDateObj,
            excludeEventId: editingEventId.value // Exclude current event if editing
        });

        if (conflictingEvent) {
            const conflictMsg = `Date conflict: overlaps with "${conflictingEvent.eventName}" (ends ${conflictingEvent.endDate?.toDate ? conflictingEvent.endDate.toDate().toLocaleDateString() : 'N/A'}).`;
            dateErrorMessages.value.startDate = conflictMsg;
            dateErrorMessages.value.endDate = ' '; // Add space to show indicator near end date too
            // Store the end date of the conflicting event
            if (conflictingEvent.endDate?.toDate) {
                conflictingEventEndDate.value = conflictingEvent.endDate.toDate();
            }
        } else {
            dateErrorMessages.value = { startDate: '', endDate: '' }; // Clear errors if no conflict
            conflictingEventEndDate.value = null; // Clear conflict date
        }
    } catch (error: any) {
        console.error("Error checking date conflict:", error);
        const errorMsg = `Error checking date availability: ${error.message || 'Unknown error'}`;
        dateErrorMessages.value.startDate = errorMsg;
        dateErrorMessages.value.endDate = ' '; // Show indicator near end date
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
        // Set to the first available category in the new list, or empty if the list is empty
        eventType.value = currentCategories.length > 0 ? currentCategories[0].value : '';
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
        console.log("Conflict detected, starting search after:", searchStartDate.toLocaleDateString());
    } else if (startDate.value && endDate.value && !hasConflictError) {
        // Start searching the day AFTER the current valid end date
        try {
             const currentEndDate = new Date(endDate.value);
             if (!isNaN(currentEndDate.getTime())) {
                searchStartDate = new Date(currentEndDate);
                searchStartDate.setDate(searchStartDate.getDate() + 1);
                searchStartDate.setHours(0, 0, 0, 0);
                console.log("No conflict, starting search after current end date:", searchStartDate.toLocaleDateString());
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
             // Clear existing errors before setting success message
            dateErrorMessages.value = { startDate: '', endDate: '' };
            // Use setTimeout to ensure validation runs *after* this message is potentially cleared by watcher
            setTimeout(() => {
                // Only set success message if no validation error occurred after date change
                 if (!dateErrorMessages.value.startDate && !dateErrorMessages.value.endDate) {
                     dateErrorMessages.value.startDate = `Set to next available date: ${nextDate.toLocaleDateString()}`;
                 }
            }, 100); // Small delay
        } else {
            dateErrorMessages.value.startDate = 'No available dates found in the next 30 days.';
        }
    } catch (error) {
        console.error('Error finding next available date:', error);
        dateErrorMessages.value.startDate = 'Error finding next available date.';
    } finally {
        isFindingNextDate.value = false;
        // Explicitly re-validate *after* setting dates and after a short delay for watchers
        setTimeout(validateDatesForConflict, 150);
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
    errorMessage.value = ''; // Clear general error first
    isSubmitting.value = true; // Set submitting early

    // Run final validation before submitting
    await validateDatesForConflict(); // Re-validate dates just before submission
    if (dateErrorMessages.value.startDate || dateErrorMessages.value.endDate) {
        errorMessage.value = 'Please resolve the date conflicts before submitting.';
        window.scrollTo(0, 0);
        isSubmitting.value = false; // Stop submitting
        return; // Stop submission if conflict exists
    }

    // *** NEW: Validate XP Total ***
    if (totalAllocatedXp.value !== 50) {
        errorMessage.value = `Total allocated XP must be exactly 50. Current total: ${totalAllocatedXp.value} XP. Please adjust criteria points.`;
        window.scrollTo(0, 0); // Scroll to top to show error
        isSubmitting.value = false; // Stop submitting
        return; // Stop submission if XP total is incorrect
    }

    // *** ADDED: Validate that xpAllocation has at least one criteria with points > 0 ***
    const validXpAllocations = ratingCriteria.value.filter(c => c.points > 0);
    if (validXpAllocations.length === 0) {
        errorMessage.value = `No XP points allocated. Please assign points (greater than 0) to at least one rating criterion.`;
        window.scrollTo(0, 0);
        isSubmitting.value = false; // Stop submitting
        return; // Stop submission if no XP is allocated
    }

    // Validate Organizer Selection for Admin
    if (isAdmin.value && selectedOrganizers.value.length === 0) {
        errorMessage.value = 'Please select at least one student organizer for the event.';
        window.scrollTo(0, 0);
         isSubmitting.value = false; // Stop submitting
        return;
    }

    // Validate total organizers (primary + co) <= 5
    // The user requesting is implicitly one organizer if not admin
    const implicitOrganizers = isAdmin.value ? 0 : 1;
    const totalOrganizersCount = selectedOrganizers.value.length + implicitOrganizers;

    if (totalOrganizersCount < 1 || totalOrganizersCount > 5) {
        errorMessage.value = `An event must have between 1 and 5 organizers (currently ${totalOrganizersCount}).`;
         window.scrollTo(0, 0);
         isSubmitting.value = false; // Stop submitting
         return;
    }

    // Ensure required fields are not empty
    if (!eventName.value.trim() || !eventType.value || !description.value.trim()) {
        errorMessage.value = "Please fill in Event Name, Category, and Description.";
        window.scrollTo(0, 0);
        isSubmitting.value = false;
        return;
    }

    // Team Validation (if applicable)
    if (isTeamEvent.value && !hasValidTeams.value) {
        errorMessage.value = "For team events, please ensure at least two teams are defined, each with a name and at least one member.";
        // Attempt to navigate back to step 2 if possible
        if (currentStep.value === 1) currentStep.value = 2; // Should not happen based on flow, but safety check
        window.scrollTo(0, 0);
        isSubmitting.value = false;
        return;
    }


    // --- Prepare Submission Data (Moved Inside Try Block) ---
    try {
        // Validate date inputs exist (redundant but safe)
        if (!startDate.value || !endDate.value) {
             throw new Error("Start and End dates are required.");
        }

        // Convert dates to Date objects for Timestamp conversion
        // Use UTC to avoid timezone issues during conversion
        const startDateObj = new Date(startDate.value + 'T00:00:00Z');
        const endDateObj = new Date(endDate.value + 'T23:59:59Z');


        // Validate date objects
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
             throw new Error("Invalid date format provided.");
        }

        // Validate date range (Allow same day) - Already checked by watcher, but double-check
        if (startDateObj > endDateObj) {
             dateErrorMessages.value.endDate = 'End date cannot be earlier than the start date.';
             throw new Error('Invalid date range');
        }


        // --- Prepare Base Data --- (Common for create/update)
        const { xpAllocation, organizers } = prepareSubmissionData(); // Gets filtered xpAllocation, organizers list

        // Ensure xpAllocation is not empty *after* filtering (already checked, but safe)
        if (xpAllocation.length === 0) {
            throw new Error("XP Allocation resulted in an empty list. Ensure at least one criterion has points > 0.");
        }

        const preparedData: any = {
            eventName: eventName.value.trim(),
            eventType: eventType.value,
            description: description.value.trim(),
            isTeamEvent: isTeamEvent.value,
            xpAllocation: xpAllocation, // Use filtered list
            organizers: organizers, // Use combined list from prepareSubmissionData
            // Teams (only if team event)
            teams: isTeamEvent.value ? teams.value.map(t => ({
                teamName: t.teamName.trim(),
                members: [...t.members],
                // Ensure submissions/ratings arrays exist, even if empty, when updating/creating
                submissions: t.submissions || [],
                ratings: t.ratings || []
            })).filter(t => t.teamName && t.members.length > 0) : [], // Filter empty teams just in case
            // Dates will be added based on context (create vs update, admin vs user)
        };


        // --- Determine Action: Create vs Update ---
        if (editingEventId.value) {
            // --- UPDATE EXISTING EVENT ---
            const updates = { ...preparedData };

            // Convert dates to Firestore Timestamps
            const startTimestamp = Timestamp.fromDate(startDateObj);
            const endTimestamp = Timestamp.fromDate(endDateObj);

            if (isAdmin.value) {
                 updates.startDate = startTimestamp;
                 updates.endDate = endTimestamp;
                 // Admin can update organizers list directly
                 updates.organizers = organizers; // Use the validated list
            } else {
                 updates.desiredStartDate = startTimestamp;
                 updates.desiredEndDate = endTimestamp;
                 // Non-admins CANNOT change organizers during update
                 // The action should enforce this, but we send the correct list anyway
                 updates.organizers = organizers; // Send the list (requester + selected)
            }

            // *** Special handling for resubmitting a REJECTED event ***
            if (rejectionReason.value !== null) { // Check if we were editing a rejected event
                updates.status = 'Pending';        // Reset status to Pending
                updates.rejectionReason = null;    // Clear the rejection reason
            }

            await store.dispatch('events/updateEventDetails', {
                eventId: editingEventId.value,
                updates: updates
            });
            alert('Event request updated successfully.');
             router.push(isAdmin.value ? '/manage-requests' : '/profile');

        } else {
            // --- CREATE NEW EVENT / REQUEST ---
            const finalData = { ...preparedData };
            finalData.requester = currentUser.value.uid;
            finalData.status = isAdmin.value ? 'Approved' : 'Pending';

             // Pass Date objects directly to the action
             finalData.startDate = startDateObj;
             finalData.endDate = endDateObj;

            if (isAdmin.value) {
                await store.dispatch('events/createEvent', finalData);
                alert('Event created successfully.');
                router.push('/manage-requests');
            } else {
                await store.dispatch('events/requestEvent', finalData);
                alert('Event request submitted successfully.');
                router.push('/profile');
            }
        }

    } catch (error: any) {
        console.error("Event submission/update error:", error);
        // Display specific date conflict errors from the action or validation
        if (error.message.includes('Date conflict')) {
             dateErrorMessages.value.startDate = error.message;
             dateErrorMessages.value.endDate = ' '; // Add space to show error near end date too
        } else if (error.message.includes('Invalid date range')) {
            // This specific error likely comes from the client-side check
            dateErrorMessages.value.endDate = 'End date cannot be earlier than the start date.';
        }
        // Set general error message for other issues
        errorMessage.value = error.message || 'Failed to process event submission.';
        window.scrollTo(0, 0); // Scroll to top to show error
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

<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-20"> <!-- Container, Added mb-20 for sticky footer space -->
        <!-- Header with Back Button -->
        <div class="flex items-center mb-6">
            <button 
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                @click="handleBack" :disabled="isSubmitting">
                <i class="fas fa-arrow-left mr-1 h-3 w-3"></i>Back
            </button>
            <h2 class="ml-4 text-2xl font-bold text-gray-900">{{ editingEventId ? 'Edit Event Request' : (isAdmin ? 'Create New Event' : 'Request New Event') }}</h2>
        </div>

         <!-- Display Rejection Reason if applicable -->
         <div v-if="rejectionReason" class="mb-6 border border-yellow-300 rounded-md bg-yellow-50 p-4">
             <h5 class="text-sm font-medium text-yellow-800 flex items-center"><i class="fas fa-exclamation-triangle mr-2"></i>Reason for Previous Rejection:</h5>
             <p class="mt-2 text-sm text-yellow-700">{{ rejectionReason }}</p>
             <hr class="my-2 border-yellow-200">
             <p class="text-sm text-yellow-700 mb-0">Please review the reason above and make the necessary changes before resubmitting.</p>
         </div>

        <!-- Progress Steps (Visual Indicator) -->
        <div v-if="isTeamEvent && !loadingCheck && !hasActiveRequest && !isAdmin && !editingEventId" class="mb-6">
             <nav aria-label="Progress">
                <ol role="list" class="flex items-center">
                    <li class="relative pr-8 sm:pr-20 flex-1">
                        <div class="absolute inset-0 flex items-center" aria-hidden="true">
                           <div :class="[currentStep > 1 ? 'bg-blue-600' : 'bg-gray-200', 'h-0.5 w-full']"></div>
            </div>
                        <a href="#" @click.prevent="currentStep = 1" class="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-900">
                           <span class="text-white font-bold">1</span>
                        </a>
                         <div class="absolute -bottom-6 left-0 transform -translate-x-1/2 ml-4">
                            <span class="text-xs font-medium text-blue-600">Details & XP</span>
                        </div>
                    </li>
                    <li class="relative flex-shrink-0">
                         <div class="absolute inset-0 flex items-center" aria-hidden="true">
                            <div class="h-0.5 w-full bg-gray-200"></div>
                        </div>
                        <a href="#" @click.prevent="currentStep = 2" 
                           :class="[currentStep === 2 ? 'bg-blue-600 hover:bg-blue-900' : 'border-2 border-gray-300 bg-white hover:border-gray-400', 'relative flex h-8 w-8 items-center justify-center rounded-full']">
                           <span :class="[currentStep === 2 ? 'text-white' : 'text-gray-500', 'font-bold']">2</span>
                        </a>
                         <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                            <span :class="[currentStep === 2 ? 'text-blue-600' : 'text-gray-500', 'text-xs font-medium']">Teams</span>
                        </div>
                    </li>
                </ol>
            </nav>
        </div>

        <!-- Loading & Error States -->
        <div v-if="errorMessage" 
            class="mb-4 rounded-md bg-red-50 p-4 border border-red-200 flex justify-between items-center" 
            role="alert">
            <div class="flex items-center">
                <i class="fas fa-times-circle mr-2 text-red-400"></i> 
                <span class="text-sm font-medium text-red-800">{{ errorMessage }}</span>
        </div>
             <button type="button" class="ml-4 -mr-1 -my-1 p-1 rounded-md text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50" @click="errorMessage = ''" aria-label="Dismiss">
                 <span class="sr-only">Dismiss</span>
                 <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </button>
        </div>
        <div v-if="!isAdmin && loadingCheck" class="flex justify-center items-center text-sm text-gray-500 my-4">
            <svg class="animate-spin h-4 w-4 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Checking existing requests...
        </div>
        <div v-else-if="!isAdmin && hasActiveRequest && !editingEventId" 
            class="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-700" 
            role="alert">
            <i class="fas fa-info-circle mr-2"></i> You already have an active or pending event request. You cannot submit another until it is resolved or cancelled.
            <router-link to="/profile" class="font-medium underline hover:text-blue-800"> View your profile</router-link> to manage it.
        </div>
         <div v-if="loadingStudents || isLoadingEventData" class="flex flex-col items-center justify-center my-6">
             <svg class="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
             <p class="text-sm text-gray-500">{{ loadingStudents ? 'Loading student list...' : 'Loading event data...' }}</p>
         </div>


        <!-- Step 1: Event Details & XP -->
        <div v-show="currentStep === 1 && (!loadingStudents || isAdmin) && !isLoadingEventData" class="space-y-6"> <!-- Use v-show to keep state -->
            <form @submit.prevent="handleStep1Submit" novalidate> 
                <!-- Event Type Selection -->
                 <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div class="p-4 sm:p-6">
                         <h3 class="text-base font-semibold leading-6 text-gray-900 mb-4">Event Format</h3>
                         <fieldset>
                            <legend class="sr-only">Event format</legend>
                            <div class="grid grid-cols-2 gap-3">
                                <!-- Individual Event Radio -->
                                <label :class="[ !isTeamEvent ? 'bg-blue-50 border-blue-200 z-10 ring-2 ring-blue-500' : 'border-gray-200', 'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none']">
                                <input type="radio" name="event-format" v-model="isTeamEvent" :value="false" class="sr-only" aria-labelledby="format-option-0-label" :disabled="isSubmitting || !!editingEventId">
                                <span class="flex flex-1">
                                    <span class="flex flex-col">
                                    <span id="format-option-0-label" class="block text-sm font-medium text-gray-900">Individual Event</span>
                                    <span class="mt-1 flex items-center text-xs text-gray-500"><i class="fas fa-user mr-1"></i>Participants work alone</span>
                                    </span>
                                </span>
                                <svg :class="[!isTeamEvent ? 'border-blue-500' : 'border-transparent', 'absolute -inset-px rounded-lg border-2 pointer-events-none']" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M-20 100C-20 44.7715 -64.7715 0 -120 0C-175.228 0 -220 44.7715 -220 100C-220 155.228 -175.228 200 -120 200C-64.7715 200 -20 155.228 -20 100Z" stroke="currentColor" stroke-width="4" /></svg>
                            </label>
                                <!-- Team Event Radio -->
                                <label :class="[ isTeamEvent ? 'bg-blue-50 border-blue-200 z-10 ring-2 ring-blue-500' : 'border-gray-200', 'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none']">
                                <input type="radio" name="event-format" v-model="isTeamEvent" :value="true" class="sr-only" aria-labelledby="format-option-1-label" :disabled="isSubmitting || !!editingEventId">
                                <span class="flex flex-1">
                                    <span class="flex flex-col">
                                    <span id="format-option-1-label" class="block text-sm font-medium text-gray-900">Team Event</span>
                                    <span class="mt-1 flex items-center text-xs text-gray-500"><i class="fas fa-users mr-1"></i>Participants work in teams</span>
                                    </span>
                                </span>
                                <svg :class="[isTeamEvent ? 'border-blue-500' : 'border-transparent', 'absolute -inset-px rounded-lg border-2 pointer-events-none']" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M-20 100C-20 44.7715 -64.7715 0 -120 0C-175.228 0 -220 44.7715 -220 100C-220 155.228 -175.228 200 -120 200C-64.7715 200 -20 155.228 -20 100Z" stroke="currentColor" stroke-width="4" /></svg>
                            </label>
                        </div>
                         </fieldset>
                        <div v-if="editingEventId" class="mt-3 text-xs text-gray-500">
                            Event format (Individual/Team) cannot be changed after creation.
                        </div>
                    </div>
                </div>

                <!-- Basic Event Details -->
                <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 class="text-base font-semibold leading-6 text-gray-900">Basic Information</h3>
                        </div>
                    <div class="p-4 sm:p-6 space-y-4">
                        <div>
                            <label for="eventName" class="block text-sm font-medium leading-6 text-gray-900">Event Name <span class="text-red-600">*</span></label>
                            <input type="text" id="eventName" v-model.trim="eventName" required 
                                   class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100" 
                                   :disabled="isSubmitting" placeholder="e.g., Spring Hackathon 2024" />
                        </div>
                        <div>
                            <label for="eventTypeSelect" class="block text-sm font-medium leading-6 text-gray-900">Event Category <span class="text-red-600">*</span></label>
                            <select id="eventTypeSelect" v-model="eventType" required 
                                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100">
                                <option value="" disabled>-- Select a Category --</option>
                                <option v-for="category in availableEventCategories" :key="category.value" :value="category.value">
                                    {{ category.label }}
                                </option>
                                <option v-if="!availableEventCategories.some(c => c.value === eventType) && eventType" :value="eventType" disabled>{{ eventType }} (Invalid for current format)</option>
                            </select>
                        </div>
                        <div>
                            <label for="description" class="block text-sm font-medium leading-6 text-gray-900">Description <span class="text-red-600">*</span></label>
                            <textarea id="description" v-model.trim="description" required rows="4" 
                                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100" 
                                      :disabled="isSubmitting" placeholder="Provide a brief overview of the event, goals, and any important rules."></textarea>
                        </div>
                    </div>
                </div>

                <!-- Organizer Selection -->
                 <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                     <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 class="text-base font-semibold leading-6 text-gray-900">Organizer(s)</h3>
                     </div>
                     <div class="p-4 sm:p-6">
                         <label for="organizerSearchInput" class="block text-sm font-medium leading-6 text-gray-900">
                             Select Student Organizers (1-5 total) <span v-if="isAdmin" class="text-red-600">*</span>
                         </label>
                         <p v-if="!isAdmin" class="mt-1 text-xs text-gray-500">You are automatically the primary organizer. You can add up to 4 co-organizers.</p>
                         <div class="relative mt-2">
                             <input type="text" id="organizerSearchInput"
                                    v-model="organizerSearch"
                                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100"
                                    placeholder="Search students by name..."
                                    @focus="handleSearchFocus"
                                    @blur="handleSearchBlur"
                                    :disabled="!canAddMoreOrganizers || isSubmitting || loadingStudents"
                                    autocomplete="off">
                             <!-- Tailwind Dropdown -->
                             <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                             <div v-if="showOrganizerDropdown && organizerSearch && filteredStudentsForDropdown.length > 0"
                                      class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                  <button v-for="student in filteredStudentsForDropdown"
                                          :key="student.uid"
                                              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                              type="button"
                                              @mousedown.prevent="addOrganizer(student)">
                                      {{ student.name }}
                                  </button>
                             </div>
                                 <div v-else-if="showOrganizerDropdown && organizerSearch && !filteredStudentsForDropdown.length"
                                      class="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md p-4 text-sm text-gray-500 ring-1 ring-black ring-opacity-5">
                                     No matching students found.
                             </div>
                             </transition>
                         </div>
                         <div v-if="!canAddMoreOrganizers" class="mt-1 text-xs text-yellow-600">
                            <i class="fas fa-exclamation-circle mr-1"></i> Maximum of 5 organizers reached.
                         </div>
                         <!-- Selected Organizers List -->
                         <div v-if="selectedOrganizers.length > 0" class="mt-3 flex flex-wrap gap-2">
                             <span v-for="uid in selectedOrganizers" :key="uid" class="inline-flex items-center gap-x-0.5 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                 <i class="fas fa-user mr-1 h-3 w-3"></i>
                                 {{ studentNameCache[uid] || uid }}
                                 <button type="button" class="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-gray-500/20 disabled:opacity-50" @click="removeOrganizer(uid)" :disabled="isSubmitting" aria-label="Remove organizer">
                                    <span class="sr-only">Remove</span>
                                    <svg viewBox="0 0 14 14" class="h-3.5 w-3.5 stroke-gray-700/50 group-hover:stroke-gray-700/75"><path d="M4 4l6 6m0-6l-6 6" /></svg>
                                    <span class="absolute -inset-1"></span>
                                </button>
                             </span>
                         </div>
                         <div v-if="isAdmin && selectedOrganizers.length === 0" class="mt-1 text-xs text-red-600">
                             <i class="fas fa-exclamation-triangle mr-1"></i> At least one organizer selection is required for Admin creation.
                         </div>
                    </div>
                </div>

                 <!-- Date Selection -->
                <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 class="text-base font-semibold leading-6 text-gray-900">{{ isAdmin ? 'Event Dates' : 'Desired Event Dates' }}</h3>
                    </div>
                    <div class="p-4 sm:p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label :for="'date-start'" class="block text-sm font-medium leading-6 text-gray-900">
                                    Start Date <span class="text-red-600">*</span>
                                </label>
                                <div class="mt-1 flex rounded-md shadow-sm">
                                    <input type="date" :id="'date-start'"
                                           v-model="startDate" required 
                                           class="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-0 py-1.5 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 disabled:opacity-50 disabled:bg-gray-100"
                                           :class="dateErrorMessages.startDate ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-blue-600'"
                                           :min="minDate" :disabled="isSubmitting || isFindingNextDate"
                                           placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"
                                           aria-describedby="startDateFeedback startDateHelp"/>
                                    <button 
                                        class="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                        type="button"
                                            @click="setNextAvailableDate"
                                            :disabled="isFindingNextDate || isSubmitting"
                                            title="Find next available start date">
                                        <span v-if="isFindingNextDate" class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>
                                        <i v-else class="fas fa-calendar-check h-4 w-4 text-gray-500"></i>
                                        <span class="hidden sm:inline">Next Available</span>
                                    </button>
                                     </div>
                                <p v-if="dateErrorMessages.startDate" class="mt-1 text-xs text-red-600" id="startDateFeedback">{{ dateErrorMessages.startDate }}</p>
                                <p v-else class="mt-1 text-xs text-gray-500" id="startDateHelp">Select the day the event begins. Must be tomorrow or later.</p>
                                </div>
                            <div>
                                <label :for="'date-end'" class="block text-sm font-medium leading-6 text-gray-900">
                                    End Date <span class="text-red-600">*</span>
                                </label>
                                    <input type="date" :id="'date-end'"
                                       v-model="endDate" required 
                                       class="mt-1 block w-full rounded-md border-0 py-1.5 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 disabled:opacity-50 disabled:bg-gray-100"
                                       :class="dateErrorMessages.endDate && dateErrorMessages.endDate.trim() ? 'text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500' : 'text-gray-900 ring-gray-300 placeholder:text-gray-400 focus:ring-blue-600'"
                                           :min="startDate || minDate" :disabled="isSubmitting || !startDate || isFindingNextDate"
                                           placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"
                                           aria-describedby="endDateFeedback endDateHelp"/>
                                <p v-if="dateErrorMessages.endDate && dateErrorMessages.endDate.trim()" class="mt-1 text-xs text-red-600" id="endDateFeedback">{{ dateErrorMessages.endDate }}</p>
                                <p v-else class="mt-1 text-xs text-gray-500" id="endDateHelp">Select the day the event ends. Must be on or after the start date.</p>
                                     </div>
                                 </div>
                         <!-- Combined Date Feedback Message -->
                         <div v-if="dateErrorMessages.startDate && dateErrorMessages.startDate.includes('conflict')" class="mt-4 rounded-md bg-yellow-50 p-3 border border-yellow-200">
                             <div class="flex">
                                <div class="flex-shrink-0"><i class="fas fa-exclamation-triangle text-yellow-400 h-5 w-5"></i></div>
                                <div class="ml-3"><p class="text-xs text-yellow-700">{{ dateErrorMessages.startDate }} Use "Next Available" or choose different dates.</p></div>
                            </div>
                        </div>
                         <div v-else-if="dateErrorMessages.startDate && !dateErrorMessages.startDate.includes('conflict') && !dateErrorMessages.startDate.includes('available date')" class="mt-4 rounded-md bg-red-50 p-3 border border-red-200">
                             <div class="flex">
                                <div class="flex-shrink-0"><i class="fas fa-times-circle text-red-400 h-5 w-5"></i></div>
                                <div class="ml-3"><p class="text-xs text-red-700">Error: {{ dateErrorMessages.startDate }}</p></div>
                         </div>
                         </div>
                         <div v-else-if="dateErrorMessages.startDate && dateErrorMessages.startDate.includes('available date')" class="mt-4 rounded-md bg-green-50 p-3 border border-green-200">
                             <div class="flex">
                                <div class="flex-shrink-0"><i class="fas fa-check-circle text-green-400 h-5 w-5"></i></div>
                                <div class="ml-3"><p class="text-xs text-green-700">{{ dateErrorMessages.startDate }}</p></div>
                             </div>
                         </div>
                    </div>
                </div>


                <!-- XP Allocation Section -->
                <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                     <div class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h3 class="text-base font-semibold leading-6 text-gray-900">Rating Criteria & XP Allocation (Total: 50 XP)</h3>
                        <button
                            type="button"
                            class="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            @click="addConstraint"
                            :disabled="ratingCriteria.length >= 5 || isSubmitting">
                            <i class="fas fa-plus h-3 w-3"></i> Add Criterion
                        </button>
                    </div>
                    <div class="p-4 sm:p-6">
                         <p class="text-sm text-gray-500 mb-4">Define up to 5 criteria for rating submissions. The total XP across all criteria must equal 50. Optionally, link criteria to specific roles for automatic winner calculation in team events.</p>
                        <div v-if="ratingCriteria.length === 0" class="rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
                            At least one rating criterion is required. Click 'Add Criterion'.
                        </div>
                        <!-- Criteria Rows -->
                        <div class="space-y-4">
                        <div v-for="(criteria, index) in ratingCriteria" :key="index"
                                class="flex flex-wrap items-end gap-4 border-b border-gray-200 pb-4">
                                <!-- Label Input -->
                                <div class="flex-grow min-w-[150px]">
                                    <label :for="'criteriaLabel'+index" class="block text-xs font-medium leading-6 text-gray-900">
                                        Criteria {{ index + 1 }} Label <span class="text-red-600">*</span>
                                </label>
                                <input type="text" :id="'criteriaLabel'+index"
                                       v-model.trim="criteria.label"
                                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                                       required
                                       :placeholder="getDefaultCriteriaLabel(index)"
                                       :disabled="isSubmitting">
                            </div>
                                <!-- Role Select -->
                                <div class="flex-grow min-w-[150px]">
                                    <label :for="'roleSelect'+index" class="block text-xs font-medium leading-6 text-gray-900">Associated Role</label>
                                <select :id="'roleSelect'+index"
                                        v-model="criteria.role"
                                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                                        :disabled="isSubmitting">
                                        <option value="">-- General (Optional) --</option>
                                    <option v-for="role in availableRoles"
                                            :key="role.value"
                                            :value="role.value">
                                        {{ role.label }}
                                    </option>
                                </select>
                            </div>
                                <!-- Points Input/Slider -->
                                <div class="flex-grow min-w-[200px]">
                                    <label :for="'xpPointsNum'+index" class="block text-xs font-medium leading-6 text-gray-900">
                                        XP Points ({{ criteria.points }})
                                </label>
                                    <div class="flex items-center gap-2 mt-1">
                                     <input type="number" :id="'xpPointsNum'+index"
                                           v-model.number="criteria.points"
                                            class="block w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50" 
                                            min="0" :max="50" step="1"
                                           :disabled="isSubmitting">
                                    <input type="range" :id="'xpPoints'+index"
                                           v-model.number="criteria.points"
                                            class="h-2 w-full flex-grow cursor-pointer appearance-none rounded-lg bg-gray-200 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 disabled:opacity-50"
                                            min="0" max="50" step="1"
                                           :disabled="isSubmitting"
                                           aria-label="XP Points Slider">
                                </div>
                            </div>
                                <!-- Remove Button -->
                                <div class="flex-shrink-0">
                                <button
                                    v-if="ratingCriteria.length > 0"
                                    type="button"
                                        class="rounded bg-white px-2 py-1 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                    @click="removeConstraint(index)"
                                    title="Remove this criterion"
                                    :disabled="isSubmitting">
                                        <i class="fas fa-trash-alt text-red-500"></i>
                                </button>
                                </div>
                            </div>
                        </div>

                        <!-- Display Total XP -->
                         <div class="mt-4 text-right">
                            <span class="text-lg font-semibold" :class="{ 'text-red-600': totalAllocatedXp !== 50, 'text-green-600': totalAllocatedXp === 50 }">
                                Total Allocated XP: {{ totalAllocatedXp }} / 50
                            </span>
                            <p v-if="totalAllocatedXp !== 50" class="mt-1 text-xs text-red-600">
                                <i class="fas fa-exclamation-triangle mr-1"></i> Total XP must sum to exactly 50.
                            </p>
                         </div>
                    </div>
                </div>

                <!-- Step 1 Sticky Footer - Buttons moved here, combined logic -->
                <!-- The sticky footer will be outside the form but controlled by its state -->
            </form> <!-- End of Step 1 form -->
        </div> <!-- End of v-show for Step 1 -->

        <!-- Step 2: Team Definition -->
        <div v-show="currentStep === 2 && isTeamEvent"> <!-- Use v-show to keep state -->
             <!-- ManageTeamsComponent is already refactored -->
            <ManageTeamsComponent
                :initial-teams="teams"
                :students="availableStudents"
                :name-cache="studentNameCache"
                :is-submitting="isSubmitting"
                :can-auto-generate="false"
                @update:teams="updateTeams"
                @can-add-team="updateCanAddTeam"
            />
             <!-- Step 2 Buttons & Validation Summary - Placed in Sticky Footer -->
        </div>

         <!-- Sticky Footer for Actions -->
         <div class="fixed inset-x-0 bottom-0 z-10 bg-gray-50 border-t border-gray-200 p-4 shadow-inner">
            <div class="max-w-4xl mx-auto flex justify-between items-center">
                <!-- Back Button (Conditional) -->
                <button 
                    v-if="currentStep === 2 && isTeamEvent" 
                    type="button" 
                    class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    @click="currentStep = 1" :disabled="isSubmitting">
                    <i class="fas fa-arrow-left mr-1"></i> Back to Details
                </button>
                <div v-else></div> <!-- Placeholder to keep submit button right-aligned -->

                <!-- Validation Summary & Submit Button Container -->
                <div class="flex items-center space-x-4">
                    <!-- Validation Message -->
                     <p v-if="!isSubmitting && (isCheckingConflict || (isAdmin && selectedOrganizers.length === 0) || dateErrorMessages.startDate || dateErrorMessages.endDate || totalAllocatedXp !== 50 || !eventName || !eventType || !description || (isTeamEvent && !hasValidTeams))" 
                         class="text-xs text-red-600 hidden md:block">
                         <i class="fas fa-exclamation-circle mr-1"></i> Please correct errors before submitting.
                         <span v-if="isTeamEvent && !hasValidTeams"> (Min. 2 valid teams)</span>
                     </p>

                    <!-- Submit / Next Button -->
                    <button 
                        v-if="currentStep === 1" 
                        type="submit" form="step1Form" 
                        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="isSubmitting || isCheckingConflict || (isAdmin && selectedOrganizers.length === 0) || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate || totalAllocatedXp !== 50 || !eventName || !eventType || !description">
                         <span v-if="isSubmitting || isCheckingConflict" class="flex items-center">
                           <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           {{ isSubmitting ? 'Processing...' : 'Checking Dates...' }}
                         </span>
                         <span v-else class="flex items-center">
                           {{ isTeamEvent ? 'Next: Define Teams' : (editingEventId ? 'Update Event' : (isAdmin ? 'Create Event' : 'Submit Request')) }}
                           <i v-if="isTeamEvent" class="fas fa-arrow-right ml-2 h-3 w-3"></i>
                           <i v-else class="fas fa-paper-plane ml-2 h-3 w-3"></i>
                         </span>
                    </button>
                    
                    <!-- Final Submit Button (Step 2) -->
                    <button 
                        v-if="currentStep === 2 && isTeamEvent"
                        type="button" 
                        class="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            @click="handleSubmit"
                            :disabled="isSubmitting || isCheckingConflict || !hasValidTeams || (isAdmin && selectedOrganizers.length === 0) || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate || totalAllocatedXp !== 50"
                            :title="!hasValidTeams ? 'Ensure at least two teams are defined, each with a name and at least one member.' : (dateErrorMessages.startDate || dateErrorMessages.endDate ? 'Resolve date conflicts first (Step 1).' : (totalAllocatedXp !== 50 ? 'Total XP must be 50 (Step 1).' : 'Submit Event'))">
                         <span v-if="isSubmitting || isCheckingConflict" class="flex items-center">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            {{ isSubmitting ? 'Submitting...' : 'Checking Dates...' }}
                         </span>
                         <span v-else class="flex items-center">
                             {{ editingEventId ? 'Update Event' : (isAdmin ? 'Create Event' : 'Submit Request') }}
                            <i class="fas fa-check-circle ml-2 h-3 w-3"></i>
                         </span>
                    </button>
                 </div>
            </div>
        </div>

    </div>
</template>


<style scoped>
/* Minimal scoped styles if needed, e.g., for complex radio buttons or specific overrides */
/* Ensure range input thumb is visible */
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  /* Size and background color handled by Tailwind classes */
}

input[type=range]::-moz-range-thumb {
   /* Size and background color handled by Tailwind classes */
}

</style>
