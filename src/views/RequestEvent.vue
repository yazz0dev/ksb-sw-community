<template>
    <div class="container mt-4">
        <!-- Header with Step Indicator -->
        <div class="d-flex align-items-center mb-4">
            <button class="btn btn-secondary me-3 btn-sm" @click="handleBack">
                <i class="fas fa-arrow-left me-1"></i>Back
            </button>
            <h2 class="mb-0">{{ isAdmin ? 'Create New Event' : 'Request New Event' }}</h2>
        </div>

        <!-- Progress Steps -->
        <div v-if="!loadingCheck && !hasActiveRequest" class="progress-steps mb-4">
            <div class="step" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
                1. Event Details, Organizers & XP
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

        <!-- Step 1: Event Details, Organizers & XP -->
        <div v-if="currentStep === 1">
            <form @submit.prevent="handleStep1Submit">
                <!-- Event Type Selection -->
                <div class="mb-4">
                    <label class="form-label d-block">Event Type</label>
                    <div class="btn-group">
                        <input type="radio" class="btn-check" name="eventType" id="individualEvent"
                               v-model="isTeamEvent" :value="false" :disabled="isSubmitting">
                        <label class="btn btn-outline-primary" for="individualEvent">Individual Event</label>

                        <input type="radio" class="btn-check" name="eventType" id="teamEvent"
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
                    <label for="eventType" class="form-label">Event Type <span class="text-danger">*</span></label>
                    <select id="eventType" v-model="eventType" required class="form-select" size="5" :disabled="isSubmitting">
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
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label :for="isAdmin ? 'startDate' : 'desiredStartDate'" class="form-label">
                            {{ isAdmin ? 'Start Date' : 'Desired Start Date' }} <span class="text-danger">*</span>
                        </label>
                        <div class="input-group">
                            <input type="date" :id="isAdmin ? 'startDate' : 'desiredStartDate'"
                                   v-model="startDate" required class="form-control"
                                   :min="minDate" :disabled="isSubmitting"
                                   placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"/>
                            <button class="btn btn-outline-secondary" type="button"
                                    @click="setNextAvailableDate" :disabled="isFindingNextDate">
                                <span v-if="isFindingNextDate" class="spinner-border spinner-border-sm me-1" role="status"></span>
                                <i class="fas fa-calendar-check"></i> Next Available Date
                            </button>
                        </div>
                        <div v-if="dateErrorMessages.startDate" class="form-text text-danger">
                            {{ dateErrorMessages.startDate }}
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label :for="isAdmin ? 'endDate' : 'desiredEndDate'" class="form-label">
                            {{ isAdmin ? 'End Date' : 'Desired End Date' }} <span class="text-danger">*</span>
                        </label>
                        <input type="date" :id="isAdmin ? 'endDate' : 'desiredEndDate'"
                               v-model="endDate" required class="form-control"
                               :min="startDate || minDate" :disabled="isSubmitting"
                               placeholder="YYYY-MM-DD" pattern="\d{4}-\d{2}-\d{2}"/>
                        <div v-if="dateErrorMessages.endDate" class="form-text text-danger">
                            {{ dateErrorMessages.endDate }}
                        </div>
                    </div>
                </div>

                <!-- Organizers Section -->
                <div class="mb-4">
                    <label class="form-label">Organizers</label>
                    <div class="card">
                        <div class="card-body">
                            <!-- Display current user (requester) - non-removable -->
                            <div class="mb-2">
                                <span class="badge bg-primary me-2">
                                    {{ studentNameCache[currentUser?.uid] || currentUser?.email || 'You' }} (Requester)
                                </span>
                            </div>

                            <!-- Display selected additional organizers -->
                            <div class="selected-organizers mb-2">
                                <span v-for="uid in organizers.filter(id => id !== currentUser?.uid)" :key="uid"
                                      class="badge bg-secondary me-2 mb-1 selected-badge">
                                    {{ studentNameCache[uid] || uid }}
                                    <button type="button" class="btn-close btn-close-white ms-1"
                                            @click="removeOrganizer(uid)"
                                            :disabled="isSubmitting"
                                            aria-label="Remove organizer"></button>
                                </span>
                            </div>

                            <!-- Search and Add Organizers -->
                            <div v-if="organizers.length < 6" class="organizer-section">
                                <input type="text"
                                       class="form-control form-control-sm"
                                       placeholder="Search and add organizers (up to 5 more)..."
                                       v-model="organizerSearch"
                                       @focus="showOrganizerDropdown = true"
                                       @blur="handleOrganizerSearchBlur"
                                       :disabled="isSubmitting || loadingStudents">
                                <div v-if="showOrganizerDropdown && filteredPotentialOrganizers.length > 0"
                                     class="list-group organizer-dropdown">
                                    <button type="button"
                                            v-for="student in filteredPotentialOrganizers" :key="student.uid"
                                            class="list-group-item list-group-item-action list-group-item-sm"
                                            @mousedown.prevent="addOrganizer(student)">
                                        {{ student.name || student.uid }}
                                    </button>
                                </div>
                                <div v-else-if="showOrganizerDropdown && organizerSearch && filteredPotentialOrganizers.length === 0"
                                     class="list-group organizer-dropdown">
                                    <span class="list-group-item list-group-item-sm text-muted">No matching students found.</span>
                                </div>
                            </div>
                             <div v-else class="form-text text-muted">Maximum number of organizers reached (1 requester + 5 additional).</div>
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
                            :disabled="ratingCriteria.length >= 5">
                            <i class="fas fa-plus"></i> Add Criterion
                        </button>
                    </div>
                    <div class="card-body">
                        <div v-for="(criteria, index) in ratingCriteria" :key="index"
                             class="row mb-3 align-items-end position-relative">
                            <div class="col-md-4">
                                <label :for="'criteriaLabel'+index" class="form-label">
                                    Criteria {{ index + 1 }} Label <span class="text-danger">*</span>
                                </label>
                                <input type="text" :id="'criteriaLabel'+index"
                                       v-model="criteria.label"
                                       class="form-control"
                                       required
                                       :placeholder="getDefaultCriteriaLabel(index)">
                            </div>
                            <div class="col-md-4">
                                <label :for="'roleSelect'+index" class="form-label">Role</label>
                                <select :id="'roleSelect'+index"
                                        v-model="criteria.role"
                                        class="form-select">
                                    <option value="">Select Role</option>
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
                                       class="form-range" min="5" max="50" step="5">
                            </div>
                            <button
                                v-if="ratingCriteria.length > 1"
                                type="button"
                                class="btn btn-sm btn-outline-danger position-absolute top-0 end-0"
                                @click="removeConstraint(index)"
                                title="Remove this criterion">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div v-if="ratingCriteria.length < 1" class="alert alert-warning">
                            At least one rating criterion is required.
                        </div>
                    </div>
                </div>

                <!-- Step 1 Submit -->
                <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                    {{ isTeamEvent ? 'Next: Define Teams' : getSubmitButtonText() }}
                </button>
            </form>
        </div>

        <!-- Step 2: Team Definition -->
        <div v-if="currentStep === 2 && isTeamEvent">
            <ManageTeamsComponent
                :initial-teams="teams"
                :students="potentialOrganizers" 
                :name-cache="studentNameCache"
                :is-submitting="isSubmitting"
                @update:teams="updateTeams"
                @can-add-team="updateCanAddTeam"
            />
            <div class="mt-4">
                <button type="button" class="btn btn-secondary me-2" @click="currentStep = 1">
                    Back to Details
                </button>
                <button type="button" class="btn btn-primary"
                        @click="handleSubmit"
                        :disabled="isSubmitting || !hasValidTeams">
                    {{ getSubmitButtonText() }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'; // Import nextTick
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
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
const startDate = ref<string>('');
const endDate = ref<string>('');
const organizers = ref<string[]>([]); // Combined list including requester

// --- Team Definition State ---
const teams = ref<TeamMember[]>([{
    teamName: '',
    members: [],
    isNew: true
}]);

// --- Organizer State ---
const potentialOrganizers = ref<Student[]>([]); // Students available to be added as organizers
const studentNameCache = ref<Record<string, string>>({});
const organizerSearch = ref<string>('');
const showOrganizerDropdown = ref<boolean>(false);

// --- General State ---
const store = useStore();
const router = useRouter();
const errorMessage = ref<string>('');
const hasActiveRequest = ref<boolean>(false);
const loadingCheck = ref<boolean>(true);
const loadingStudents = ref<boolean>(true);
const isSubmitting = ref<boolean>(false);

// --- Computed ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin' );
// Use consistent local formatting for minDate
const minDate = computed(() => {
  const today = new Date();
  today.setDate(today.getDate() + 1); // Start from tomorrow
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// Filter potential organizers based on search and exclude already selected ones
const filteredPotentialOrganizers = computed(() => {
    if (!organizerSearch.value) return [];
    const searchLower = organizerSearch.value.toLowerCase();
    return potentialOrganizers.value.filter(student =>
        !organizers.value.includes(student.uid) && // Exclude already added organizers
        (student.name?.toLowerCase().includes(searchLower) || student.uid.includes(searchLower))
    );
});

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
        // Consider fetching in chunks if user count is very large
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

const dateErrorMessages = ref<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' }); // Reactive error messages
const isFindingNextDate = ref<boolean>(false); // Disable button while finding date

const setNextAvailableDate = async () => {
    isFindingNextDate.value = true; // Disable button
    dateErrorMessages.value.startDate = ''; // Clear previous errors
    try {
      // Use the new Vuex action
      const nextDate = await store.dispatch('events/findNextAvailableSlot');
      if (nextDate instanceof Date) {
        // --- Add safeguard check ---
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to midnight for comparison
        // Ensure the found date is not before today
        if (nextDate < today) {
             console.error("findNextAvailableSlot returned a date before today:", nextDate);
             dateErrorMessages.value.startDate = 'Error: Found date is in the past. Please select manually or try again.';
             isFindingNextDate.value = false;
             return; // Stop processing
        }
        // --- End safeguard check ---

        // Format date using local components to avoid timezone shifts from toISOString
        const year = nextDate.getFullYear();
        const month = (nextDate.getMonth() + 1).toString().padStart(2, '0'); // Add 1 to month (0-indexed) and pad
        const day = nextDate.getDate().toString().padStart(2, '0'); // Pad day
        const localDateString = `${year}-${month}-${day}`;

        // 1. Clear endDate first
        endDate.value = '';
        // 2. Set startDate
        startDate.value = localDateString;

        // 3. Wait for Vue's next DOM update cycle
        await nextTick();

        // 4. Now set endDate, ensuring it uses the same correct format
        endDate.value = localDateString;

        dateErrorMessages.value.startDate = 'Next available start date set.'; // Confirmation message
      } else {
        dateErrorMessages.value.startDate = 'No available dates found in the near future.'; // Error message if no date found
      }
    } catch (error: any) {
      console.error('Error finding next available date via store:', error);
      dateErrorMessages.value.startDate = error.message || 'Error finding next available date.'; // Error message on exception
    } finally {
      isFindingNextDate.value = false; // Enable button
    }
  };

const fetchStudents = async () => {
    loadingStudents.value = true;
    errorMessage.value = '';
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        const currentUserId = currentUser.value?.uid;

        // Filter and process students
        const students = querySnapshot.docs
            .map(doc => ({
                uid: doc.id,
                name: doc.data().name || '',
                role: doc.data().role || 'Student'
            }))
            .filter(user =>
                // Only include students (not admins) and exclude current user
                user.role === 'Student' &&
                user.uid !== currentUserId
            )
            .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid));

        // Update name cache first for fetched students
        students.forEach(student => {
            if (student.name) {
                studentNameCache.value[student.uid] = student.name;
            }
        });
        // Ensure current user's name is cached if available and not already present
        if (currentUserId && currentUser.value?.name && !studentNameCache.value[currentUserId]) {
             studentNameCache.value[currentUserId] = currentUser.value.name;
        }

        // Set the filtered and sorted student list for potential organizers
        potentialOrganizers.value = students;

    } catch (error) {
        console.error('Error fetching students:', error);
        errorMessage.value = 'Failed to load student list';
    } finally {
        loadingStudents.value = false;
    }
};


