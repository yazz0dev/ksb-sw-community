<template>
    <div class="container">
      <div class="d-flex align-items-center mb-4">
        <button class="btn btn-secondary me-3" @click="$router.back()">
          <i class="fas fa-arrow-left me-2"></i>Back
        </button>
        <h2 class="mb-0">{{ isAdmin ? 'Create New Event' : 'Request New Event' }}</h2>
      </div>

       <div v-if="hasActiveRequest && !loadingCheck && !isAdmin" class="alert alert-warning" role="alert">
          You already have an active or pending event request. You cannot submit another until it is resolved.
      </div>
      <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
       <div v-if="loadingCheck || loadingStudents">Checking prerequisites...</div>

      <form @submit.prevent="submitRequest" v-if="!loadingCheck && !loadingStudents && (isAdmin || !hasActiveRequest)">
        <!-- Event Name -->
        <div class="mb-3">
          <label for="eventName" class="form-label">Event Name:</label>
          <input type="text" id="eventName" v-model="eventName" required class="form-control" />
        </div>
        <!-- Event Type -->
        <div class="mb-3">
            <label for="eventType" class="form-label">Event Type:</label>
            <select id="eventType" v-model="eventType" required class="form-select" size="5">
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
        <!-- Description -->
        <div class="mb-3">
          <label for="description" class="form-label">Description:</label>
          <textarea id="description" v-model="description" required class="form-control" rows="4"></textarea>
        </div>
        <!-- Dates -->
         <div class="row mb-3">
             <div class="col-md-6">
                 <label for="desiredStartDate" class="form-label">Desired Start Date:</label>
                 <input type="date" id="desiredStartDate" v-model="desiredStartDate" required class="form-control" :min="minDate"/>
             </div>
             <div class="col-md-6">
                 <label for="desiredEndDate" class="form-label">Desired End Date:</label>
                 <input type="date" id="desiredEndDate" v-model="desiredEndDate" required class="form-control" :min="desiredStartDate || minDate"/>
             </div>
         </div>
        <!-- Team Event Checkbox -->
        <div class="mb-3 form-check">
          <input type="checkbox" id="isTeamEvent" v-model="isTeamEvent" class="form-check-input" />
          <label for="isTeamEvent" class="form-check-label">Is this a team event?</label>
        </div>

         <!-- Co-Organizers Selection (Students) - NEW UI -->
         <div class="mb-3 co-organizer-section">
            <label for="coOrganizerSearch" class="form-label">Add Student Co-Organizers (Optional, max 5):</label>
            <!-- Search Input -->
             <input
                type="text"
                id="coOrganizerSearch"
                v-model="coOrganizerSearch"
                @focus="showCoOrganizerDropdown = true"
                @blur="handleSearchBlur"
                placeholder="Search students by name or UID..."
                class="form-control"
                autocomplete="off"
             />
            <!-- Selected Co-Organizers Display -->
            <div v-if="selectedCoOrganizers.length > 0" class="selected-coorganizers mt-2">
                <span v-for="uid in selectedCoOrganizers" :key="uid" class="badge bg-light text-dark border me-1 selected-badge">
                    {{ studentNameCache[uid] || uid }}
                    <button type="button" class="btn-close btn-close-sm ms-1" @click="removeCoOrganizer(uid)" aria-label="Remove"></button>
                </span>
            </div>
             <!-- Search Results Dropdown -->
            <ul v-if="showCoOrganizerDropdown && filteredStudentCoOrganizers.length > 0" class="list-group co-organizer-dropdown">
                <li v-for="student in filteredStudentCoOrganizers"
                    :key="student.uid"
                    class="list-group-item list-group-item-action"
                    @mousedown.prevent="selectCoOrganizer(student)" > 
                    {{ student.name || student.uid }}
                </li>
            </ul>
             <small class="form-text text-muted">Click name to add. Click 'x' on badge to remove.</small>
             <div v-if="selectedCoOrganizers.length >= 5" class="text-danger small mt-1">Maximum 5 co-organizers reached.</div>
         </div>


         <!-- Rating Constraints Definition -->
         <div class="mb-3 border p-3 rounded">
            <label class="form-label d-block mb-2">Define Rating Criteria (Max 5):</label>
            <small class="form-text text-muted d-block mb-3">Customize labels for the 5 stars. Defaults used if left blank.</small>
            <input type="text" v-model="ratingConstraintsInput[0]" placeholder="Constraint 1 (e.g., Design)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[1]" placeholder="Constraint 2 (e.g., Presentation)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[2]" placeholder="Constraint 3 (e.g., Problem Solving)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[3]" placeholder="Constraint 4 (e.g., Execution)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[4]" placeholder="Constraint 5 (e.g., Technology)" class="form-control mb-2">
         </div>

        <button type="submit" class="btn btn-primary">
           {{ isAdmin ? 'Create Event' : 'Submit Request' }}
        </button>
      </form>
    </div>
  </template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'; // Added doc, getDoc
