// /src/views/EventDetails.vue (Modifications for Names & Single Winner)
<template>
    <div class="container mt-4">
        <div v-if="loading" class="text-center">
             <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
        <div v-else-if="event">
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">{{ event.eventName }}</h2>
                    <span :class="['badge', statusBadgeClass]">{{ event.status }}</span>
                </div>
                <div class="card-body">
                    <p><strong>Type:</strong> {{ event.eventType }}</p>
                    <p><strong>Description:</strong> {{ event.description || 'No description provided.' }}</p>
                    <p><strong>Dates:</strong> {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}</p>
                    <p> <!-- UPDATED TO SHOW NAMES -->
                        <strong>Organizer(s):</strong>
                        <span v-if="organizerNamesLoading">Loading names...</span>
                        <span v-else>{{ getOrganizerNames() || 'N/A' }}</span>
                    </p>
                    <p><strong>Team Event:</strong> {{ event.isTeamEvent ? 'Yes' : 'No' }}</p>
                     <p v-if="event.status === 'Completed'">
                       <strong>Ratings:</strong>
                       <span :class="['badge', event.ratingsOpen ? 'bg-success' : 'bg-secondary']">
                           {{ event.ratingsOpen ? 'Open' : 'Closed' }}
                       </span>
                    </p>
                     <p v-if="event.ratingConstraints">
                         <strong>Rating Criteria:</strong> {{ event.ratingConstraints.join(', ') }}
                     </p>
                </div>
            </div>

            <!-- Management Section -->
            <div v-if="canManageEvent" class="card mb-4">
                 <div class="card-header">Event Management</div>
                 <div class="card-body d-flex flex-wrap gap-2">
                     <button v-if="event.isTeamEvent" @click="goToManageTeams" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-users-cog me-1"></i> Manage Teams
                    </button>
                     <!-- Status Buttons -->
                     <template v-if="event.status !== 'Completed' && event.status !== 'Cancelled'">
                         <button v-if="event.status === 'Upcoming' || event.status === 'Approved'" @click="updateStatus('In Progress')" class="btn btn-info btn-sm"><i class="fas fa-play me-1"></i> Mark In Progress</button>
                         <button v-if="event.status === 'In Progress'" @click="updateStatus('Completed')" class="btn btn-success btn-sm"><i class="fas fa-check-circle me-1"></i> Mark Completed</button>
                         <button @click="updateStatus('Cancelled')" class="btn btn-warning btn-sm"><i class="fas fa-times-circle me-1"></i> Cancel Event</button>
                     </template>
                    <!-- Ratings Toggle -->
                    <button v-if="event.status === 'Completed'" @click="toggleRatingsOpen(!event.ratingsOpen)" class="btn btn-secondary btn-sm">
                         <i :class="['fas', event.ratingsOpen ? 'fa-lock' : 'fa-lock-open', 'me-1']"></i> {{ event.ratingsOpen ? 'Close Ratings' : 'Open Ratings' }}
                    </button>
                     <!-- Winner Calculation -->
                     <div v-if="event.status === 'Completed'" class="w-100 mt-3">
                        <button @click="calculateWinners" class="btn btn-outline-secondary btn-sm me-2" title="Attempt automatic calculation based on average ratings"><i class="fas fa-trophy me-1"></i> Calculate Winner (Auto)</button>
                     </div>
                     <!-- Copy Rating Link -->
                      <button v-if="event.status === 'Completed' && event.ratingsOpen" @click="copyRatingLink" class="btn btn-outline-info btn-sm">
                          <i class="fas fa-share-alt me-1"></i> Copy Rating Link
                      </button>
                      <span v-if="linkCopied" class="text-success small ms-2 align-self-center">Link Copied!</span>
                    <!-- Delete Button -->
                    <button @click="deleteEvent" class="btn btn-danger btn-sm ms-auto"><i class="fas fa-trash-alt me-1"></i> Delete Event</button>
                 </div>
            </div>

            <!-- Teams Section -->
            <div v-if="event.isTeamEvent" class="mb-4">
                <h3>Teams</h3>
                 <!-- Pass fetchUserNames function and nameCache to TeamList -->
                <TeamList
                    v-if="event.teams && event.teams.length > 0"
                    :teams="event.teams"
                    :eventId="id"
                    :ratingsOpen="event.ratingsOpen && event.status === 'Completed'"
                    :get-user-name="getUserNameFromCache" 
                    :organizer-names-loading="organizerNamesLoading" 
                 />
                <p v-else>No teams assigned yet.</p>
            </div>

            <!-- Participants Section (Individual Event) -->
             <div v-else class="mb-4">
                <h3>Participants</h3>
                 <div v-if="event.participants && event.participants.length > 0">
                    <ul class="list-group">
                        <!-- UserCard doesn't necessarily need the name if it's complex to pass down -->
                       <!-- Let's simplify: display UID here, link to profile -->
                       <li v-for="participantId in event.participants" :key="participantId" class="list-group-item d-flex justify-content-between align-items-center">
                            <router-link :to="{ name: 'PublicProfile', params: { userId: participantId }}">
                                {{ getUserNameFromCache(participantId) || participantId }}
                            </router-link>
                           <!-- Add Rating button per user if desired and ratings open -->
                           <button v-if="event.ratingsOpen && event.status === 'Completed'"
                                   @click="goToIndividualRating(participantId)"
                                   class="btn btn-info btn-sm">
                                Rate
                           </button>
                       </li>
                    </ul>
                 </div>
                <p v-else>No participants registered for this event.</p>
            </div>

             <!-- Winner Selection UI (Single Winner - Radio Buttons) -->
            <div v-if="canManageEvent && event.status === 'Completed'" class="card mb-4">
                 <div class="card-header">Select Winner (Manual)</div>
                 <div class="card-body">
                     <!-- Team Event Winner Selection -->
                    <div v-if="event.isTeamEvent && event.teams && event.teams.length > 0">
                        <div v-for="team in event.teams" :key="'win-team-'+team.teamName" class="form-check">
                            <input
                                type="radio"
                                :id="'team-' + team.teamName"
                                :value="team.teamName"
                                v-model="selectedWinner"
                                name="winnerSelection" 
                                class="form-check-input">
                            <label :for="'team-' + team.teamName" class="form-check-label">{{ team.teamName }}</label>
                        </div>
                    </div>
                     <!-- Individual Event Winner Selection -->
                    <div v-else-if="!event.isTeamEvent && event.participants && event.participants.length > 0">
                        <div v-for="participantId in event.participants" :key="'win-user-'+participantId" class="form-check">
                             <input
                                type="radio"
                                :id="'user-' + participantId"
                                :value="participantId"
                                v-model="selectedWinner"
                                name="winnerSelection"
                                class="form-check-input">
                            <!-- Display name if available -->
                            <label :for="'user-' + participantId" class="form-check-label">
                                {{ getUserNameFromCache(participantId) || participantId }}
                            </label>
                        </div>
                    </div>
                     <p v-else class="text-muted">No teams or participants available to select a winner from.</p>
                     <!-- Updated Save Button Logic -->
                    <button @click="saveWinner" class="btn btn-primary btn-sm mt-3" :disabled="!selectedWinner">Save Selected Winner</button>
                 </div>
            </div>

             <!-- Display Winner (Singular) -->
             <div v-if="event.winners && event.winners.length > 0" class="card bg-light border-warning mb-4">
                 <div class="card-body text-center">
                    <h4 class="text-warning mb-2"><i class="fas fa-award me-2"></i>Winner!</h4>
                     <!-- Display name if available, otherwise the ID/TeamName -->
                     <p class="lead mb-0">{{ getWinnerName(event.winners[0]) || event.winners[0] }}</p>
                 </div>
             </div>

        </div>
        <div v-else class="alert alert-warning">Event not found or you do not have permission to view it.</div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, provide } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