// --- Organizer Management ---
const addOrganizer = (student: Student) => {
    // Limit to 6 total organizers (1 requester + 5 additional)
    if (organizers.value.length < 6 && !organizers.value.includes(student.uid)) {
        organizers.value.push(student.uid);
        // Ensure name is cached if not already
        if (!studentNameCache.value[student.uid]) {
            studentNameCache.value[student.uid] = student.name || student.uid;
        }
        organizerSearch.value = ''; // Clear search input
        showOrganizerDropdown.value = false; // Hide dropdown
    }
};

const removeOrganizer = (uid: string) => {
    // Prevent removing the current user (requester)
    if (uid === currentUser.value?.uid) {
        console.warn("Cannot remove the requester from the organizers list.");
        return;
    }
    organizers.value = organizers.value.filter(id => id !== uid);
};

const handleOrganizerSearchBlur = () => {
    // Delay hiding dropdown to allow click event on list items
    setTimeout(() => { showOrganizerDropdown.value = false; }, 150);
};

// --- Team Helpers ---
const addTeam = () => { teams.value.push({ teamName: '', members: [], isNew: true }); };
const removeTeam = (index: number) => { if (teams.value.length > 1) { teams.value.splice(index, 1); } };
const isStudentAssignedElsewhere = (studentUid: string, currentTeamIndex: number) => teams.value.some((team, index) => index !== currentTeamIndex && team.members.includes(studentUid));
const getTeamAssignmentName = (studentUid: string) => { // Find the name of the team a student is in
     const team = teams.value.find(team => team.members.includes(studentUid));
     return team ? team.teamName : 'Another Team'; // Return team name or generic fallback
 };

