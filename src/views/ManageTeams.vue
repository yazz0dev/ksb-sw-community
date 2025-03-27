// src/views/ManageTeams.vue
<template>
    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap"> 
            <h2 class="mb-0 me-3">Manage Teams for {{ event?.eventName || 'Event' }}</h2>
            <button @click="goBack" class="btn btn-secondary btn-sm mt-2 mt-md-0">
                <i class="fas fa-arrow-left me-1"></i> Back to Event
            </button>
        </div>

        <div v-if="loadingEvent || !hasPermission" class="text-center my-5">
             <div v-if="loadingEvent">
                <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
            </div>
             <div v-else-if="!hasPermission" class="alert alert-danger">You do not have permission to manage teams for this event.</div>
        </div>

        <div v-else-if="event">

            <section class="mb-4">
                <h3 class="mb-3">Existing Teams</h3>
                <div v-if="!event.teams || event.teams.length === 0" class="alert alert-light">No teams created yet.</div>
                <div v-else>
                     <div v-for="team in sortedTeams" :key="team.teamName" class="card card-body mb-2 shadow-sm position-relative">
                        <h5 class="card-title mb-1">{{ team.teamName }}</h5>
                        <div v-if="team.members && team.members.length > 0" class="d-flex flex-wrap gap-1">
                            <span v-for="memberId in team.members" :key="memberId" class="badge bg-light text-dark border">
                                {{ nameCache[memberId] || memberId }}
                            </span>
                        </div>
                         <p v-else class="text-muted small mb-0">No members assigned.</p>
                         <button @click="deleteTeam(team.teamName)" class="btn btn-outline-danger btn-sm position-absolute top-0 end-0 m-2 p-1 lh-1" title="Delete Team"> 
                             <i class="fas fa-trash fa-sm"></i> 
                         </button>
                    </div>
                </div>
            </section>
            <hr class="my-4"> 

            <section>
                <h3 class="mb-3">Add New Team</h3>
                <div v-if="addTeamErrorMessage" class="alert alert-danger" role="alert">{{ addTeamErrorMessage }}</div>
                <form @submit.prevent="addTeam">
                    <div class="mb-3">
                        <label for="teamName" class="form-label">New Team Name:</label>
                        <input type="text" id="teamName" v-model="newTeamName" required class="form-control" />
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Select Students ({{ newSelectedStudents.length }} selected):</label>
                         <input type="text" v-model="studentSearch" placeholder="Search students by name or UID..." class="form-control form-control-sm mb-2">

                        <div v-if="loadingStudents" class="text-center p-3">
                             <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading students...</span>
                            </div>
                        </div>

                        <div v-else class="student-selection-container border rounded p-2" style="max-height: 300px; overflow-y: auto;">
                             <div v-if="filteredStudents.length === 0" class="text-muted p-2">
                                No students found{{ studentSearch ? ' matching search.' : '.' }}
                            </div>
                             <div v-else>
                                 <div v-for="student in filteredStudents" :key="student.uid"
                                     class="form-check student-selection-item"
                                     :class="{ 'student-selected': newSelectedStudents.includes(student.uid), 'student-disabled': assignedStudentIds.has(student.uid) }">
                                    <input
                                        type="checkbox"
                                        :id="'add-' + student.uid"
                                        :value="student.uid"
                                        v-model="newSelectedStudents"
                                        :disabled="assignedStudentIds.has(student.uid)"
                                        class="form-check-input"
                                    />
                                    <label :for="'add-' + student.uid" class="form-check-label">
                                        {{ nameCache[student.uid] || student.uid }}
                                        <span v-if="assignedStudentIds.has(student.uid)" class="small text-muted"> (in team: {{ getTeamNameForStudent(student.uid) }})</span>
                                    </label>
                                 </div>
                             </div>
                        </div>
                         <small class="form-text text-muted mt-1 d-block">Students already assigned to a team are disabled.</small>
                    </div>

                    <button type="submit" class="btn btn-primary" :disabled="addingTeam || newSelectedStudents.length === 0 || !newTeamName.trim()">
                         <span v-if="addingTeam" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        {{ addingTeam ? 'Adding...' : 'Add Team' }}
                    </button>
                </form>
            </section>

        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'; // Added watch
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { collection, getDocs, query, doc, getDoc, updateDoc } from 'firebase/firestore'; // where removed
import { db } from '../firebase';

const route = useRoute();
const router = useRouter();
const store = useStore();
const eventId = route.params.id;

// State
const event = ref(null); // Store fetched event details
const loadingEvent = ref(true);
const allStudents = ref([]);
const loadingStudents = ref(true);
const studentSearch = ref('');
const newTeamName = ref('');
const newSelectedStudents = ref([]);
const addTeamErrorMessage = ref('');
const addingTeam = ref(false);
const hasPermission = ref(false); // Permission state

