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
                :students="potentialStudentCoOrganizers"
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
import { computed, onMounted, ref } from 'vue';
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
const errorMessage = ref<string>('');
const hasActiveRequest = ref<boolean>(false);
const loadingCheck = ref<boolean>(true);
const loadingStudents = ref<boolean>(true);
const isSubmitting = ref<boolean>(false);

// --- Computed ---
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin' );
const minDate = computed(() => {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
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
      const nextDate = await findNextAvailableDate();
      if (nextDate instanceof Date) {
        startDate.value = nextDate.toISOString().split('T')[0];
        endDate.value = startDate.value; // Set end date to same day
        dateErrorMessages.value.startDate = 'Next available start date set.'; // Confirmation message
      } else {
        dateErrorMessages.value.startDate = 'No available dates found in the next 30 days.'; // Error message if no date found
      }
    } catch (error) {
      console.error('Error finding next available date:', error);
      dateErrorMessages.value.startDate = 'Error finding next available date.'; // Error message on exception
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

        // Update name cache first
        students.forEach(student => {
            if (student.name) {
                studentNameCache.value[student.uid] = student.name;
            }
        });

        // Set the filtered and sorted student list
        potentialStudentCoOrganizers.value = students;

    } catch (error) {
        console.error('Error fetching students:', error);
        errorMessage.value = 'Failed to load student list';
    } finally {
        loadingStudents.value = false;
    }
};



const addCoOrganizer = (student: Student) => {
    if (selectedCoOrganizers.value.length < 5 && !selectedCoOrganizers.value.includes(student.uid)) {
        selectedCoOrganizers.value.push(student.uid);
        if (!studentNameCache.value[student.uid]) { studentNameCache.value[student.uid] = student.name || student.uid; }
        coOrganizerSearch.value = ''; showCoOrganizerDropdown.value = false;
    }
};
const removeCoOrganizer = (uid: string) => { selectedCoOrganizers.value = selectedCoOrganizers.value.filter(id => id !== uid); };
const handleSearchBlur = () => { setTimeout(() => { showCoOrganizerDropdown.value = false; }, 150); };

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
    try {
        if (!isAdmin.value) { hasActiveRequest.value = await store.dispatch('events/checkExistingRequests'); }
    } catch (error) {
        console.error("Error checking existing requests:", error);
        errorMessage.value = "Could not verify existing requests.";
        if (!isAdmin.value) hasActiveRequest.value = true;
    } finally { loadingCheck.value = false; }
    await fetchStudents();
});

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
            coOrganizers: selectedCoOrganizers.value,
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

// Add new helper function to find next available date
const findNextAvailableDate = async (): Promise<Date | null> => {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + 1); // Start from tomorrow
    
    let foundDate: Date | null = null;
    let attempts = 0;
    const maxAttempts = 30; // Limit search to next 30 days
  
    while (!foundDate && attempts < maxAttempts) {
      const conflict = await store.dispatch('events/checkDateConflict', {
        startDate: checkDate,
        endDate: new Date(checkDate)
      });
  
      if (!conflict) {
        foundDate = new Date(checkDate);
        break;
      }
      checkDate.setDate(checkDate.getDate() + 1);
      attempts++;
    }
  
    return foundDate;
  };
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
</style>