// --- Lifecycle Hook ---
onMounted(async () => {
    loadingCheck.value = true;
    hasActiveRequest.value = false;

    // Ensure currentUser is loaded before proceeding
    if (!currentUser.value?.uid) {
        // Maybe wait or show a loading state until user is available
        console.warn("Current user not available yet in onMounted");
        // You might need a watcher on currentUser if it loads asynchronously after mount
    } else {
        // Initialize organizers with the current user
        organizers.value = [currentUser.value.uid];
        // Cache current user's name if available
        if (currentUser.value.name && !studentNameCache.value[currentUser.value.uid]) {
            studentNameCache.value[currentUser.value.uid] = currentUser.value.name;
        }
    }


    try {
        if (!isAdmin.value && currentUser.value?.uid) { // Check if user exists before dispatch
             hasActiveRequest.value = await store.dispatch('events/checkExistingRequests');
        }
    } catch (error) {
        console.error("Error checking existing requests:", error);
        errorMessage.value = "Could not verify existing requests.";
        if (!isAdmin.value) hasActiveRequest.value = true; // Assume active request on error
    } finally { loadingCheck.value = false; }

    // Fetch other students only after current user is confirmed
    if (currentUser.value?.uid) {
        await fetchStudents();
    } else {
        loadingStudents.value = false; // Don't show loading if no user yet
    }
});