import { db } from '../firebase';

// --- Refs for Form Fields ---
const eventName = ref('');
const eventType = ref('Hackathon'); // Default value
const description = ref('');
const desiredStartDate = ref('');
const desiredEndDate = ref('');
const isTeamEvent = ref(false);
const ratingConstraintsInput = ref(['', '', '', '', '']);

// --- Refs for Co-organizer Selection ---
const selectedCoOrganizers = ref([]); // Stores selected UIDs
const potentialStudentCoOrganizers = ref([]); // Stores fetched student data {uid, name, role}
const studentNameCache = ref({}); // Simple cache { uid: name }
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);
const loadingStudents = ref(true); // Loading state for students

// --- General State Refs ---
const store = useStore();
const router = useRouter();
const errorMessage = ref('');
const hasActiveRequest = ref(false);
const loadingCheck = ref(true); // Loading state for request check

// --- Computed Properties ---
const currentUser = computed(() => store.getters['user/getUser']);
const currentUserRole = computed(() => currentUser.value?.role);
const isAdmin = computed(() => currentUserRole.value === 'Admin' || currentUserRole.value === 'Teacher');

const minDate = computed(() => {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  return today.toISOString().split('T')[0];
});

// Filter students based on search input
const filteredStudentCoOrganizers = computed(() => {
    if (!coOrganizerSearch.value) {
        // Show all potential students not already selected, limit initial list size?
        return potentialStudentCoOrganizers.value.filter(s => !selectedCoOrganizers.value.includes(s.uid)).slice(0, 10); // Show max 10 initially
    }
    const searchLower = coOrganizerSearch.value.toLowerCase();
    return potentialStudentCoOrganizers.value.filter(student =>
        !selectedCoOrganizers.value.includes(student.uid) && // Exclude already selected
        ( (student.name || '').toLowerCase().includes(searchLower) ||
          (student.uid || '').toLowerCase().includes(searchLower) )
    );
});

// --- Helper Functions ---

// Fetch user names (only needed for cache if not fetched elsewhere)
async function fetchUserNames(userIds) {
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
        console.error("Error batch fetching user names:", error);
         idsToFetch.forEach(id => {
             if (!studentNameCache.value.hasOwnProperty(id)) studentNameCache.value[id] = id;
         });
    }
}

// Fetch students (similar to ManageTeams)
async function fetchStudents() {
    loadingStudents.value = true;
    errorMessage.value = ''; // Clear previous errors
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef); // Fetch all users
        const querySnapshot = await getDocs(q);
        const currentUserId = currentUser.value?.uid; // Get current user ID

        const studentsData = querySnapshot.docs
            .map(doc => ({
                uid: doc.id,
                name: doc.data().name || null,
                role: doc.data().role || null
            }))
            .filter(user => (user.role === 'Student' || !user.role) && user.uid !== currentUserId); // Exclude self

        if (studentsData.length > 0) {
            const studentIds = studentsData.map(s => s.uid);
            await fetchUserNames(studentIds); // Populate cache
            potentialStudentCoOrganizers.value = studentsData;
        } else {
             console.warn("RequestEvent: No potential student co-organizers found.");
            potentialStudentCoOrganizers.value = [];
        }
    } catch (error) {
        console.error('RequestEvent: Error fetching students:', error);
        errorMessage.value = (errorMessage.value ? errorMessage.value + '\n' : '') + 'Could not load student list.';
        potentialStudentCoOrganizers.value = [];
    } finally {
        loadingStudents.value = false;
    }
}

// --- Co-organizer Selection/Removal ---
const selectCoOrganizer = (student) => {
    if (selectedCoOrganizers.value.length < 5 && !selectedCoOrganizers.value.includes(student.uid)) {
        selectedCoOrganizers.value.push(student.uid);
        // Cache name if not already present (though fetchStudents should handle it)
        if (!studentNameCache.value[student.uid]) {
             studentNameCache.value[student.uid] = student.name || student.uid;
        }
        coOrganizerSearch.value = ''; // Clear search after selection
        showCoOrganizerDropdown.value = false; // Hide dropdown
    } else if (selectedCoOrganizers.value.length >= 5) {
         // Optionally show a temporary message
         console.warn("Maximum co-organizers reached.");
    }
};

const removeCoOrganizer = (uid) => {
    selectedCoOrganizers.value = selectedCoOrganizers.value.filter(id => id !== uid);
};

// Hide dropdown on blur, but delay slightly to allow click selection
const handleSearchBlur = () => {
    setTimeout(() => {
        showCoOrganizerDropdown.value = false;
    }, 150); // Delay ms
};