// UserCard might not be needed if we list participants directly
// import UserCard from '../components/UserCard.vue';
import { Timestamp, doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../firebase'; // Import db

const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

const loading = ref(true);
const event = ref(null);
const selectedWinner = ref(null); // Changed from array to single value
const linkCopied = ref(false);

// --- Name Fetching Logic ---
const nameCache = ref(new Map()); // Simple cache: Map<UID, Name>
const organizerNamesLoading = ref(false);

async function fetchUserNames(userIds) {
    if (!userIds || userIds.length === 0) return;
    organizerNamesLoading.value = true;
    const idsToFetch = userIds.filter(id => id && !nameCache.value.has(id)); // Don't fetch if already cached or invalid ID

    if (idsToFetch.length === 0) {
        organizerNamesLoading.value = false;
        return;
    }

    console.log("Fetching names for UIDs:", idsToFetch);
    try {
        // Fetch multiple docs (consider batching/where-in for large numbers if needed/possible)
        const fetchPromises = idsToFetch.map(async (id) => {
            try {
                const userDocRef = doc(db, 'users', id);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    nameCache.value.set(id, docSnap.data().name || id); // Cache name or UID if name missing
                } else {
                    nameCache.value.set(id, id); // Cache UID if user not found
                }
            } catch (fetchError) {
                console.error(`Failed to fetch user data for ${id}:`, fetchError);
                nameCache.value.set(id, id); // Cache UID on error
            }
        });
        await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Error fetching user names:", error);
    } finally {
        organizerNamesLoading.value = false;
    }
}