// --- Data Preparation ---
// Function to prepare data before submitting to the store action
const prepareSubmissionData = () => {
    // Calculate total XP from criteria
    const totalXp = ratingCriteria.value.reduce((sum, criteria) => sum + criteria.points, 0);

    // Determine status based on user role
    const status = isAdmin.value ? 'Approved' : 'Pending'; // Admins create approved events directly

    return {
        ratingConstraints: ratingCriteria.value.map(c => ({ // Pass the criteria as constraints
            label: c.label.trim() || getDefaultCriteriaLabel(ratingCriteria.value.indexOf(c)), // Use default if empty
            role: c.role || '', // Use role or empty string
            points: c.points
        })),
        xpAllocation: totalXp, // Total XP allocated
        status: status // Set status based on role
    };
};


// New reactive state for rating criteria
const ratingCriteria = ref<{ label: string; role: string; points: number }[]>([
    { label: '', role: '', points: 5 } // Start with one empty constraint
]);

// Default labels helper
const defaultCriteriaLabels = [
    'Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'
];

const getDefaultCriteriaLabel = (index: number) => defaultCriteriaLabels[index] || `Criteria ${index + 1}`;

// Add new method to add/remove constraints
const addConstraint = () => {
    if (ratingCriteria.value.length < 5) {
        ratingCriteria.value.push({ label: '', role: '', points: 5 });
    }
};