const nameCache = ref({}); // Cache for student names

// --- Permission Check ---
const currentUser = computed(() => store.getters['user/getUser']);
const checkPermissions = (eventData) => {
     if (!currentUser.value || !eventData) return false;
     const userId = currentUser.value.uid;
     return (
         eventData.organizer === userId ||
         (Array.isArray(eventData.coOrganizers) && eventData.coOrganizers.includes(userId)) ||
         currentUser.value.role === 'Admin'
     );
};


// --- Data Fetching ---
async function fetchUserNames(userIds) {
    const idsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.hasOwnProperty(id));
    if (idsToFetch.length === 0) return;
    try {
        const fetchPromises = idsToFetch.map(async (id) => {
            try {
                const userDocRef = doc(db, 'users', id);
                const docSnap = await getDoc(userDocRef);
                nameCache.value[id] = docSnap.exists() ? (docSnap.data().name || id) : id;
            } catch { nameCache.value[id] = id; }
        });
        await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Error fetching user names:", error);
         idsToFetch.forEach(id => { if (!nameCache.value.hasOwnProperty(id)) nameCache.value[id] = id; });
    }
}

async function fetchEventData() {
    loadingEvent.value = true;
    event.value = null; // Reset event data
    hasPermission.value = false; // Reset permission
    addTeamErrorMessage.value = ''; // Clear previous errors
    try {
        // Fetch fresh details using the action which also caches it
        const fetchedEvent = await store.dispatch('events/fetchEventDetails', eventId);

         if (fetchedEvent && fetchedEvent.isTeamEvent) {
            event.value = fetchedEvent;
            // **** Permission Check ****
            hasPermission.value = checkPermissions(fetchedEvent);
            if (!hasPermission.value) {
                 console.warn("ManageTeams: User does not have permission.");
                 // No need for error message here, handled by v-if
                 return; // Stop further processing if no permission
            }

             const memberIds = (event.value.teams || []).flatMap(team => team.members || []);
             if (memberIds.length > 0) {
                await fetchUserNames(memberIds);
             }
        } else if (fetchedEvent && !fetchedEvent.isTeamEvent) {
             console.error("ManageTeams Error: This is not a team event.");
             addTeamErrorMessage.value = "This is not a team event. Cannot manage teams."; // Show error if needed
             hasPermission.value = false; // No permission if not team event
         } else {
            console.error("ManageTeams Error: Event not found.");
            addTeamErrorMessage.value = "Event data could not be loaded.";
            hasPermission.value = false; // No permission if event not found
        }
    } catch (error) {
        console.error('ManageTeams: Error fetching event details:', error);
        addTeamErrorMessage.value = `Error loading event details: ${error.message}`;
         hasPermission.value = false; // No permission on error
    } finally {
        loadingEvent.value = false;
    }
}

async function fetchStudents() {
    // Only fetch if needed and permitted
    if (allStudents.value.length > 0 || !hasPermission.value) {
        loadingStudents.value = false;
        return;
    }
    loadingStudents.value = true;
    addTeamErrorMessage.value = '';
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef); // Fetch all users initially
        const querySnapshot = await getDocs(q);
        const studentsData = querySnapshot.docs
            .map(doc => ({
                uid: doc.id,
                name: doc.data().name || null,
                role: doc.data().role || null
            }))
            .filter(user => user.role === 'Student' || !user.role); // Filter for students client-side

        if (studentsData.length > 0) {
            const studentIds = studentsData.map(s => s.uid);
            await fetchUserNames(studentIds); // Populate cache
            // Sort students alphabetically by name (using cache)
             studentsData.sort((a, b) => {
                 const nameA = nameCache.value[a.uid] || a.uid;
                 const nameB = nameCache.value[b.uid] || b.uid;
                 return nameA.localeCompare(nameB);
             });
            allStudents.value = studentsData;
        } else {
            allStudents.value = [];
        }
    } catch (error) {
        console.error('ManageTeams: Error fetching students:', error);
        addTeamErrorMessage.value = `Failed to load students list: ${error.message}`;
        allStudents.value = [];
    } finally {
        loadingStudents.value = false;
    }
}

// Watch for event changes (e.g., after adding/deleting team) to update name cache
watch(() => event.value?.teams, (newTeams) => {
     if (newTeams) {
         const memberIds = (newTeams || []).flatMap(team => team.members || []);
         if (memberIds.length > 0) {
            fetchUserNames(memberIds); // Fetch any missing names
         }
     }
}, { deep: true });


onMounted(async () => {
    await fetchEventData(); // Fetch event first and check permissions
    if (hasPermission.value) {
        await fetchStudents(); // Fetch students only if permitted
    } else {
         loadingStudents.value = false; // Ensure student loading stops if no permission
    }
});

