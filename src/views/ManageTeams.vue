// src/views/ManageTeams.vue (Improved UI, Disabling, Back Button)
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
                    <div v-for="team in event.teams" :key="team.teamName" class="card card-body mb-2 shadow-sm">
                        <h5 class="card-title mb-1">{{ team.teamName }}</h5>
                        <ul v-if="team.members && team.members.length > 0" class="list-inline mb-0">
                            <li v-for="memberId in team.members" :key="memberId" class="list-inline-item badge bg-light text-dark border me-1">
                                <!-- Attempt to show name, fallback to ID -->
                                {{ nameCache.get(memberId) || memberId }}
                            </li>
                        </ul>
                         <p v-else class="text-muted small mb-0">No members assigned.</p>
                        <!-- Add Delete Team Button Here if needed -->
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
                         <input type="text" v-model="studentSearch" placeholder="Search students..." class="form-control form-control-sm mb-2">
                        <div v-if="loadingStudents" class="text-center">Loading students...</div>
                         <!-- Two Column Layout -->
                        <div v-else class="row student-selection-list border rounded p-2" style="max-height: 300px; overflow-y: auto;">
                             <div v-for="student in filteredStudents" :key="student.uid" class="col-md-6">
                                 <div class="form-check">
                                    <input
                                        type="checkbox"
                                        :id="'add-' + student.uid"
                                        :value="student.uid"
                                        v-model="newSelectedStudents"
                                        :disabled="assignedStudentIds.has(student.uid)" <!-- Disable if already in a team -->
                                        class="form-check-input"
                                    />
                                    <!-- Show only name, indicate if disabled -->
                                    <label :for="'add-' + student.uid" class="form-check-label" :class="{ 'text-muted': assignedStudentIds.has(student.uid) }">
                                        {{ student.name }}
                                        <span v-if="assignedStudentIds.has(student.uid)" class="small"> (in team: {{ getTeamNameForStudent(student.uid) }})</span>
                                    </label>
                                 </div>
                             </div>
                             <div v-if="filteredStudents.length === 0" class="col-12 text-muted">
                                No students found matching search.
                            </div>
                        </div>
                         <small class="form-text text-muted">Students already assigned to a team are disabled.</small>
                    </div>

                    <button type="submit" class="btn btn-primary" :disabled="addingTeam">
                        {{ addingTeam ? 'Adding...' : 'Add Team' }}
                    </button>
                </form>
            </section>

        </div>
        <div v-else class="alert alert-danger">
            Failed to load event details. Cannot manage teams.
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore'; // Added doc, getDoc, updateDoc
import { db } from '../firebase';

const route = useRoute();
const router = useRouter();
const store = useStore();
const eventId = route.params.id;

// State for event data
const event = ref(null);
const loadingEvent = ref(true);

// State for student list
const allStudents = ref([]);
const loadingStudents = ref(true);
const studentSearch = ref(''); // For filtering student list

// State for adding a new team
const newTeamName = ref('');
const newSelectedStudents = ref([]);
const addTeamErrorMessage = ref('');
const addingTeam = ref(false);

// --- Name Cache ---
const nameCache = ref(new Map());

// Fetch user names (similar to EventDetails, could be refactored)
async function fetchUserNames(userIds) {
    const idsToFetch = userIds.filter(id => id && !nameCache.value.has(id));
    if (idsToFetch.length === 0) return;

    try {
        const fetchPromises = idsToFetch.map(async (id) => {
            try {
                const userDocRef = doc(db, 'users', id);
                const docSnap = await getDoc(userDocRef);
                nameCache.value.set(id, docSnap.exists() ? (docSnap.data().name || id) : id);
            } catch { nameCache.value.set(id, id); }
        });
        await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Error fetching names:", error);
    }
}
// --- End Name Cache ---


