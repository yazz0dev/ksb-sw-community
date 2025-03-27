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
                        <input type="date" :id="isAdmin ? 'startDate' : 'desiredStartDate'" v-model="startDate" required class="form-control" :min="minDate" :disabled="isSubmitting"/>
                    </div>
                    <div class="col-md-6">
                        <label :for="isAdmin ? 'endDate' : 'desiredEndDate'" class="form-label">
                            {{ isAdmin ? 'End Date' : 'Desired End Date' }} <span class="text-danger">*</span>
                        </label>
                        <input type="date" :id="isAdmin ? 'endDate' : 'desiredEndDate'" v-model="endDate" required class="form-control" :min="startDate || minDate" :disabled="isSubmitting"/>
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
                                    XP Points (0-50)
                                </label>
                                <input type="number" :id="'xpPoints'+index" 
                                       v-model.number="criteria.points"
                                       class="form-control"
                                       min="0" max="50">
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
        <div v-else-if="currentStep === 2">
            <ManageTeamsComponent
                :initial-teams="teams"
                :students="potentialStudentCoOrganizers"
                :name-cache="studentNameCache"
                :is-submitting="isSubmitting"
                @update:teams="updateTeams"
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

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { collection, getDocs, query, doc, getDoc, Timestamp } from 'firebase/firestore'; // Add Timestamp
import { db } from '../firebase';
import ManageTeamsComponent from '../components/ManageTeamsComponent.vue'; // Add this import

// --- Form Fields ---
const eventName = ref('');
const eventType = ref('Hackathon');
const description = ref('');
const startDate = ref('');
const endDate = ref('');
const isTeamEvent = ref(false);
const ratingConstraintsInput = ref(['', '', '', '', '']);
const selectedCoOrganizers = ref([]);

// --- Team Definition State ---
const teams = ref([{ name: '', members: [] }]); // Start with one empty team object

// --- Co-organizer State ---
const potentialStudentCoOrganizers = ref([]);
const studentNameCache = ref({});
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);

// --- General State ---
const store = useStore();
const router = useRouter();
const errorMessage = ref('');
const hasActiveRequest = ref(false);
const loadingCheck = ref(true);
const loadingStudents = ref(true);
const isSubmitting = ref(false);

// --- Computed ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin' );
const minDate = computed(() => {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
});
const filteredStudentCoOrganizers = computed(() => {
    if (!coOrganizerSearch.value) {
        return potentialStudentCoOrganizers.value
            .filter(s => !selectedCoOrganizers.value.includes(s.uid))
            .slice(0, 10);
    }
    const searchLower = coOrganizerSearch.value.toLowerCase();
    return potentialStudentCoOrganizers.value.filter(student =>
        !selectedCoOrganizers.value.includes(student.uid) &&
        ( (student.name || '').toLowerCase().includes(searchLower) ||
          (student.uid || '').toLowerCase().includes(searchLower) )
    ).slice(0, 10);
});
const availableStudentsForTeams = computed(() => potentialStudentCoOrganizers.value);

// --- Helper Functions ---
const getSubmitButtonText = () => {
    if (isSubmitting.value) return 'Submitting...';
    if (isAdmin.value) return 'Create Event';
    return 'Submit Event Request';
};

async function fetchUserNames(userIds) {
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

async function fetchStudents() {
    loadingStudents.value = true;
    errorMessage.value = ''; // Clear previous student loading errors
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        const currentUserId = currentUser.value?.uid;

        const studentsData = querySnapshot.docs
            .map(doc => ({ uid: doc.id, name: doc.data().name || null, role: doc.data().role || null }))
            .filter(user => (user.role === 'Student' || !user.role) && user.uid !== currentUserId) // Exclude self, include 'Student' or no role
             .sort((a, b) => (a.name || a.uid).localeCompare(b.name || b.uid)); // Sort alpha

        if (studentsData.length > 0) {
            const studentIds = studentsData.map(s => s.uid);
            await fetchUserNames(studentIds); // Fetch names for the dropdowns
            potentialStudentCoOrganizers.value = studentsData;
        } else {
             potentialStudentCoOrganizers.value = [];
             console.warn("No potential student co-organizers or team members found.");
        }
    } catch (error) {
        console.error('RequestEvent: Error fetching students:', error);
        errorMessage.value = (errorMessage.value ? errorMessage.value + '\n' : '') + 'Could not load student list.';
        potentialStudentCoOrganizers.value = [];
    } finally {
        loadingStudents.value = false;
    }
}

const selectCoOrganizer = (student) => {
    if (selectedCoOrganizers.value.length < 5 && !selectedCoOrganizers.value.includes(student.uid)) {
        selectedCoOrganizers.value.push(student.uid);
        if (!studentNameCache.value[student.uid]) { studentNameCache.value[student.uid] = student.name || student.uid; }
        coOrganizerSearch.value = ''; showCoOrganizerDropdown.value = false;
    }
};
const removeCoOrganizer = (uid) => { selectedCoOrganizers.value = selectedCoOrganizers.value.filter(id => id !== uid); };
const handleSearchBlur = () => { setTimeout(() => { showCoOrganizerDropdown.value = false; }, 150); };

// --- Team Helpers ---
const addTeam = () => { teams.value.push({ name: '', members: [] }); };
const removeTeam = (index) => { if (teams.value.length > 1) { teams.value.splice(index, 1); } };
const isStudentAssignedElsewhere = (studentUid, currentTeamIndex) => teams.value.some((team, index) => index !== currentTeamIndex && team.members.includes(studentUid));
const getTeamAssignmentName = (studentUid) => { // Find the name of the team a student is in
     const team = teams.value.find(team => team.members.includes(studentUid));
     return team ? team.name : 'Another Team'; // Return team name or generic fallback
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
    await fetchStudents();
});

