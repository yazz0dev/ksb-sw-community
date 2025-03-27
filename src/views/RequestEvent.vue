// src/views/RequestEvent.vue
<template>
    <div class="container mt-4">
      <div class="d-flex align-items-center mb-4">
        <button class="btn btn-secondary me-3 btn-sm" @click="$router.back()">
          <i class="fas fa-arrow-left me-1"></i>Back
        </button>
        <h2 class="mb-0">{{ isAdmin ? 'Create New Event' : 'Request New Event' }}</h2>
      </div>

      <!-- Loading/Error States -->
       <div v-if="!isAdmin && loadingCheck" class="text-center my-4">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span class="ms-2">Checking existing requests...</span>
       </div>
       <div v-else-if="!isAdmin && hasActiveRequest" class="alert alert-warning" role="alert">
          You already have an active or pending event request. You cannot submit another until it is resolved or cancelled.
      </div>
      <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
       <div v-if="loadingStudents" class="text-center my-4">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span class="ms-2">Loading student list...</span>
       </div>

      <form @submit.prevent="submitRequest" v-if="!loadingCheck && !loadingStudents && (isAdmin || !hasActiveRequest)">
         <div class="card shadow-sm">
            <div class="card-body p-lg-5">

                <!-- Event Details Fields (Name, Type, Desc, Dates) -->
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

                <!-- Team Event Checkbox -->
                <div class="mb-4 form-check">
                  <input type="checkbox" id="isTeamEvent" v-model="isTeamEvent" class="form-check-input" :disabled="isSubmitting" />
                  <label for="isTeamEvent" class="form-check-label">Is this a team event?</label>
                </div>

                <!-- Co-Organizers Section -->
                 <div class="mb-4 co-organizer-section border rounded p-3 bg-light" >
                    <label for="coOrganizerSearch" class="form-label fw-semibold">Add Student Co-Organizers (Optional, max 5):</label>
                    <input
                      type="text"
                      id="coOrganizerSearch"
                      v-model="coOrganizerSearch"
                      @focus="showCoOrganizerDropdown = true"
                      @blur="handleSearchBlur"
                      placeholder="Search students by name or UID..."
                      class="form-control form-control-sm"
                      autocomplete="off"
                      :disabled="isSubmitting || selectedCoOrganizers.length >= 5"
                    />
                    <div v-if="selectedCoOrganizers.length > 0" class="selected-coorganizers mt-2 d-flex flex-wrap gap-1">
                        <span v-for="uid in selectedCoOrganizers" :key="uid" class="badge bg-white text-dark border me-1 selected-badge shadow-sm">
                            {{ studentNameCache[uid] || uid }}
                            <button type="button" class="btn-close btn-close-sm ms-1" @click="removeCoOrganizer(uid)" aria-label="Remove" :disabled="isSubmitting"></button>
                        </span>
                    </div>
                    <ul v-if="showCoOrganizerDropdown && filteredStudentCoOrganizers.length > 0" class="list-group co-organizer-dropdown mt-1">
                         <li v-for="student in filteredStudentCoOrganizers"
                            :key="student.uid"
                            class="list-group-item list-group-item-action list-group-item-sm py-1 px-2"
                            @mousedown.prevent="selectCoOrganizer(student)" >
                             {{ student.name || student.uid }}
                         </li>
                    </ul>
                     <small class="form-text text-muted mt-2 d-block">Click name to add. Click 'x' on badge to remove.</small>
                     <div v-if="selectedCoOrganizers.length >= 5 && !showCoOrganizerDropdown" class="text-danger small mt-1">Maximum 5 co-organizers reached.</div>
                 </div>

                <!-- Team Definition Section (Conditional) -->
                <div v-if="isTeamEvent" class="mb-4 border rounded p-3">
                    <h4 class="mb-3">Define Teams</h4>
                    <div v-for="(team, teamIndex) in teams" :key="teamIndex" class="team-definition-block border rounded p-3 mb-3 bg-white position-relative">
                        <button
                            type="button"
                            class="btn-close position-absolute top-0 end-0 m-2"
                            aria-label="Remove Team"
                            v-if="teams.length > 1"
                            @click="removeTeam(teamIndex)"
                            :disabled="isSubmitting"
                            title="Remove this team"
                        ></button>
                        <div class="mb-3">
                            <label :for="'teamName' + teamIndex" class="form-label fw-semibold">Team {{ teamIndex + 1 }} Name <span class="text-danger">*</span></label>
                            <input
                                type="text"
                                :id="'teamName' + teamIndex"
                                v-model="team.name"
                                required
                                class="form-control form-control-sm"
                                :disabled="isSubmitting"
                                placeholder="Enter unique team name"
                            />
                        </div>
                        <div>
                            <label class="form-label">Assign Members ({{ team.members.length }}):</label>
                            <!-- Simple Multi-Select for team members -->
                            <select
                                multiple
                                class="form-select form-select-sm team-member-select"
                                size="6"
                                v-model="team.members"
                                :disabled="isSubmitting"
                            >
                                <option
                                    v-for="student in availableStudentsForTeams"
                                    :key="student.uid"
                                    :value="student.uid"
                                    :disabled="isStudentAssignedElsewhere(student.uid, teamIndex)"
                                >
                                    {{ studentNameCache[student.uid] || student.uid }}
                                     <span v-if="isStudentAssignedElsewhere(student.uid, teamIndex)" class="text-muted">
                                         <!-- Display which team they are in -->
                                         (in Team {{ getTeamAssignmentName(student.uid) }})
                                     </span>
                                </option>
                            </select>
                             <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple. Students assigned to another team are disabled.</small>
                        </div>
                    </div>
                     <button type="button" @click="addTeam" class="btn btn-outline-secondary btn-sm" :disabled="isSubmitting">
                         <i class="fas fa-plus me-1"></i> Add Another Team
                     </button>
                </div>
                <!-- END Team Definition Section -->

                <!-- Rating Constraints -->
                 <div class="mb-4 border rounded p-3">
                    <label class="form-label d-block mb-2 fw-semibold">Define Rating Criteria (Max 5):</label>
                    <small class="form-text text-muted d-block mb-3">Customize labels for the 5 stars. Defaults used if left blank or fewer than 5 provided.</small>
                    <input type="text" v-model="ratingConstraintsInput[0]" placeholder="Constraint 1 (e.g., Design)" class="form-control form-control-sm mb-2" :disabled="isSubmitting">
                    <input type="text" v-model="ratingConstraintsInput[1]" placeholder="Constraint 2 (e.g., Presentation)" class="form-control form-control-sm mb-2" :disabled="isSubmitting">
                    <input type="text" v-model="ratingConstraintsInput[2]" placeholder="Constraint 3 (e.g., Problem Solving)" class="form-control form-control-sm mb-2" :disabled="isSubmitting">
                    <input type="text" v-model="ratingConstraintsInput[3]" placeholder="Constraint 4 (e.g., Execution)" class="form-control form-control-sm mb-2" :disabled="isSubmitting">
                    <input type="text" v-model="ratingConstraintsInput[4]" placeholder="Constraint 5 (e.g., Technology)" class="form-control form-control-sm mb-2" :disabled="isSubmitting">
                 </div>

                <!-- Submit Button -->
                <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                   <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                   {{ getSubmitButtonText() }}
                </button>
            </div> <!-- End card-body -->
         </div> <!-- End card -->
      </form>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

