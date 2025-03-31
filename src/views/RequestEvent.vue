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
}

// --- Core State ---
const isTeamEvent = ref<boolean>(false);

// --- Form Fields ---
const eventName = ref<string>('');
const eventType = ref<string>('Hackathon');
const description = ref<string>('');
const startDate = ref<string>(''); // Will hold start date for Admin, desired start date for User
const endDate = ref<string>(''); // Will hold end date for Admin, desired end date for User
const selectedCoOrganizers = ref<string[]>([]);

// --- Team Definition State ---
const teams = ref<TeamMember[]>([{
    teamName: '',
    members: [],
    isNew: true
}]);

// --- Co-organizer State ---
const potentialStudentCoOrganizers = ref<Student[]>([]);
const studentNameCache = ref<Record<string, string>>({});
const coOrganizerSearch = ref<string>('');
const showCoOrganizerDropdown = ref<boolean>(false);

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

// --- Computed ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin' );
const minDate = computed(() => {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
});
const canAddMoreCoOrganizers = computed(() => selectedCoOrganizers.value.length < 5);
const totalAllocatedXp = computed(() => {
    return ratingCriteria.value.reduce((sum, criteria) => sum + (criteria.points || 0), 0);
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
        const currentUserId = currentUser.value?.uid;

        const students = querySnapshot.docs
            .map(doc => ({ uid: doc.id, name: doc.data().name || '', role: doc.data().role || 'Student' }))
            // Filter out Admins AND the current user
            .filter(user => user.role !== 'Admin' && user.uid !== currentUserId)
            .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

        students.forEach(student => { if (student.name) { studentNameCache.value[student.uid] = student.name; }});
        potentialStudentCoOrganizers.value = students;

    } catch (error) {
        console.error('Error fetching students:', error);
        errorMessage.value = 'Failed to load student list';
    } finally {
        loadingStudents.value = false;
    }
};

// ... rest of the component (template, other functions, styles) ...

const addCoOrganizer = (student: Student) => {
    if (!selectedCoOrganizers.value.includes(student.uid)) {
        selectedCoOrganizers.value.push(student.uid);
        // Optionally fetch name if not already cached, though fetchStudents should handle most cases
        if (!studentNameCache.value[student.uid] && student.name) {
             studentNameCache.value[student.uid] = student.name;
        }
    }
    coOrganizerSearch.value = ''; // Clear search input
    showCoOrganizerDropdown.value = false; // Hide dropdown
};
const removeCoOrganizer = (uid: string) => {
    selectedCoOrganizers.value = selectedCoOrganizers.value.filter(id => id !== uid);
};
const handleSearchBlur = () => {
    // Delay hiding to allow click event on dropdown items to register
    setTimeout(() => {
        showCoOrganizerDropdown.value = false;
    }, 200);
};
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

    const constraints = ratingCriteria.value.map((criteria, index) =>
        criteria.label || getDefaultCriteriaLabel(index)
    );

    return {
        xpAllocation,
        ratingConstraints: constraints,
        status: isAdmin.value ? 'Approved' : 'Pending', // Status based on Admin role
        requester: currentUser.value.uid,
    };
};

const findNextAvailableDate = async (): Promise<Date | null> => {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + 1); // Start from tomorrow
    let foundDate: Date | null = null;
    let attempts = 0;
    const maxAttempts = 30; // Limit search to next 30 days

    while (!foundDate && attempts < maxAttempts) {
      // Use checkDate directly
      const conflict = await store.dispatch('events/checkDateConflict', {
        startDate: checkDate,
        endDate: new Date(checkDate) // Check for same-day conflict too
      });

      if (!conflict) {
        foundDate = new Date(checkDate); // Found an available date
        break;
      }
      checkDate.setDate(checkDate.getDate() + 1); // Move to the next day
      attempts++;
    }
    return foundDate;
  };

// --- NEW: Real-time Date Conflict Validation ---
const isCheckingConflict = ref(false);
const validateDatesForConflict = async () => {
    // Clear previous errors first
    dateErrorMessages.value = { startDate: '', endDate: '' };
    errorMessage.value = ''; // Also clear general error

    // Only proceed if both dates are selected and valid format (basic check)
    if (!startDate.value || !endDate.value || !/^\d{4}-\d{2}-\d{2}$/.test(startDate.value) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate.value)) {
        return; // Don't check incomplete/invalid dates
    }

    const startDateObj = new Date(startDate.value);
    const endDateObj = new Date(endDate.value);

    // Basic range check (end >= start)
    if (startDateObj > endDateObj) {
        dateErrorMessages.value.endDate = 'End date cannot be earlier than the start date.';
        return; // Don't check conflict if range is invalid
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
            dateErrorMessages.value.endDate = ' '; // Add space to show error near end date too
        } else {
            // Clear errors if no conflict found
            dateErrorMessages.value = { startDate: '', endDate: '' };
        }
    } catch (error: any) {
        console.error("Error checking date conflict:", error);
        // Display a generic error if the check itself fails
        dateErrorMessages.value.startDate = `Error checking date availability: ${error.message || 'Unknown error'}`;
        dateErrorMessages.value.endDate = ' ';
    } finally {
        isCheckingConflict.value = false;
    }
};

