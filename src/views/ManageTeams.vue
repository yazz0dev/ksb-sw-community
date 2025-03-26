// src/views/ManageTeams.vue (Add indicator for selected students)
<template>
    <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h2 class="mb-0">Manage Teams for {{ event?.eventName || eventId }}</h2>
            <button @click="goBack" class="btn btn-secondary btn-sm">
                <i class="fas fa-arrow-left me-1"></i> Back to Event
            </button>
        </div>

        <div v-if="loadingEvent" class="text-center">Loading event details...</div>
        <div v-else-if="event">

            <!-- Display Existing Teams -->
            <section class="mb-4">
                <h3>Existing Teams</h3>
                <div v-if="!event.teams || event.teams.length === 0" class="alert alert-light">No teams created yet.</div>
                <div v-else>
                    <div v-for="team in event.teams" :key="team.teamName" class="card card-body mb-2 shadow-sm position-relative">
                        <h5 class="card-title mb-1">{{ team.teamName }}</h5>
                        <ul v-if="team.members && team.members.length > 0" class="list-inline mb-0">
                            <li v-for="memberId in team.members" :key="memberId" class="list-inline-item badge bg-light text-dark border me-1">
                                {{ nameCache[memberId] || memberId }}
                            </li>
                        </ul>
                         <p v-else class="text-muted small mb-0">No members assigned.</p>
                         <button @click="deleteTeam(team.teamName)" class="btn btn-outline-danger btn-sm position-absolute top-0 end-0 m-2" title="Delete Team">
                             <i class="fas fa-trash"></i>
                         </button>
                    </div>
                </div>
            </section>
            <hr>

            <!-- Add New Team Form -->
            <section>
                <h3>Add New Team</h3>
                <div v-if="addTeamErrorMessage" class="alert alert-danger" role="alert">{{ addTeamErrorMessage }}</div>
                <form @submit.prevent="addTeam">
                    <div class="mb-3">
                        <label for="teamName" class="form-label">New Team Name:</label>
                        <input type="text" id="teamName" v-model="newTeamName" required class="form-control" />
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Select Students ({{ newSelectedStudents.length }} selected):</label>
                         <input type="text" v-model="studentSearch" placeholder="Search students by name or UID..." class="form-control form-control-sm mb-2">

                        <!-- Loading State -->
                        <div v-if="loadingStudents" class="text-center p-3">
                             <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading students...</span>
                            </div>
                        </div>

                        <!-- Student List Area -->
                        <div v-else class="row student-selection-list border rounded p-2" style="max-height: 300px; overflow-y: auto;">
                             <div v-if="filteredStudents.length === 0" class="col-12 text-muted py-2">
                                No students found{{ studentSearch ? ' matching search.' : '.' }}
                            </div>
                             <div v-else v-for="student in filteredStudents" :key="student.uid" class="col-md-6">
                                 <!-- ADD :class binding here -->
                                 <div class="form-check" :class="{ 'student-selected': newSelectedStudents.includes(student.uid) }">
                                    <input
                                        type="checkbox"
                                        :id="'add-' + student.uid"
                                        :value="student.uid"
                                        v-model="newSelectedStudents"
                                        :disabled="assignedStudentIds.has(student.uid)"
                                        class="form-check-input"
                                    />
                                    <label :for="'add-' + student.uid" class="form-check-label" :class="{ 'text-muted': assignedStudentIds.has(student.uid) }">
                                        {{ nameCache[student.uid] || student.uid }}
                                        <span v-if="assignedStudentIds.has(student.uid)" class="small"> (in team: {{ getTeamNameForStudent(student.uid) }})</span>
                                    </label>
                                 </div>
                             </div>
                        </div>
                         <small class="form-text text-muted mt-1 d-block">Students already assigned to a team are disabled.</small>
                    </div>

                    <button type="submit" class="btn btn-primary" :disabled="addingTeam">
                        {{ addingTeam ? 'Adding...' : 'Add Team' }}
                    </button>
                </form>
            </section>

        </div>
        <div v-else class="alert alert-danger">
             {{ addTeamErrorMessage || 'Failed to load event details or this is not a team event. Cannot manage teams.' }}
        </div>
    </div>
</template>