// --- Form Submission ---
const handleSubmit = async () => {
    errorMessage.value = '';
    isSubmitting.value = true;

    try {
        const submissionData = prepareSubmissionData();

        // Basic validation
        if (!eventName.value || !eventType.value || !description.value || !startDate.value || !endDate.value) {
            throw new Error('Please fill in all required fields.');
        }

        // Team validation if needed
        if (isTeamEvent.value && (!teams.value.length || !teams.value.every(t => t.name && t.members.length))) {
            throw new Error('All teams must have a name and at least one member.');
        }

        // Convert dates to proper format
        const startDateObj = new Date(startDate.value);
        const endDateObj = new Date(endDate.value);
        
        // Prepare final submission data
        const finalData = {
            eventName: eventName.value,
            eventType: eventType.value,
            description: description.value,
            isTeamEvent: isTeamEvent.value,
            coOrganizers: selectedCoOrganizers.value,
            ratingCriteria: submissionData.ratingConstraints,
            xpAllocation: submissionData.xpAllocation,
            teams: isTeamEvent.value ? teams.value.map(t => ({
                teamName: t.name,
                members: t.members
            })) : [],
            requestedAt: Timestamp.now()
        };

        // Add date fields based on user role
        if (isAdmin.value) {
            finalData.startDate = startDateObj;
            finalData.endDate = endDateObj;
        } else {
            finalData.desiredStartDate = startDateObj;
            finalData.desiredEndDate = endDateObj;
        }

        // Always use requestEvent for non-admins
        const actionType = isAdmin.value ? 'events/createEvent' : 'events/requestEvent';
        const eventId = await store.dispatch(actionType, finalData);
        
        alert(isAdmin.value ? 'Event created successfully.' : 'Event request submitted successfully.');
        router.push(isAdmin.value ? '/home' : '/profile');
    } catch (error) {
        console.error("Event submission error:", error);
        errorMessage.value = error.message || 'Failed to process event submission.';
    } finally {
        isSubmitting.value = false;
    }
};

// New reactive state for rating criteria
const ratingCriteria = ref([
    { label: '', role: '', points: 0 } // Start with one empty constraint
]);

// Default labels helper
const defaultCriteriaLabels = [
    'Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'
];

const getDefaultCriteriaLabel = (index) => defaultCriteriaLabels[index] || `Criteria ${index + 1}`;

// Add new method to add/remove constraints
const addConstraint = () => {
    if (ratingCriteria.value.length < 5) {
        ratingCriteria.value.push({ label: '', role: '', points: 0 });
    }
};

const removeConstraint = (index) => {
    if (ratingCriteria.value.length > 1) {
        ratingCriteria.value.splice(index, 1);
    }
};

// Modified submission preparation
const prepareSubmissionData = () => {
    // Prepare XP allocation and constraints
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
        // ...existing event data...
        xpAllocation,
        ratingConstraints: constraints,
        status: isAdmin.value ? 'Approved' : 'Pending',
        requester: currentUser.value.uid,
        requestedAt: Timestamp.now(),
        // ...rest of the submission data
    };
};

// New reactive state for multi-step form
const currentStep = ref(1);
const availableRoles = [
    { value: 'fullstack', label: 'Full Stack Developer' },
    { value: 'presenter', label: 'Presenter' },
    { value: 'designer', label: 'Designer' },
    { value: 'problemSolver', label: 'Problem Solver' }
];

const handleStep1Submit = (e) => {
    e.preventDefault();
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

const updateTeams = (newTeams) => {
    teams.value = newTeams;
};

const hasValidTeams = computed(() => {
    return teams.value.length > 0 && 
           teams.value.every(team => team.name && team.members.length > 0);
});
</script>

<style scoped>
.form-select[multiple], .form-select[size] { min-height: 100px; max-height: 150px; overflow-y: auto; }
.co-organizer-section { position: relative; }
.co-organizer-dropdown { position: absolute; top: calc(100% - 1px); left: 0; right: 0; z-index: 1050; border: 1px solid var(--color-border); border-top: none; max-height: 200px; overflow-y: auto; background-color: var(--color-surface); box-shadow: var(--shadow-md); border-radius: 0 0 var(--border-radius) var(--border-radius); }
.co-organizer-dropdown .list-group-item-sm { cursor: pointer; font-size: var(--font-size-sm); }
.co-organizer-dropdown .list-group-item-sm:hover { background-color: var(--color-background); }
.selected-coorganizers .selected-badge { padding: var(--space-1) var(--space-2); font-size: 0.85em; display: inline-flex; align-items: center; }
.selected-coorganizers .btn-close { padding: 0.1rem 0.25rem; margin-left: 0.3rem; vertical-align: middle; font-size: 0.7em; line-height: 1; filter: grayscale(1); }
.selected-coorganizers .btn-close:hover { filter: none; }
.selected-coorganizers .btn-close:focus { box-shadow: none; }

.team-definition-block { background-color: #f8f9fa; }
.team-member-select { min-height: 150px; }
.team-member-select option:disabled { color: #adb5bd; font-style: italic; }

.progress-steps {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
}

.step {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background: #e9ecef;
    color: #6c757d;
}

.step.active {
    background: #007bff;
    color: white;
}

.step.completed {
    background: #28a745;
    color: white;
}

.step.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>