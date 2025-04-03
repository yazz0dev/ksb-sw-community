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

<!-- Template and Style remain the same -->
<template>
    <div class="container mt-4 mb-5"> <!-- Added mb-5 for bottom padding -->
        <!-- Header with Step Indicator -->
        <div class="d-flex align-items-center mb-4">
            <button class="btn btn-outline-secondary me-3" @click="handleBack" :disabled="isSubmitting">
                <i class="fas fa-arrow-left me-1"></i>Back
            </button>
            <h2 class="mb-0">{{ editingEventId ? 'Edit Event Request' : (isAdmin ? 'Create New Event' : 'Request New Event') }}</h2>
        </div>

         <!-- Display Rejection Reason if applicable -->
         <div v-if="rejectionReason" class="alert alert-warning mb-4 border border-warning">
             <h5 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>Reason for Previous Rejection:</h5>
             <p class="mb-0">{{ rejectionReason }}</p>
             <hr>
             <p class="mb-0 small">Please review the reason above and make the necessary changes before resubmitting.</p>
         </div>

        <!-- Progress Steps -->
        <div v-if="isTeamEvent && !loadingCheck && !hasActiveRequest && !isAdmin && !editingEventId" class="progress mb-4" style="height: 25px;">
            <div class="progress-bar" role="progressbar"
                 :style="{ width: currentStep === 1 ? '50%' : '100%' }"
                 :class="{ 'bg-success': currentStep === 2, 'bg-primary': currentStep === 1 }"
                 aria-valuenow="currentStep" aria-valuemin="1" aria-valuemax="2">
                Step {{ currentStep }} of 2: {{ currentStep === 1 ? 'Event Details & XP' : 'Team Definition' }}
            </div>
        </div>


        <!-- Loading & Error States -->
        <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
             <i class="fas fa-times-circle me-2"></i> {{ errorMessage }}
             <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
        </div>
        <div v-if="!isAdmin && loadingCheck" class="text-center my-4">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span class="ms-2">Checking existing requests...</span>
        </div>
        <div v-else-if="!isAdmin && hasActiveRequest && !editingEventId" class="alert alert-info" role="alert">
            <i class="fas fa-info-circle me-2"></i> You already have an active or pending event request. You cannot submit another until it is resolved or cancelled.
            <router-link to="/profile" class="alert-link"> View your profile</router-link> to manage it.
        </div>
         <div v-if="loadingStudents || isLoadingEventData" class="text-center my-4">
             <div class="spinner-border spinner-border" role="status"></div> <!-- Larger spinner -->
             <p class="mt-2">{{ loadingStudents ? 'Loading student list...' : 'Loading event data...' }}</p>
         </div>


        <!-- Step 1: Event Details & XP -->
        <div v-if="currentStep === 1 && (!loadingStudents || isAdmin) && !isLoadingEventData">
            <form @submit.prevent="handleStep1Submit" novalidate> <!-- Disable browser validation -->
                <!-- Event Type Selection Card -->
                 <div class="card mb-4">
                    <div class="card-body">
                         <h5 class="card-title mb-3">Event Format</h5>
                         <div class="btn-group w-100">
                            <input type="radio" class="btn-check" name="eventTypeToggle" id="individualEvent"
                                   v-model="isTeamEvent" :value="false" :disabled="isSubmitting || !!editingEventId" autocomplete="off">
                            <label class="btn btn-outline-primary w-50 py-2" for="individualEvent">
                                <i class="fas fa-user me-1"></i> Individual Event
                            </label>

                            <input type="radio" class="btn-check" name="eventTypeToggle" id="teamEvent"
                                   v-model="isTeamEvent" :value="true" :disabled="isSubmitting || !!editingEventId" autocomplete="off">
                            <label class="btn btn-outline-primary w-50 py-2" for="teamEvent">
                                <i class="fas fa-users me-1"></i> Team Event
                            </label>
                        </div>
                        <div v-if="editingEventId" class="form-text text-muted small mt-2">
                            Event format (Individual/Team) cannot be changed after creation.
                        </div>
                    </div>
                </div>

                <!-- Basic Event Details Card -->
                <div class="card mb-4">
                    <div class="card-header"><h5 class="mb-0">Basic Information</h5></div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label for="eventName" class="form-label">Event Name <span class="text-danger">*</span></label>
                            <input type="text" id="eventName" v-model.trim="eventName" required class="form-control" :disabled="isSubmitting" placeholder="e.g., Spring Hackathon 2024" />
                             <!-- Add validation feedback if needed -->
                        </div>
                        <div class="mb-3">
                            <label for="eventTypeSelect" class="form-label">Event Category <span class="text-danger">*</span></label>
                            <select id="eventTypeSelect" v-model="eventType" required class="form-select" :disabled="isSubmitting">
                                <option value="" disabled>-- Select a Category --</option>
                                <option v-for="category in availableEventCategories" :key="category.value" :value="category.value">
                                    {{ category.label }}
                                </option>
                                <option v-if="!availableEventCategories.some(c => c.value === eventType) && eventType" :value="eventType" disabled>{{ eventType }} (Invalid for current format)</option>
                            </select>
                             <!-- Add validation feedback if needed -->
                        </div>
                        <div class="mb-3">
                            <label for="description" class="form-label">Description <span class="text-danger">*</span></label>
                            <textarea id="description" v-model.trim="description" required class="form-control" rows="4" :disabled="isSubmitting" placeholder="Provide a brief overview of the event, goals, and any important rules."></textarea>
                             <!-- Add validation feedback if needed -->
                        </div>
                    </div>
                </div>


                <!-- Organizer Selection Card -->
                 <div class="card mb-4">
                     <div class="card-header"><h5 class="mb-0">Organizer(s)</h5></div>
                     <div class="card-body">
                         <label for="organizerSearchInput" class="form-label">
                             Select Student Organizers (1-5 total) <span v-if="isAdmin" class="text-danger">*</span>
                         </label>
                         <p v-if="!isAdmin" class="form-text text-muted small mt-0 mb-2">You are automatically the primary organizer. You can add up to 4 co-organizers.</p>
                         <div class="position-relative mb-2">
                             <input type="text" id="organizerSearchInput"
                                    v-model="organizerSearch"
                                    class="form-control"
                                    placeholder="Search students by name..."
                                    @focus="handleSearchFocus"
                                    @blur="handleSearchBlur"
                                    :disabled="!canAddMoreOrganizers || isSubmitting || loadingStudents"
                                    autocomplete="off">
                             <div v-if="showOrganizerDropdown && organizerSearch && filteredStudentsForDropdown.length > 0"
                                  class="dropdown-menu d-block position-absolute w-100 shadow" style="max-height: 200px; overflow-y: auto; z-index: 1050;">
                                  <button v-for="student in filteredStudentsForDropdown"
                                          :key="student.uid"
                                          class="dropdown-item" type="button"
                                          @mousedown.prevent="addOrganizer(student)"> <!-- Use mousedown to register before blur -->
                                      {{ student.name }}
                                  </button>
                             </div>
                             <div v-if="showOrganizerDropdown && organizerSearch && !filteredStudentsForDropdown.length" class="dropdown-menu d-block position-absolute w-100 shadow">
                                 <span class="dropdown-item text-muted disabled">No matching students found.</span>
                             </div>
                         </div>
                         <div v-if="!canAddMoreOrganizers" class="form-text text-warning small">
                            <i class="fas fa-exclamation-circle me-1"></i> Maximum of 5 organizers reached.
                         </div>
                         <!-- Selected Organizers List -->
                         <div v-if="selectedOrganizers.length > 0" class="mt-2 d-flex flex-wrap gap-2">
                             <span v-for="uid in selectedOrganizers" :key="uid" class="badge text-bg-secondary d-flex align-items-center py-1 px-2">
                                 <i class="fas fa-user me-1"></i>
                                 {{ studentNameCache[uid] || uid }}
                                 <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove"
                                         @click="removeOrganizer(uid)" :disabled="isSubmitting"
                                         style="font-size: 0.7em; padding: 0.1em 0.2em;"></button>
                             </span>
                         </div>
                         <div v-if="isAdmin && selectedOrganizers.length === 0" class="form-text text-danger small mt-1">
                             <i class="fas fa-exclamation-triangle me-1"></i> At least one organizer selection is required for Admin creation.
                         </div>
                    </div>
                </div>

                 <!-- Date Selection Card -->
                <div class="card mb-4">
                    <div class="card-header"><h5 class="mb-0">{{ isAdmin ? 'Event Dates' : 'Desired Event Dates' }}</h5></div>
                    <div class="card-body">
                        <div class="row g-3">
                             <div class="col-md-6">
                                <label :for="'date-start'" class="form-label">
                                    Start Date <span class="text-danger">*</span>
                                </label>
                                <div class="input-group" :class="{ 'is-invalid': dateErrorMessages.startDate }">
                                    <input type="date" :id="'date-start'"
                                           v-model="startDate" required class="form-control"
                                           :min="minDate" :disabled="isSubmitting || isFindingNextDate"
                                           placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"
                                           aria-describedby="startDateFeedback startDateHelp"/>
                                    <button class="btn btn-outline-secondary" type="button"
                                            @click="setNextAvailableDate"
                                            :disabled="isFindingNextDate || isSubmitting"
                                            title="Find next available start date">
                                        <span v-if="isFindingNextDate" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        <i v-else class="fas fa-calendar-check"></i>
                                        <span class="d-none d-sm-inline ms-1">Next Available</span>
                                    </button>
                                     <div id="startDateFeedback" class="invalid-feedback w-100"> <!-- Use invalid-feedback -->
                                         {{ dateErrorMessages.startDate }}
                                     </div>
                                </div>
                                <div id="startDateHelp" class="form-text" v-if="!dateErrorMessages.startDate">Select the day the event begins. Must be tomorrow or later.</div>
                            </div>
                            <div class="col-md-6">
                                <label :for="'date-end'" class="form-label">
                                    End Date <span class="text-danger">*</span>
                                </label>
                                 <div class="input-group" :class="{ 'is-invalid': dateErrorMessages.endDate && dateErrorMessages.endDate.trim() }"> <!-- Check trim -->
                                    <input type="date" :id="'date-end'"
                                           v-model="endDate" required class="form-control"
                                           :min="startDate || minDate" :disabled="isSubmitting || !startDate || isFindingNextDate"
                                           placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"
                                           aria-describedby="endDateFeedback endDateHelp"/>
                                    <div id="endDateFeedback" class="invalid-feedback w-100"> <!-- Use invalid-feedback -->
                                         {{ dateErrorMessages.endDate }}
                                     </div>
                                 </div>
                                <div id="endDateHelp" class="form-text" v-if="!dateErrorMessages.endDate || !dateErrorMessages.endDate.trim()">Select the day the event ends. Must be on or after the start date.</div>
                            </div>
                        </div>
                         <!-- Display Combined Date Feedback -->
                         <div v-if="dateErrorMessages.startDate && dateErrorMessages.startDate.includes('conflict')" class="alert alert-warning alert-sm mt-3 py-2 px-3"> <!-- More prominent warning -->
                             <i class="fas fa-exclamation-triangle me-1"></i> {{ dateErrorMessages.startDate }} Use "Next Available" or choose different dates.
                         </div>
                         <div v-else-if="dateErrorMessages.startDate && !dateErrorMessages.startDate.includes('conflict') && !dateErrorMessages.startDate.includes('available date')" class="alert alert-danger alert-sm mt-3 py-2 px-3">
                            <i class="fas fa-times-circle me-1"></i> Error: {{ dateErrorMessages.startDate }}
                         </div>
                         <div v-else-if="dateErrorMessages.startDate && dateErrorMessages.startDate.includes('available date')" class="alert alert-success alert-sm mt-3 py-2 px-3">
                             <i class="fas fa-check-circle me-1"></i> {{ dateErrorMessages.startDate }}
                         </div>
                    </div>
                </div>


                <!-- XP Allocation Section Card -->
                <div class="card mb-4">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">Rating Criteria & XP Allocation (Total: 50 XP)</h5>
                        <button
                            type="button"
                            class="btn btn-sm btn-outline-success"
                            @click="addConstraint"
                            :disabled="ratingCriteria.length >= 5 || isSubmitting">
                            <i class="fas fa-plus"></i> Add Criterion
                        </button>
                    </div>
                    <div class="card-body">
                         <p class="text-muted small mb-3">Define up to 5 criteria for rating submissions. The total XP across all criteria must equal 50. Optionally, link criteria to specific roles for automatic winner calculation in team events.</p>
                        <div v-if="ratingCriteria.length === 0" class="alert alert-warning small py-2">
                            At least one rating criterion is required. Click 'Add Criterion'.
                        </div>
                        <div v-for="(criteria, index) in ratingCriteria" :key="index"
                             class="row g-3 mb-3 pb-3 border-bottom align-items-center position-relative">
                             <!-- Input fields for label, role, points -->
                             <div class="col-md-4 col-lg-4">
                                <label :for="'criteriaLabel'+index" class="form-label">
                                    Criteria {{ index + 1 }} Label <span class="text-danger">*</span>
                                </label>
                                <input type="text" :id="'criteriaLabel'+index"
                                       v-model.trim="criteria.label"
                                       class="form-control form-control-sm"
                                       required
                                       :placeholder="getDefaultCriteriaLabel(index)"
                                       :disabled="isSubmitting">
                            </div>
                             <div class="col-md-3 col-lg-3">
                                <label :for="'roleSelect'+index" class="form-label">Associated Role</label>
                                <select :id="'roleSelect'+index"
                                        v-model="criteria.role"
                                        class="form-select form-select-sm"
                                        :disabled="isSubmitting">
                                    <option value="" disabled>-- Select Role (Optional) --</option>
                                    <option v-for="role in availableRoles"
                                            :key="role.value"
                                            :value="role.value">
                                        {{ role.label }}
                                    </option>
                                </select>
                            </div>
                             <div class="col-md-4 col-lg-4">
                                <label :for="'xpPoints'+index" class="form-label">
                                    XP Points
                                </label>
                                <div class="input-group input-group-sm">
                                     <input type="number" :id="'xpPointsNum'+index"
                                           v-model.number="criteria.points"
                                           class="form-control" min="0" :max="50" step="1"
                                           style="max-width: 70px;"
                                           :disabled="isSubmitting">
                                     <span class="input-group-text">pts</span>
                                    <input type="range" :id="'xpPoints'+index"
                                           v-model.number="criteria.points"
                                           class="form-range w-auto flex-grow-1 mx-2" min="0" max="50" step="1"
                                           :disabled="isSubmitting"
                                           aria-label="XP Points Slider">
                                </div>
                            </div>
                            <div class="col-md-1 col-lg-1 text-end align-self-center pt-3"> <!-- Align button nicely -->
                                <button
                                    v-if="ratingCriteria.length > 0"
                                    type="button"
                                    class="btn btn-sm btn-outline-danger"
                                    @click="removeConstraint(index)"
                                    title="Remove this criterion"
                                    :disabled="isSubmitting">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Display Total XP -->
                        <div class="mt-3 text-end">
                            <span class="fw-bold fs-5" :class="{ 'text-danger': totalAllocatedXp !== 50, 'text-success': totalAllocatedXp === 50 }">
                                Total Allocated XP: {{ totalAllocatedXp }} / 50
                            </span>
                            <p v-if="totalAllocatedXp !== 50" class="form-text text-danger small text-end mb-0">
                                <i class="fas fa-exclamation-triangle me-1"></i> Total XP must sum to exactly 50.
                            </p>
                         </div>
                    </div>
                </div>

                <!-- Step 1 Submit Button & Validation Summary -->
                 <div class="mt-4 sticky-bottom bg-light p-3 border-top d-flex justify-content-end align-items-center"> <!-- Sticky Footer -->
                     <div class="me-auto">
                         <p v-if="!isSubmitting && (isCheckingConflict || (isAdmin && selectedOrganizers.length === 0) || dateErrorMessages.startDate || dateErrorMessages.endDate || totalAllocatedXp !== 50 || !eventName || !eventType || !description)" class="text-danger small mb-0">
                             <i class="fas fa-exclamation-circle me-1"></i> Please correct the errors highlighted above.
                         </p>
                     </div>
                    <button type="submit" class="btn btn-primary btn-lg"
                            :disabled="isSubmitting || isCheckingConflict || (isAdmin && selectedOrganizers.length === 0) || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate || totalAllocatedXp !== 50 || !eventName || !eventType || !description">
                        <span v-if="isSubmitting || isCheckingConflict" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <i v-else-if="isTeamEvent" class="fas fa-arrow-right me-2"></i>
                        <i v-else class="fas fa-paper-plane me-2"></i>
                        {{ isSubmitting ? 'Processing...' : (isCheckingConflict ? 'Checking Dates...' : (isTeamEvent ? 'Next: Define Teams' : (editingEventId ? 'Update Event' : (isAdmin ? 'Create Event' : 'Submit Request')))) }}
                    </button>
                 </div>
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
             <!-- Step 2 Buttons & Validation Summary -->
             <div class="mt-4 sticky-bottom bg-light p-3 border-top d-flex justify-content-between align-items-center"> <!-- Sticky Footer -->
                 <button type="button" class="btn btn-outline-secondary" @click="currentStep = 1" :disabled="isSubmitting">
                    <i class="fas fa-arrow-left me-1"></i> Back to Details
                </button>
                 <div class="text-end">
                    <p v-if="!isSubmitting && (!hasValidTeams || (isAdmin && selectedOrganizers.length === 0) || dateErrorMessages.startDate || dateErrorMessages.endDate || totalAllocatedXp !== 50)" class="text-danger small mb-1 me-2">
                         <i class="fas fa-exclamation-circle me-1"></i>
                         <span v-if="!hasValidTeams">Min. 2 valid teams required. </span>
                         <span v-if="(isAdmin && selectedOrganizers.length === 0)">Organizer needed. </span>
                         <span v-if="dateErrorMessages.startDate || dateErrorMessages.endDate">Date conflict. </span>
                         <span v-if="totalAllocatedXp !== 50">XP total != 50.</span>
                         <span>(Check Step 1 if needed)</span>
                    </p>
                    <button type="button" class="btn btn-success btn-lg"
                            @click="handleSubmit"
                            :disabled="isSubmitting || isCheckingConflict || !hasValidTeams || (isAdmin && selectedOrganizers.length === 0) || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate || totalAllocatedXp !== 50"
                            :title="!hasValidTeams ? 'Ensure at least two teams are defined, each with a name and at least one member.' : (dateErrorMessages.startDate || dateErrorMessages.endDate ? 'Resolve date conflicts first (Step 1).' : (totalAllocatedXp !== 50 ? 'Total XP must be 50 (Step 1).' : 'Submit Event'))">
                         <span v-if="isSubmitting || isCheckingConflict" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                         <i v-else class="fas fa-check-circle me-2"></i>
                        {{ isSubmitting ? 'Submitting...' : (isCheckingConflict ? 'Checking Dates...' : (editingEventId ? 'Update Event' : (isAdmin ? 'Create Event' : 'Submit Request'))) }}
                    </button>
                 </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Add styles for better visual feedback and layout */
.input-group.is-invalid .form-control,
.input-group.is-invalid .btn {
  border-color: #dc3545; /* Ensure button border also turns red */
  z-index: 2; /* Keep button clickable */
}
.input-group.is-invalid .invalid-feedback {
  display: block; /* Ensure feedback is shown */
}
.dropdown-menu {
    z-index: 1050; /* Ensure dropdown appears above other elements */
}
/* Sticky footer for action buttons */
.sticky-bottom {
    position: sticky;
    bottom: 0;
    z-index: 1020; /* Below dropdowns but above page content */
    box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
}
/* Smaller alerts removed - using global style */

/* Ensure range input takes available space correctly */
.form-range.w-auto {
    width: auto;
}
</style>