// --- Watchers ---
watch(isTeamEvent, (newValue) => {
    if (!newValue) {
        teams.value = [{ name: '', members: [] }]; // Reset if switching to individual
    } else if (teams.value.length === 0) {
         teams.value = [{ name: '', members: [] }];
    }
});

// --- Helper Functions ---
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
const submitRequest = async () => {
    errorMessage.value = '';
    isSubmitting.value = true;

    // 1. Basic & Date Validation
    if (!eventName.value || !eventType.value || !description.value || !startDate.value || !endDate.value) {
        errorMessage.value = 'Please fill in all required fields (Name, Type, Description, Dates).';
        isSubmitting.value = false; return;
    }
     let startDateObj, endDateObj;
     try {
         startDateObj = new Date(startDate.value); endDateObj = new Date(endDate.value);
         if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) throw new Error("Invalid date format.");
         if (startDateObj >= endDateObj) throw new Error("End date must be after the start date.");
         if (startDateObj < new Date(minDate.value)) throw new Error("Start date cannot be in the past.");
     } catch (dateError) {
         errorMessage.value = dateError.message || "Invalid date selection.";
         isSubmitting.value = false; return;
     }

    // 2. Team Validation
    let finalTeams = [];
    if (isTeamEvent.value) {
        const assignedStudents = new Set();
        const teamNamesLower = new Set(); // For uniqueness check

        for (let i = 0; i < teams.value.length; i++) {
            const team = teams.value[i]; const teamName = team.name.trim();
            if (!teamName) { errorMessage.value = `Team ${i + 1} needs a name.`; isSubmitting.value = false; return; }
            const teamNameLower = teamName.toLowerCase();
            if (teamNamesLower.has(teamNameLower)) { errorMessage.value = `Team name "${teamName}" is used more than once.`; isSubmitting.value = false; return; }
            teamNamesLower.add(teamNameLower);
            if (!Array.isArray(team.members) || team.members.length === 0) { errorMessage.value = `Team "${teamName}" needs at least one member.`; isSubmitting.value = false; return; }
            for (const memberUid of team.members) {
                if (assignedStudents.has(memberUid)) { errorMessage.value = `Student ${studentNameCache.value[memberUid] || memberUid} is assigned to multiple teams.`; isSubmitting.value = false; return; }
                assignedStudents.add(memberUid);
            }
            // Prepare team object for submission (without reactivity wrappers)
            finalTeams.push({ teamName: teamName, members: [...team.members] });
        }
        if (finalTeams.length === 0) { errorMessage.value = 'Please define at least one team for a team event.'; isSubmitting.value = false; return; }
    }

    // 3. Process Rating Constraints
    const defaultConstraints = ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'];
    let finalConstraints = ratingConstraintsInput.value.map(c => c.trim()).filter(c => c !== '');
    if (finalConstraints.length === 0) { finalConstraints = [...defaultConstraints]; }
    else {
         let defaultsToAdd = defaultConstraints.slice();
         finalConstraints = finalConstraints.slice(0, 5);
         let i = 0; while (finalConstraints.length < 5 && i < defaultsToAdd.length) { if (!finalConstraints.includes(defaultsToAdd[i])) { finalConstraints.push(defaultsToAdd[i]); } i++; }
         let placeholderNum = 1; while (finalConstraints.length < 5) { finalConstraints.push(`Criteria ${placeholderNum++}`); }
    }

    // 4. Prepare Data Payload
    const commonData = {
        eventName: eventName.value, eventType: eventType.value, description: description.value,
        isTeamEvent: isTeamEvent.value, coOrganizers: selectedCoOrganizers.value, ratingConstraints: finalConstraints,
        teams: isTeamEvent.value ? finalTeams : [],
        participants: [] // Store action will populate this if individual
    };

    try {
        // 5. Dispatch Action based on Role
        if (isAdmin.value) {
            const eventData = { ...commonData, startDate: startDate.value, endDate: endDate.value };
            await store.dispatch('events/createEvent', eventData);
            alert('Event created successfully.');
            router.push('/home');
        } else {
             const stillHasActive = await store.dispatch('events/checkExistingRequests');
             if (stillHasActive) { errorMessage.value = 'You already have an active or pending event request.'; hasActiveRequest.value = true; isSubmitting.value = false; return; }
            const requestData = { ...commonData, desiredStartDate: startDate.value, desiredEndDate: endDate.value };
            await store.dispatch('events/requestEvent', requestData);
            alert('Event request submitted successfully.');
            router.push('/profile');
        }
    } catch (error) {
        errorMessage.value = error.message || 'Failed to process event submission.';
        console.error("Event submission error:", error);
    } finally {
        isSubmitting.value = false;
    }
};

// Helper for button text
const getSubmitButtonText = () => (isSubmitting.value ? (isAdmin.value ? 'Creating...' : 'Submitting...') : (isAdmin.value ? 'Create Event' : 'Submit Request'));

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
</style>