<script setup>
// ... script setup remains the same ...
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const route = useRoute();
const router = useRouter();
const store = useStore();
const eventId = route.params.id;

// State
const event = ref(null);
const loadingEvent = ref(true);
const allStudents = ref([]);
const loadingStudents = ref(true);
const studentSearch = ref('');
const newTeamName = ref('');
const newSelectedStudents = ref([]);
const addTeamErrorMessage = ref('');
const addingTeam = ref(false);

// Name Cache - using plain object ref
const nameCache = ref({});

// Fetch user names efficiently
async function fetchUserNames(userIds) {
    const idsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.hasOwnProperty(id));

    if (idsToFetch.length === 0) return;

    // console.log("ManageTeams: Fetching names for UIDs:", idsToFetch);
    try {
        const fetchPromises = idsToFetch.map(async (id) => {
            try {
                const userDocRef = doc(db, 'users', id);
                const docSnap = await getDoc(userDocRef);
                nameCache.value[id] = docSnap.exists() ? (docSnap.data().name || id) : id;
            } catch (fetchError){
                 console.error(`Failed to fetch name for ${id}:`, fetchError);
                 nameCache.value[id] = id;
            }
        });
        await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Error batch fetching user names:", error);
         idsToFetch.forEach(id => {
             if (!nameCache.value.hasOwnProperty(id)) nameCache.value[id] = id;
         });
    }
}


// Fetch event details
async function fetchEventData() {
    loadingEvent.value = true;
    event.value = null;
    addTeamErrorMessage.value = '';
    try {
        const fetchedEvent = await store.dispatch('events/fetchEventDetails', eventId);
         if (fetchedEvent && fetchedEvent.isTeamEvent) {
            event.value = fetchedEvent;
             const memberIds = (event.value.teams || []).flatMap(team => team.members || []);
             if (memberIds.length > 0) {
                await fetchUserNames(memberIds);
             }
        } else if (fetchedEvent && !fetchedEvent.isTeamEvent) {
             console.error("ManageTeams Error: This is not a team event.");
             addTeamErrorMessage.value = "This is not a team event. Cannot manage teams.";
         } else {
            console.error("ManageTeams Error: Event not found.");
            addTeamErrorMessage.value = "Event data could not be loaded.";
        }
    } catch (error) {
        console.error('ManageTeams: Error fetching event details:', error);
        addTeamErrorMessage.value = `Error loading event details: ${error.message}`;
    } finally {
        loadingEvent.value = false;
    }
}

// Fetch student list
async function fetchStudents() {
    if (allStudents.value.length > 0) {
        loadingStudents.value = false;
        return;
    }

    loadingStudents.value = true;
    addTeamErrorMessage.value = '';
    console.log("ManageTeams: Preparing to fetch ALL users for student filtering...");

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        console.log("ManageTeams: Executing Firestore query for ALL users...");

        const querySnapshot = await getDocs(q);

        console.log(`ManageTeams: Firestore query completed. Found ${querySnapshot.size} total user documents.`);

        if (querySnapshot.empty) {
             console.warn("ManageTeams: No user documents found in the collection.");
             allStudents.value = [];
        } else {
            const allUsersData = querySnapshot.docs.map((doc) => ({
                uid: doc.id,
                name: doc.data().name || null,
                role: doc.data().role || null
            }));

            console.log("ManageTeams: Sample raw user data before filtering (first 5):", JSON.stringify(allUsersData.slice(0, 5), null, 2));

            const filteredStudentsData = allUsersData.filter(user => user.role === 'Student' || !user.role);

            console.log(`ManageTeams: Filtered down to ${filteredStudentsData.length} students.`);

            if (filteredStudentsData.length === 0) {
                 console.warn("ManageTeams: No users matched the client-side student filter (role === 'Student' or !role). Please check Firestore data and filter logic.");
                 allStudents.value = [];
            } else {
                 const studentIds = filteredStudentsData.map(s => s.uid);
                 await fetchUserNames(studentIds);
                 allStudents.value = filteredStudentsData;
                 console.log("ManageTeams: Successfully loaded and processed students.");
            }
        }

    } catch (error) {
        console.error('ManageTeams: Error fetching or filtering users:', error);
        addTeamErrorMessage.value = `Failed to load students list: ${error.message}`;
        allStudents.value = [];
    } finally {
        loadingStudents.value = false;
    }
}