const removeConstraint = (index: number) => {
    if (ratingCriteria.value.length > 1) {
        ratingCriteria.value.splice(index, 1);
    }
};

// The handleSubmit function correctly uses the output of prepareSubmissionData
const handleSubmit = async () => {
    errorMessage.value = '';
    isSubmitting.value = true;
    dateErrorMessages.value = { startDate: '', endDate: '' };

    // Ensure requester is always included
    if (currentUser.value?.uid && !organizers.value.includes(currentUser.value.uid)) {
        organizers.value.unshift(currentUser.value.uid); // Add requester if somehow missing
    }

    try {
        const startDateObj = new Date(startDate.value);
        const endDateObj = new Date(endDate.value);

        // *** CHANGE: Allow start and end date to be the same ***
        if (startDateObj > endDateObj) {
            dateErrorMessages.value.endDate = 'End date cannot be earlier than the start date.';
            throw new Error('Invalid date range');
        }

        const commonData = prepareSubmissionData(); // Gets status: 'Approved' if isAdmin

        const finalData = {
            eventName: eventName.value,
            eventType: eventType.value,
            description: description.value,
            isTeamEvent: isTeamEvent.value,
            organizers: [...new Set(organizers.value)], // Use the combined organizers list, ensure uniqueness
            ratingCriteria: commonData.ratingConstraints, // Pass original criteria structure
            xpAllocation: commonData.xpAllocation,
            teams: isTeamEvent.value ? teams.value.map(t => ({
                teamName: t.teamName.trim(),
                members: [...t.members]
                // Submissions/ratings will be initialized by mapper/action
            })) : [],
            // Pass status from commonData
            status: commonData.status,
            // Pass dates based on admin status
            ...(isAdmin.value
                ? { startDate: startDateObj, endDate: endDateObj }
                // For request, pass desired dates
                : { desiredStartDate: startDateObj, desiredEndDate: endDateObj })
        };


        const actionType = isAdmin.value ? 'events/createEvent' : 'events/requestEvent';
        await store.dispatch(actionType, finalData); // Pass the complete finalData

        alert(isAdmin.value ? 'Event created successfully.' : 'Event request submitted successfully.');
        // Redirect based on role
        router.push(isAdmin.value ? '/home' : '/profile'); // Redirect Admin to home after creation

    } catch (error: any) {
        console.error("Event submission error:", error);
        errorMessage.value = error.message || 'Failed to process event submission.';
    } finally {
        isSubmitting.value = false;
    }
};


// reactive state for multi-step form
const currentStep = ref<number>(1);
const availableRoles = [
    { value: 'fullstack', label: 'Full Stack Developer' },
    { value: 'presenter', label: 'Presenter' },
    { value: 'designer', label: 'Designer' },
    { value: 'problemSolver', label: 'Problem Solver' }
];

const handleStep1Submit = (e: Event) => {
    e.preventDefault();
    // Basic validation before proceeding or submitting
    if (!eventName.value || !eventType.value || !description.value || !startDate.value || !endDate.value) {
        errorMessage.value = "Please fill in all required event details.";
        return;
    }
     if (ratingCriteria.value.length < 1 || ratingCriteria.value.some(c => !c.label.trim())) {
        errorMessage.value = "Please define at least one rating criterion with a label.";
        return;
    }
    errorMessage.value = ''; // Clear error if validation passes

    if (isTeamEvent.value) {
        currentStep.value = 2;
    } else {
        handleSubmit();
    }
};

const handleBack = () => {
    if (currentStep.value > 1) {
        currentStep.value--;
    } else {
        router.back();
    }
};