// Function to get name from cache, used locally and passed down
const getUserNameFromCache = (userId) => {
    return nameCache.value.get(userId) || null; // Return null or undefined if not found
};
// --- End Name Fetching Logic ---


async function fetchAndSetEvent() {
    loading.value = true;
    event.value = null; // Reset event
    selectedWinner.value = null; // Reset winner selection
    try {
        const fetchedEvent = await store.dispatch('events/fetchEventDetails', props.id);
        if (fetchedEvent) {
            event.value = fetchedEvent;
            // Initialize selectedWinner if winner already exists
            selectedWinner.value = fetchedEvent.winners?.[0] ?? null; // Get first winner or null

            // --- Trigger name fetching ---
            let ids = new Set();
            if (fetchedEvent.organizer) ids.add(fetchedEvent.organizer);
            (fetchedEvent.coOrganizers || []).forEach(id => ids.add(id));
            // Add participant/member IDs if needed elsewhere, e.g., for winner display
             (fetchedEvent.participants || []).forEach(id => ids.add(id));
             (fetchedEvent.teams || []).forEach(team => (team.members || []).forEach(id => ids.add(id)));

            await fetchUserNames(Array.from(ids));
            // --- End name fetching trigger ---

        } else {
            console.warn(`Event with ID ${props.id} not found.`);
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
    } finally {
        loading.value = false;
    }
}

// Fetch event data on mount
onMounted(fetchAndSetEvent);

// Watch for route changes if needed
// watch(() => props.id, fetchAndSetEvent);


// Computed Properties
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin');

const canManageEvent = computed(() => {
    if (!currentUser.value || !event.value) return false;
    const userId = currentUser.value.uid;
    return (
        event.value.organizer === userId ||
        (event.value.coOrganizers && event.value.coOrganizers.includes(userId)) ||
        isAdmin.value
    );
});

const statusBadgeClass = computed(() => { /* ... as before ... */
    switch (event.value?.status) {
        case 'Upcoming': return 'bg-info text-dark'; case 'In Progress': return 'bg-primary';
        case 'Completed': return 'bg-success'; case 'Cancelled': return 'bg-danger';
        case 'Approved': return 'bg-light text-dark border'; default: return 'bg-secondary';
    }
});


// Methods
const formatDate = (timestamp) => { /* ... as before ... */
    if (timestamp?.seconds) { return new Date(timestamp.seconds * 1000).toLocaleDateString(); }
    try { if (timestamp instanceof Date) return timestamp.toLocaleDateString(); if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString(); } catch (e) { /* ignore */ } return 'N/A';
};

// Use cache for organizer names
const getOrganizerNames = () => {
     if (!event.value) return null;
     let names = [];
     const primaryName = getUserNameFromCache(event.value.organizer);
     if (primaryName) names.push(primaryName);
     else if(event.value.organizer) names.push(event.value.organizer); // Fallback to UID

     (event.value.coOrganizers || []).forEach(id => {
         const coName = getUserNameFromCache(id);
         if (coName) names.push(coName);
         else if(id) names.push(id); // Fallback to UID
     });
     return names.join(', ') || null; // Return null if no names/UIDs found
};

// Function to get winner name (handles team vs individual)
const getWinnerName = (winnerIdentifier) => {
    if (!winnerIdentifier || !event.value) return winnerIdentifier;
    // If it's NOT a team event, the identifier is likely a UID
    if (!event.value.isTeamEvent) {
        return getUserNameFromCache(winnerIdentifier) || winnerIdentifier;
    }
    // If it is a team event, the identifier is the team name
    return winnerIdentifier; // Return team name directly
};


const goToManageTeams = () => { router.push({ name: 'ManageTeams', params: { id: props.id } }); };

const updateStatus = async (newStatus) => { /* ... as before, includes fetchAndSetEvent ... */
    if (!event.value) return; try { await store.dispatch('events/updateEventStatus', { eventId: props.id, newStatus }); await fetchAndSetEvent(); } catch (error) { console.error(`Error updating status to ${newStatus}:`, error); alert(`Failed to update status: ${error.message}`); }
};

const toggleRatingsOpen = async (isOpen) => { /* ... as before, includes fetchAndSetEvent ... */
     if (!event.value) return; try { await store.dispatch('events/toggleRatingsOpen', { eventId: props.id, isOpen }); await fetchAndSetEvent(); } catch (error) { console.error("Error toggling ratings:", error); alert(`Failed to toggle ratings: ${error.message}`); }
};

// Updated saveWinner (singular)
const saveWinner = async () => {
     if (!event.value || !selectedWinner.value) return; // Check if a winner is selected
    try {
        // Send winner as an array containing the single selection
        await store.dispatch('events/setWinners', { eventId: props.id, winners: [selectedWinner.value] });
        await fetchAndSetEvent(); // Re-fetch
        alert("Winner saved successfully!");
    } catch (error) {
        console.error("Error saving winner:", error);
        alert(`Failed to save winner: ${error.message}`);
    }
};


const deleteEvent = async () => { /* ... as before ... */
     if (!event.value) return; if (confirm(`PERMANENTLY DELETE "${event.value.eventName}"?`)) { try { await store.dispatch('events/deleteEvent', props.id); alert("Event deleted."); router.push({ name: 'Home' }); } catch (error) { console.error('Error deleting:', error); alert(`Failed to delete: ${error.message}`); } }
};

const calculateWinners = async () => { /* ... as before, includes fetchAndSetEvent ... */
     if (!event.value) return; try { await store.dispatch('events/calculateWinners', props.id); await fetchAndSetEvent(); } catch (error) { console.error("Error calc winners:", error); alert(`Error calculating winners: ${error.message}`); }
};

const copyRatingLink = async () => { /* ... as before ... */
    if (!event.value) return; const link = window.location.href; try { await navigator.clipboard.writeText(link); linkCopied.value = true; setTimeout(() => { linkCopied.value = false; }, 2000); } catch (err) { console.error('Copy failed: ', err); alert("Failed to copy."); }
};

// Updated to pass specific participant ID
const goToIndividualRating = (participantId) => {
    if (!event.value || !participantId) return;
     router.push({
        path: `/rating/${props.id}`, // Route to rating form for the event
        query: { participant: participantId } // Pass specific participant in query
        // The RatingForm needs to be updated to read this 'participant' query param
    });
};


</script>

<style scoped>
/* Styles remain largely the same */
.badge { font-size: 0.9em; }
.gap-2 { gap: 0.5rem; }
.ms-auto { margin-left: auto !important; }
.fa-award { color: #ffc107; }
.form-check-label { margin-left: 0.25rem; } /* Spacing for radio labels */
</style>