// --- Lifecycle Hook ---
onMounted(async () => {
    loadingCheck.value = true;
    try {
        if (!isAdmin.value) {
            hasActiveRequest.value = await store.dispatch('events/checkExistingRequests');
        } else {
             hasActiveRequest.value = false;
        }
    } catch (error) {
        console.error("Error checking existing requests:", error);
        errorMessage.value = "Could not verify existing requests. Please try again.";
        if (!isAdmin.value) hasActiveRequest.value = true;
    } finally {
        loadingCheck.value = false;
    }
    // Fetch students needed for co-organizer selection
    await fetchStudents();
});

// --- Form Submission ---
const submitRequest = async () => {
    errorMessage.value = '';
    // Validation... (remains the same)
    if (!eventName.value || !eventType.value || !description.value || !desiredStartDate.value || !desiredEndDate.value) {
            errorMessage.value = 'Please fill in all required fields.'; return;
    }
    if (new Date(desiredStartDate.value) >= new Date(desiredEndDate.value)) {
        errorMessage.value = 'End date must be strictly after the start date.'; return;
    }
     if (new Date(desiredStartDate.value) < new Date(minDate.value)) {
            errorMessage.value = 'Start date cannot be in the past.'; return;
    }

    // Process constraints... (remains the same)
    const defaultConstraints = ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'];
    let finalConstraints = ratingConstraintsInput.value.map(c => c.trim()).filter(c => c !== '');
    if (finalConstraints.length === 0) { finalConstraints = [...defaultConstraints]; }
    else {
         let defaultsToAdd = defaultConstraints.filter(def => !finalConstraints.includes(def));
         while(finalConstraints.length < 5 && defaultsToAdd.length > 0) { finalConstraints.push(defaultsToAdd.shift()); }
         if (finalConstraints.length > 5) { finalConstraints = finalConstraints.slice(0, 5); }
         let i = 1;
         while (finalConstraints.length < 5) { finalConstraints.push(`Constraint ${i++}`); }
    }

    // --- Conditional Dispatch Logic ---
    try {
        // Include the selected student co-organizer UIDs
        const commonData = {
            eventName: eventName.value,
            eventType: eventType.value,
            description: description.value,
            isTeamEvent: isTeamEvent.value,
            coOrganizers: selectedCoOrganizers.value, // Use the selected UIDs
            ratingConstraints: finalConstraints,
        };

        if (isAdmin.value) {
            const eventData = { ...commonData, startDate: desiredStartDate.value, endDate: desiredEndDate.value };
            await store.dispatch('events/createEvent', eventData);
            alert('Event created successfully.');
            router.push('/home');
        } else {
             const stillHasActive = await store.dispatch('events/checkExistingRequests');
             if (stillHasActive) { errorMessage.value = 'You already have an active or pending event request.'; return; }
            const requestData = { ...commonData, desiredStartDate: desiredStartDate.value, desiredEndDate: desiredEndDate.value };
            await store.dispatch('events/requestEvent', requestData);
            alert('Event request submitted successfully.');
            router.push('/profile');
        }
    } catch (error) {
        errorMessage.value = error.message || 'Failed to process event submission. Please try again.';
        console.error("Event submission error:", error);
    }
};

</script>

<style scoped>
.form-select[multiple], .form-select[size] {
    min-height: 100px;
    max-height: 150px;
    overflow-y: auto;
}

/* Styles for Co-organizer Search */
.co-organizer-section {
    position: relative; /* Needed for absolute positioning of dropdown */
}
.co-organizer-dropdown {
    position: absolute;
    top: 100%; /* Position below the input */
    left: 0;
    right: 0;
    z-index: 1000; /* Ensure it's above other elements */
    border: 1px solid var(--color-border);
    border-top: none; /* Optional: remove top border if directly below input */
    max-height: 200px;
    overflow-y: auto;
    background-color: var(--color-surface);
    box-shadow: var(--shadow-md);
    border-radius: 0 0 var(--border-radius) var(--border-radius); /* Round bottom corners */
}
.co-organizer-dropdown .list-group-item {
    cursor: pointer;
    padding: var(--space-2) var(--space-4);
}
.co-organizer-dropdown .list-group-item:hover {
    background-color: var(--color-background);
}
.selected-coorganizers .selected-badge {
    padding-top: var(--space-1);
    padding-bottom: var(--space-1);
    font-size: 0.9em;
}
.selected-coorganizers .btn-close {
     /* Adjust size and position */
     padding: 0.1rem 0.25rem;
     margin-left: 0.3rem;
     vertical-align: middle;
     font-size: 0.7em; /* Make 'x' smaller */
     line-height: 1;
}
.selected-coorganizers .btn-close:focus {
     box-shadow: none; /* Remove focus ring on close button */
}
</style>