// Fetch event details on mount
async function fetchEventData() {
    loadingEvent.value = true;
    event.value = null;
    try {
        // Use the store action which might have cached data
        const fetchedEvent = await store.dispatch('events/fetchEventDetails', eventId);
         if (fetchedEvent && fetchedEvent.isTeamEvent) { // Ensure it's a team event
            event.value = fetchedEvent;
             // Fetch names for existing team members
             const memberIds = (event.value.teams || []).flatMap(team => team.members || []);
             await fetchUserNames(memberIds);
        } else if (fetchedEvent && !fetchedEvent.isTeamEvent) {
             console.error("This is not a team event. Cannot manage teams.");
             // Optionally navigate back or show error
             router.back();
         }
        else {
            console.error("Event not found.");
            // Show error message
        }
    } catch (error) {
        console.error('Error fetching event details:', error);
    } finally {
        loadingEvent.value = false;
    }
}

// Fetch student list on mount
async function fetchStudents() {
    loadingStudents.value = true;
    try {
        const q = query(collection(db, 'users'), where('role', '==', 'Student')); // Fetch only students
        const querySnapshot = await getDocs(q);
        const studentsData = querySnapshot.docs.map((doc) => ({
            uid: doc.id, ...doc.data(),
            role: doc.data().role || 'Student' // Ensure role default
        }));
        // Also fetch names for all students now
        await fetchUserNames(studentsData.map(s => s.uid));
        allStudents.value = studentsData;

    } catch (error) {
        console.error('Error fetching students:', error);
        addTeamErrorMessage.value = 'Failed to load students list.';
    } finally {
        loadingStudents.value = false;
    }
}

onMounted(() => {
    fetchEventData();
    fetchStudents();
});

// Computed property for students already assigned to any team
const assignedStudentIds = computed(() => {
    if (!event.value || !event.value.teams) return new Set();
    return new Set(event.value.teams.flatMap(team => team.members || []));
});

// Filter students based on search input
const filteredStudents = computed(() => {
    if (!studentSearch.value) {
        return allStudents.value;
    }
    const searchLower = studentSearch.value.toLowerCase();
    return allStudents.value.filter(student =>
        student.name?.toLowerCase().includes(searchLower) ||
        student.uid?.toLowerCase().includes(searchLower)
    );
});


// Helper to get team name for a student ID
const getTeamNameForStudent = (studentId) => {
    if (!event.value || !event.value.teams) return '';
    const team = event.value.teams.find(t => t.members?.includes(studentId));
    return team ? team.teamName : '';
};


const addTeam = async () => {
    addTeamErrorMessage.value = '';
    addingTeam.value = true;
    const memberCount = newSelectedStudents.value.length;

    if (!newTeamName.value.trim()) {
        addTeamErrorMessage.value = 'Please enter a team name.';
        addingTeam.value = false; return;
    }
    if (memberCount < 3 || memberCount > 8) {
        addTeamErrorMessage.value = `Teams must have 3 to 8 members (selected ${memberCount}).`;
         addingTeam.value = false; return;
    }

    try {
        // Dispatch uses Firestore logic to check for duplicates etc.
        await store.dispatch('events/addTeamToEvent', {
            eventId,
            teamName: newTeamName.value.trim(),
            members: newSelectedStudents.value,
        });
        // Success: clear form and refresh event data
        newTeamName.value = '';
        newSelectedStudents.value = [];
        studentSearch.value = ''; // Clear search
        await fetchEventData(); // Refresh the displayed teams and disabled students
    } catch (error) {
        addTeamErrorMessage.value = error.message || "Error occurred while adding team";
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
            await fetchEventData(); // Refresh list
            // Optionally use store action: await store.dispatch('events/updateLocalEvent', { id: eventId, changes: { teams: updatedTeams } }); event.value.teams = updatedTeams;
            alert(`Team "${teamNameToDelete}" deleted.`);
        } catch (error) {
            console.error("Error deleting team:", error);
            alert(`Failed to delete team: ${error.message}`);
        }
    }
};


// Back button functionality
const goBack = () => {
    router.back();
};
</script>

<style scoped>
.student-selection-list .form-check {
    padding-top: 0.3rem;
    padding-bottom: 0.3rem;
}
.form-check-label.text-muted {
    font-style: italic;
}
.position-absolute { /* Ensure delete button placement */
    z-index: 2;
}
</style>