// --- Computed Properties ---
// Students already assigned in ANY team for THIS event
const assignedStudentIds = computed(() => {
    if (!event.value || !Array.isArray(event.value.teams)) return new Set();
    return new Set(event.value.teams.flatMap(team => team.members || []));
});

// Filter students based on search
const filteredStudents = computed(() => {
    if (loadingStudents.value || !Array.isArray(allStudents.value)) return [];
    if (!studentSearch.value) return allStudents.value; // Return all (already sorted) if no search
    const searchLower = studentSearch.value.toLowerCase();
    return allStudents.value.filter(student => {
        const name = nameCache.value[student.uid] || '';
        const uid = student.uid || '';
        return name.toLowerCase().includes(searchLower) || uid.toLowerCase().includes(searchLower);
    });
});

// Sort existing teams alphabetically
const sortedTeams = computed(() => {
     if (!event.value || !Array.isArray(event.value.teams)) return [];
     return [...event.value.teams].sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''));
});


// --- Helper Methods ---
const getTeamNameForStudent = (studentId) => {
    if (!event.value || !Array.isArray(event.value.teams)) return '';
    const team = event.value.teams.find(t => Array.isArray(t.members) && t.members.includes(studentId));
    return team ? team.teamName : '';
};

// --- Actions ---
const addTeam = async () => {
    addTeamErrorMessage.value = '';
    if (!newTeamName.value.trim()) { addTeamErrorMessage.value = 'Please enter a team name.'; return; }
    if (newSelectedStudents.value.length === 0) { addTeamErrorMessage.value = 'Please select at least one student.'; return; }

    addingTeam.value = true;
    try {
        // Dispatch action - it will fetch fresh data internally for checks
        await store.dispatch('events/addTeamToEvent', {
            eventId,
            teamName: newTeamName.value.trim(),
            members: newSelectedStudents.value,
        });
        // Clear form on success
        newTeamName.value = '';
        newSelectedStudents.value = [];
        studentSearch.value = '';
        // The store action updateLocalEvent should update the event ref reactively
        // await fetchEventData(); // No full refetch needed
    } catch (error) {
        addTeamErrorMessage.value = error.message || "Error occurred while adding team";
        console.error("ManageTeams: Add Team Error:", error);
    } finally {
        addingTeam.value = false;
    }
};

const deleteTeam = async (teamNameToDelete) => {
    if (!event.value || !Array.isArray(event.value.teams)) return;

    if (confirm(`Are you sure you want to delete team "${teamNameToDelete}"? This cannot be undone.`)) {
        const currentTeams = event.value.teams;
        const updatedTeams = currentTeams.filter(team => team.teamName !== teamNameToDelete);

        // Prevent accidental deletion if something went wrong with filter
         if (updatedTeams.length === currentTeams.length) {
             alert(`Error: Could not find team "${teamNameToDelete}" to delete.`);
             return;
         }

        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, { teams: updatedTeams });
            // Update local state via store action
             store.dispatch('events/updateLocalEvent', { id: eventId, changes: { teams: updatedTeams } });
            alert(`Team "${teamNameToDelete}" deleted.`);
        } catch (error) {
            console.error("ManageTeams: Error deleting team:", error);
            alert(`Failed to delete team: ${error.message}`);
             // Optionally trigger a full refetch on error
             // await fetchEventData();
        }
    }
};

const goBack = () => {
    router.back(); // Go back to the previous page (likely EventDetails)
};

</script>

<style scoped>
.student-selection-container {
    background-color: var(--color-surface); /* Ensure background for contrast */
}
.student-selection-item {
    padding: 0.4rem 0.5rem; /* Adjust padding */
    margin: 0 -0.5rem; /* Offset padding */
    border-radius: var(--border-radius);
    transition: background-color 0.2s ease-in-out;
    display: block; /* Ensure label takes full width */
}
.student-selection-item:not(.student-disabled):hover {
     background-color: var(--color-background);
}

.student-selected {
    background-color: var(--color-primary-light) !important; /* Use !important to override hover */
}
.student-selected .form-check-label {
     color: var(--color-primary); /* Darker text on selection */
     font-weight: 500;
}

/* Disabled style */
.student-disabled {
    /* background-color: var(--color-background); */ /* Optional subtle background */
    opacity: 0.7;
}
.student-disabled .form-check-label {
    /* color: var(--color-text-muted) !important; */ /* Already handled by Bootstrap */
    font-style: italic;
}
.form-check-input:disabled + .form-check-label {
    cursor: not-allowed;
}

.form-check-label {
    cursor: pointer;
    display: block; /* Allow full width click */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.position-absolute {
    z-index: 2; /* Ensure delete button is above content */
}

/* Style adjustments for delete button */
.btn-outline-danger.position-absolute {
     width: 30px;
     height: 30px;
     display: inline-flex;
     align-items: center;
     justify-content: center;
}
</style>