// Watch for changes in start and end dates to trigger validation
watch(startDate, validateDatesForConflict);
watch(endDate, validateDatesForConflict);

// Watch StartDate to auto-update EndDate if necessary
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
// --- END: Real-time Date Conflict Validation ---


const setNextAvailableDate = async () => {
    isFindingNextDate.value = true; // Disable button
    dateErrorMessages.value.startDate = ''; // Clear previous errors
    try {
      const nextDate = await findNextAvailableDate();
      if (nextDate instanceof Date) {
        const dateString = nextDate.toISOString().split('T')[0];
        startDate.value = dateString;
        endDate.value = dateString; // Set end date to the same day
        dateErrorMessages.value.startDate = 'Next available start date set.'; // Confirmation message
      } else {
        dateErrorMessages.value.startDate = 'No available dates found in the next 30 days.'; // Error message if no date found
      }
    } catch (error) {
      console.error('Error finding next available date:', error);
      dateErrorMessages.value.startDate = 'Error finding next available date.'; // Error message on exception
    } finally {
       isFindingNextDate.value = false; // Enable button
       // Explicitly re-validate after setting dates from "Next Available"
       await validateDatesForConflict();
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
        const commonData = prepareSubmissionData(); // Gets xpAllocation, ratingConstraints, requester
        const preparedData: any = {
            eventName: eventName.value,
            eventType: eventType.value,
            description: description.value,
            isTeamEvent: isTeamEvent.value,
            coOrganizers: selectedCoOrganizers.value,
            ratingCriteria: commonData.ratingConstraints, // Use original labels array
            xpAllocation: commonData.xpAllocation,
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
            if (isAdmin.value) { // Admin might edit actual dates of approved/pending
                 updates.startDate = startDateObj;
                 updates.endDate = endDateObj;
            } else { // User editing pending/rejected uses desired dates
                 updates.desiredStartDate = startDateObj;
                 updates.desiredEndDate = endDateObj;
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
             router.push(isAdmin.value ? '/admin/events' : '/profile');

        } else {
            // --- CREATE NEW EVENT / REQUEST ---
            const finalData = { ...preparedData };
            finalData.requester = commonData.requester; // Add requester from commonData
            finalData.status = commonData.status;       // Add status from commonData ('Approved' or 'Pending')

            if (isAdmin.value) {
                // Admin creates directly with these dates
                finalData.startDate = startDateObj;
                finalData.endDate = endDateObj;
                // Organizer is set in the createEvent action
                await store.dispatch('events/createEvent', finalData);
                alert('Event created successfully.');
                router.push('/admin/events');
            } else {
                // User requests with these desired dates
                finalData.desiredStartDate = startDateObj;
                finalData.desiredEndDate = endDateObj;
                // Organizer defaults to requester in requestEvent action
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
                selectedCoOrganizers.value = Array.isArray(eventData.coOrganizers) ? [...eventData.coOrganizers] : [];

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
                     // Map xpAllocation back to the simpler ratingCriteria structure used in the form
                     // Assuming ratingConstraints holds the labels in the correct order
                     const constraints = Array.isArray(eventData.ratingConstraints) ? eventData.ratingConstraints : [];
                     ratingCriteria.value = eventData.xpAllocation.map((alloc: any) => ({
                         label: constraints[alloc.constraintIndex] || '', // Get label from constraints array
                         role: alloc.role === 'general' ? '' : alloc.role, // Map 'general' back to empty string for select
                         points: alloc.points || 5
                     }));
                     // Ensure at least one criterion exists if mapping resulted in empty
                     if (ratingCriteria.value.length === 0) {
                         ratingCriteria.value.push({ label: '', role: '', points: 5 });
                     }
                } else {
                     // Reset to default if no allocation found
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

                 // Ensure name cache is populated for co-organizers
                 await fetchUserNames(selectedCoOrganizers.value);

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
        <div v-if="!loadingCheck && !hasActiveRequest" class="progress-steps mb-4">
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
        <div v-if="loadingStudents" class="text-center my-4">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span class="ms-2">Loading student list...</span>
        </div>

        <!-- Step 1: Event Details & XP -->
        <div v-if="currentStep === 1">
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
                        <option value="Hackathon">Hackathon</option>
                        <option value="Ideathon">Ideathon</option>
                        <option value="Debate">Debate</option>
                        <option value="Topic Presentation">Topic Presentation</option>
                        <option value="Debug competition">Debug competition</option>
                        <option value="Discussion session">Discussion session</option>
                        <option value="Design Competition">Design Competition</option>
                        <option value="Testing">Testing</option>
                        <option value="Treasure hunt">Treasure hunt</option>
                        <option value="Open Source">Open Source</option>
                        <option value="Hands-on Presentation">Hands-on Presentation</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Program logic solver">Program logic solver</option>
                        <option value="Google Search">Google Search</option>
                        <option value="Typing competition">Typing competition</option>
                        <option value="Tech Business plan">Tech Business plan</option>
                        <option value="Algorithm writing">Algorithm writing</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label for="description" class="form-label">Description <span class="text-danger">*</span></label>
                    <textarea id="description" v-model="description" required class="form-control" rows="4" :disabled="isSubmitting"></textarea>
                </div>

                <!-- Co-organizer Selection -->
                 <div class="mb-3">
                    <label for="coOrganizerSearch" class="form-label">Add Co-organizers (Students only, max 5)</label>
                    <div class="position-relative">
                        <input type="text" id="coOrganizerSearch"
                               v-model="coOrganizerSearch"
                               class="form-control"
                               placeholder="Search students to add as co-organizers..."
                               @focus="showCoOrganizerDropdown = true"
                               @blur="handleSearchBlur"
                               :disabled="!canAddMoreCoOrganizers || isSubmitting || loadingStudents"
                               autocomplete="off">
                        <div v-if="showCoOrganizerDropdown && coOrganizerSearch"
                             class="dropdown-menu d-block position-absolute w-100" style="max-height: 200px; overflow-y: auto;">
                             <button v-for="student in potentialStudentCoOrganizers.filter(s => s.name.toLowerCase().includes(coOrganizerSearch.toLowerCase()) && !selectedCoOrganizers.includes(s.uid))"
                                     :key="student.uid"
                                     class="dropdown-item" type="button"
                                     @click="addCoOrganizer(student)">
                                 {{ student.name }}
                             </button>
                             <div v-if="!potentialStudentCoOrganizers.filter(s => s.name.toLowerCase().includes(coOrganizerSearch.toLowerCase()) && !selectedCoOrganizers.includes(s.uid)).length" class="dropdown-item text-muted">
                                 No matching students found.
                             </div>
                        </div>
                    </div>
                     <div v-if="!canAddMoreCoOrganizers" class="form-text text-warning small mt-1">
                         Maximum of 5 co-organizers reached.
                     </div>
                    <!-- Selected Co-organizers List -->
                    <div v-if="selectedCoOrganizers.length > 0" class="mt-2 d-flex flex-wrap gap-2">
                        <span v-for="uid in selectedCoOrganizers" :key="uid" class="badge bg-secondary d-flex align-items-center">
                            {{ studentNameCache[uid] || uid }}
                            <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove"
                                    @click="removeCoOrganizer(uid)" style="font-size: 0.6em;"></button>
                        </span>
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
                                    @click="setNextAvailableDate" :disabled="isFindingNextDate || isSubmitting">
                                <span v-if="isFindingNextDate" class="spinner-border spinner-border-sm me-1" role="status"></span>
                                <i v-else class="fas fa-calendar-check"></i> Next Available
                            </button>
                        </div>
                        <div v-if="dateErrorMessages.startDate" class="form-text text-danger small mt-1">
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
                        :disabled="isSubmitting || isCheckingConflict || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate">
                    <span v-if="isSubmitting || isCheckingConflict" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ isSubmitting ? 'Processing...' : (isCheckingConflict ? 'Checking Dates...' : (isTeamEvent ? 'Next: Define Teams' : getSubmitButtonText())) }}
                </button>
                 <p v-if="!isSubmitting && (dateErrorMessages.startDate || dateErrorMessages.endDate)" class="text-danger small mt-2">
                    Please resolve the date conflict errors above.
                 </p>
            </form>
        </div>

        <!-- Step 2: Team Definition -->
        <div v-if="currentStep === 2 && isTeamEvent">
            <ManageTeamsComponent
                :initial-teams="teams"
                :students="potentialStudentCoOrganizers"
                :name-cache="studentNameCache"
                :is-submitting="isSubmitting"
                @update:teams="updateTeams"
                @can-add-team="updateCanAddTeam"
            />
            <div class="mt-4 d-flex justify-content-between">
                 <button type="button" class="btn btn-secondary" @click="currentStep = 1" :disabled="isSubmitting">
                    <i class="fas fa-arrow-left me-1"></i> Back to Details
                </button>
                <button type="button" class="btn btn-primary"
                        @click="handleSubmit"
                        :disabled="isSubmitting || isCheckingConflict || !hasValidTeams || !!dateErrorMessages.startDate || !!dateErrorMessages.endDate"
                        :title="!hasValidTeams ? 'Ensure all teams have a name and at least one member. Minimum 2 teams required.' : (dateErrorMessages.startDate || dateErrorMessages.endDate ? 'Resolve date conflicts first.' : '')">
                     <span v-if="isSubmitting || isCheckingConflict" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {{ isSubmitting ? 'Submitting...' : (isCheckingConflict ? 'Checking Dates...' : getSubmitButtonText()) }}
                </button>
            </div>
            <p v-if="!hasValidTeams || dateErrorMessages.startDate || dateErrorMessages.endDate" class="text-danger small mt-2">
                 <span v-if="!hasValidTeams">Please ensure at least two teams are defined, each with a name and at least one member.</span>
                 <span v-if="dateErrorMessages.startDate || dateErrorMessages.endDate"> Please resolve the date conflict errors.</span>
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