onMounted(() => {
    fetchEventData();
    fetchStudents();
});

// Computed: Students already assigned
const assignedStudentIds = computed(() => {
    if (!event.value || !event.value.teams) return new Set();
    return new Set(event.value.teams.flatMap(team => team.members || []));
});

// Computed: Filter students
const filteredStudents = computed(() => {
    if (loadingStudents.value || !Array.isArray(allStudents.value)) {
        return [];
    }
    if (!studentSearch.value) {
        return allStudents.value;
    }
    const searchLower = studentSearch.value.toLowerCase();
    return allStudents.value.filter(student => {
        const name = nameCache.value[student.uid] || '';
        const uid = student.uid || '';
        return name.toLowerCase().includes(searchLower) || uid.toLowerCase().includes(searchLower);
    });
});

// Helper: Get team name for student
const getTeamNameForStudent = (studentId) => {
    if (!event.value || !event.value.teams) return '';
    const team = event.value.teams.find(t => t.members?.includes(studentId));
    return team ? team.teamName : '';
};

// Add Team Logic
const addTeam = async () => {
    addTeamErrorMessage.value = '';
    addingTeam.value = true;

    if (!newTeamName.value.trim()) {
        addTeamErrorMessage.value = 'Please enter a team name.';
        addingTeam.value = false; return;
    }
     if (newSelectedStudents.value.length === 0) {
        addTeamErrorMessage.value = 'Please select at least one student for the team.';
        addingTeam.value = false; return;
    }

    try {
        await store.dispatch('events/addTeamToEvent', {
            eventId,
            teamName: newTeamName.value.trim(),
            members: newSelectedStudents.value,
        });
        newTeamName.value = '';
        newSelectedStudents.value = [];
        studentSearch.value = '';
        await fetchEventData();
    } catch (error) {
        addTeamErrorMessage.value = error.message || "Error occurred while adding team";
        console.error("ManageTeams: Add Team Error:", error);
    } finally {
        addingTeam.value = false;
    }
};

// Delete Team Functionality
const deleteTeam = async (teamNameToDelete) => {
    if (!event.value || !event.value.teams) return;

    if (confirm(`Are you sure you want to delete team "${teamNameToDelete}"? This cannot be undone.`)) {
        const updatedTeams = event.value.teams.filter(team => team.teamName !== teamNameToDelete);
        try {
            const eventRef = doc(db, 'events', eventId);
            await updateDoc(eventRef, { teams: updatedTeams });
            event.value.teams = updatedTeams;
            alert(`Team "${teamNameToDelete}" deleted.`);
        } catch (error) {
            console.error("ManageTeams: Error deleting team:", error);
            alert(`Failed to delete team: ${error.message}`);
             await fetchEventData();
        }
    }
};

// Back button
const goBack = () => {
    router.back();
};

</script>

<style scoped>
.student-selection-list .form-check {
    padding-top: 0.3rem;
    padding-bottom: 0.3rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
     /* Add transitions for smooth background change */
    transition: background-color 0.2s ease-in-out;
    border-radius: var(--border-radius); /* Add border-radius */
    margin-left: -0.5rem;  /* Adjust margins and padding for background */
    margin-right: -0.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
}
.form-check-label.text-muted {
    font-style: italic;
    color: var(--color-text-muted) !important;
}
.form-check-label {
    cursor: pointer;
     display: block;
     overflow: hidden;
     text-overflow: ellipsis;
}
.form-check-input:disabled + .form-check-label {
    cursor: not-allowed;
}
.position-absolute {
    z-index: 2;
}
.student-selection-list {
    scrollbar-width: thin;
}

/* Style for selected student */
.student-selected {
    background-color: var(--color-primary-light); /* Use theme variable */
}

/* Ensure muted text is still readable on selected background */
.student-selected .text-muted {
     color: var(--color-text-secondary) !important; /* Adjust if needed */
}

/* Ensure disabled label is also readable on selected background */
.form-check-input:disabled + .student-selected .form-check-label {
     color: var(--color-text-muted) !important; /* Adjust if needed */
}

</style>