const updateTeams = (newTeams: TeamMember[]) => {
    if (!Array.isArray(newTeams)) return;

    // Map to ensure consistent structure
    teams.value = newTeams.map(team => ({
        teamName: team.teamName || '',
        members: Array.isArray(team.members) ? [...team.members] : [],
        isNew: team.isNew || false
    }));

    // Validate and log team state
    console.log("Teams updated:", teams.value.map(t => ({
        teamName: t.teamName,
        memberCount: t.members.length,
        isNew: t.isNew
    })));
};

// Add state for tracking if new teams can be added
const canAddTeam = ref<boolean>(true);

// Add method to update canAddTeam state
const updateCanAddTeam = (value: boolean) => {
    if (canAddTeam.value !== value) {
        canAddTeam.value = value;
    }
};

// Update hasValidTeams computed to include the new check
const hasValidTeams = computed(() => {
    if (!isTeamEvent.value) return true;

    const teamsArr = teams.value;
    if (!Array.isArray(teamsArr) || teamsArr.length < 2) {
        console.log("hasValidTeams: Need at least 2 teams", teamsArr);
        return false;
    }

    // Check each team's validity
    const isValid = teamsArr.every((team, index) => {
        const hasName = Boolean(team?.teamName?.trim());
        const hasMembers = Array.isArray(team?.members) && team.members.length > 0;

        if (!hasName || !hasMembers) {
            console.log(`Team ${index + 1} validation failed:`, {
                hasName,
                hasMembers,
                memberCount: team?.members?.length
            });
            return false;
        }
        return true;
    });

    return isValid;
});

// Removed findNextAvailableDate as it's now handled by the Vuex action 'findNextAvailableSlot'
</script>

<style scoped>
.form-select[multiple], .form-select[size] { min-height: 100px; max-height: 150px; overflow-y: auto; }
/* Renamed styles */
.organizer-section { position: relative; }
.organizer-dropdown { position: absolute; top: calc(100% - 1px); left: 0; right: 0; z-index: 1050; border: 1px solid var(--bs-border-color); border-top: none; max-height: 200px; overflow-y: auto; background-color: var(--bs-body-bg); box-shadow: var(--bs-box-shadow-sm); border-radius: 0 0 var(--bs-border-radius) var(--bs-border-radius); }
.organizer-dropdown .list-group-item-sm { cursor: pointer; font-size: 0.875rem; padding: 0.25rem 0.5rem; } /* Adjusted padding/font */
.organizer-dropdown .list-group-item-sm:hover { background-color: var(--bs-tertiary-bg); }
.selected-organizers .selected-badge { padding: 0.3em 0.6em; font-size: 0.85em; display: inline-flex; align-items: center; }
.selected-organizers .btn-close { padding: 0.1rem 0.25rem; margin-left: 0.3rem; vertical-align: middle; font-size: 0.7em; line-height: 1; filter: brightness(0) invert(1); opacity: 0.75; } /* Ensure contrast */
.selected-organizers .btn-close:hover { filter: brightness(0) invert(1); opacity: 1; }
.selected-organizers .btn-close:focus { box-shadow: none; }

.team-definition-block { background-color: #f8f9fa; }
.team-member-select { min-height: 150px; }
.team-member-select option:disabled { color: #adb5bd; font-style: italic; }

.progress-steps {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

.step {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background: #e9ecef;
    color: #6c757d;
    text-align: center;
    flex-grow: 1; /* Allow steps to grow */
}

.step.active {
    background: #007bff;
    color: white;
    font-weight: bold;
}

.step.completed {
    background: #28a745;
    color: white;
}

.step.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #e9ecef; /* Keep background consistent but faded */
    color: #6c757d;
}

/* Add styles for the range input */
.form-range {
    height: 2.5rem;
    padding: 0.5rem 0;
}
.form-range::-webkit-slider-thumb {
    background: #0d6efd;
}
.form-range::-moz-range-thumb {
    background: #0d6efd;
}

/* Ensure button on range input is visible */
.position-absolute.top-0.end-0 {
    z-index: 2; /* Ensure it's above the range input track */
    transform: translate(-5px, 5px); /* Adjust position slightly */
}
</style>
