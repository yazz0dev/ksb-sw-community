// /src/views/EventDetails.vue (Modifications)
<template>
    <div class="container mt-4">
        <div v-if="loading" class="text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
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
                    <!-- Display Organizer(s) -->
                    <p>
                        <strong>Organizer(s):</strong>
                        {{ getOrganizerNames() }}
                        <!-- {{ event.organizer }} - Fetch name? -->
                        <!-- <span v-if="event.coOrganizers && event.coOrganizers.length">, {{ event.coOrganizers.join(', ') }} - Fetch names? </span> -->
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

            <!-- Management Section (Organizer/Co-organizer/Admin) -->
            <div v-if="canManageEvent" class="card mb-4">
                 <div class="card-header">
                     Event Management
                 </div>
                 <div class="card-body d-flex flex-wrap gap-2">
                    <!-- Manage Teams Button -->
                     <button v-if="event.isTeamEvent" @click="goToManageTeams" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-users-cog me-1"></i> Manage Teams
                    </button>

                     <!-- Status Update Buttons -->
                     <template v-if="event.status !== 'Completed' && event.status !== 'Cancelled'">
                        <button v-if="event.status === 'Upcoming' || event.status === 'Approved'" @click="updateStatus('In Progress')" class="btn btn-info btn-sm">
                           <i class="fas fa-play me-1"></i> Mark as In Progress
                        </button>
                        <button v-if="event.status === 'In Progress'" @click="updateStatus('Completed')" class="btn btn-success btn-sm">
                           <i class="fas fa-check-circle me-1"></i> Mark as Completed
                        </button>
                         <button @click="updateStatus('Cancelled')" class="btn btn-warning btn-sm">
                           <i class="fas fa-times-circle me-1"></i> Cancel Event
                        </button>
                    </template>

                     <!-- Ratings Toggle -->
                    <button v-if="event.status === 'Completed'" @click="toggleRatingsOpen(!event.ratingsOpen)" class="btn btn-secondary btn-sm">
                         <i :class="['fas', event.ratingsOpen ? 'fa-lock' : 'fa-lock-open', 'me-1']"></i>
                         {{ event.ratingsOpen ? 'Close Ratings' : 'Open Ratings' }}
                    </button>

                     <!-- Winner Calculation/Selection -->
                     <div v-if="event.status === 'Completed'" class="w-100 mt-3">
                        <button @click="calculateWinners" class="btn btn-outline-secondary btn-sm me-2" title="Attempt automatic calculation based on average ratings (feature might be basic)">
                            <i class="fas fa-trophy me-1"></i> Calculate Winners (Auto)
                        </button>
                         <!-- Manual Winner Selection Toggle could go here -->
                     </div>

                     <!-- Copy Rating Link -->
                      <button v-if="event.status === 'Completed' && event.ratingsOpen" @click="copyRatingLink" class="btn btn-outline-info btn-sm">
                          <i class="fas fa-share-alt me-1"></i> Copy Rating Link
                      </button>
                      <span v-if="linkCopied" class="text-success small ms-2 align-self-center">Link Copied!</span>


                    <!-- Delete Button -->
                    <button @click="deleteEvent" class="btn btn-danger btn-sm ms-auto"> <!-- Push to the right -->
                        <i class="fas fa-trash-alt me-1"></i> Delete Event
                    </button>
                 </div>
            </div>

            <!-- Teams Section -->
            <div v-if="event.isTeamEvent" class="mb-4">
                <h3>Teams</h3>
                <TeamList v-if="event.teams && event.teams.length > 0" :teams="event.teams" :eventId="id" :ratingsOpen="event.ratingsOpen && event.status === 'Completed'" />
                <p v-else>No teams assigned yet.</p>
            </div>

            <!-- Participants Section (Individual Event) -->
            <div v-else class="mb-4">
                <h3>Participants</h3>
                 <div v-if="event.participants && event.participants.length > 0">
                    <ul class="list-group">
                       <!-- Pass ratingsOpen status to UserCard or handle rating button here -->
                        <UserCard v-for="participantId in event.participants" :key="participantId" :userId="participantId" :eventId="id" />
                       <!-- Consider adding a Rate button next to each UserCard if ratings are open -->
                        <li v-if="event.ratingsOpen && event.status === 'Completed'" class="list-group-item text-center">
                            <!-- Generic rating button or individual ones next to users -->
                            <button @click="goToIndividualRating" class="btn btn-info btn-sm">Rate Participants</button>
                            <small class="d-block text-muted mt-1">Click here to open the rating form for participants.</small>
                        </li>
                    </ul>
                 </div>
                <p v-else>No participants registered for this event.</p>
            </div>


             <!-- Winner Selection UI -->
            <div v-if="canManageEvent && event.status === 'Completed'" class="card mb-4">
                 <div class="card-header">Select Winners (Manual)</div>
                 <div class="card-body">
                    <div v-if="event.isTeamEvent && event.teams && event.teams.length > 0">
                        <div v-for="team in event.teams" :key="team.teamName" class="form-check">
                            <input type="checkbox" :id="'team-' + team.teamName" :value="team.teamName" v-model="selectedWinners" class="form-check-input">
                            <label :for="'team-' + team.teamName" class="form-check-label">{{ team.teamName }}</label>
                        </div>
                    </div>
                    <div v-else-if="!event.isTeamEvent && event.participants && event.participants.length > 0">
                        <div v-for="participant in event.participants" :key="participant" class="form-check">
                            <input type="checkbox" :id="'user-' + participant" :value="participant" v-model="selectedWinners" class="form-check-input">
                            <label :for="'user-' + participant" class="form-check-label">{{ participant }}</label> <!-- TODO: Fetch/display name -->
                        </div>
                    </div>
                     <p v-else class="text-muted">No teams or participants available to select winners from.</p>
                    <button @click="saveWinners" class="btn btn-primary btn-sm mt-3" :disabled="!selectedWinners.length">Save Selected Winners</button>
                 </div>
            </div>

             <!-- Display Winners -->
             <div v-if="event.winners && event.winners.length > 0" class="card bg-light border-warning mb-4">
                 <div class="card-body text-center">
                    <h4 class="text-warning mb-2"><i class="fas fa-award me-2"></i>Winners!</h4>
                     <p class="lead mb-0">{{ event.winners.join(', ') }}</p> <!-- TODO: Fetch/display names -->
                 </div>
             </div>

        </div>
        <div v-else class="alert alert-warning">
            Event not found or you do not have permission to view it.
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
import UserCard from '../components/UserCard.vue';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp if needed

// Props
const props = defineProps({
  id: { // Event ID from route
    type: String,
    required: true,
  },
});

const store = useStore();
const router = useRouter();
const route = useRoute(); // If needed for query params etc.

const loading = ref(true);
const event = ref(null);
const selectedWinners = ref([]); // Array for manual winner selection
const linkCopied = ref(false); // For copy link feedback

// Fetch event data on mount
onMounted(async () => {
    await fetchAndSetEvent();
});

// Watch for route changes if needed (e.g., navigating between events)
// watch(() => props.id, fetchAndSetEvent);

async function fetchAndSetEvent() {
    loading.value = true;
    try {
        const fetchedEvent = await store.dispatch('events/fetchEventDetails', props.id);
        if (fetchedEvent) {
            event.value = fetchedEvent;
            // Initialize selectedWinners if winners already exist in fetched data
            selectedWinners.value = fetchedEvent.winners ? [...fetchedEvent.winners] : [];
        } else {
            event.value = null; // Handle event not found
             console.warn(`Event with ID ${props.id} not found.`);
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
        event.value = null;
    } finally {
        loading.value = false;
    }
}

// Computed Properties
const currentUser = computed(() => store.getters['user/getUser']);
const isAdmin = computed(() => currentUser.value?.role === 'Admin');

// Check if the current user can manage the event (Organizer, Co-organizer, or Admin)
const canManageEvent = computed(() => {
    if (!currentUser.value || !event.value) return false;
    const userId = currentUser.value.uid;
    return (
        event.value.organizer === userId ||
        (event.value.coOrganizers && event.value.coOrganizers.includes(userId)) ||
        isAdmin.value
    );
});

const statusBadgeClass = computed(() => {
    switch (event.value?.status) {
        case 'Upcoming': return 'bg-info text-dark';
        case 'In Progress': return 'bg-primary';
        case 'Completed': return 'bg-success';
        case 'Cancelled': return 'bg-danger';
        case 'Approved': return 'bg-light text-dark border'; // For requests that became events
        default: return 'bg-secondary';
    }
});

// Methods
const formatDate = (timestamp) => {
    if (timestamp && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    // Handle cases where it might already be a Date object or string (less likely from Firestore)
    try {
        if (timestamp instanceof Date) return timestamp.toLocaleDateString();
        if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString();
    } catch (e) { /* ignore date parsing errors */ }
    return 'N/A';
};

const getOrganizerNames = () => {
     if (!event.value) return 'N/A';
     // In a real app, fetch names based on UIDs
     let names = [event.value.organizer]; // Start with primary organizer UID
     if (event.value.coOrganizers && event.value.coOrganizers.length > 0) {
         names = names.concat(event.value.coOrganizers);
     }
      // Placeholder: Just return UIDs for now
     return names.join(', ');
     // TODO: Implement function to map UIDs to names (maybe fetch users needed)
};


const goToManageTeams = () => {
    router.push({ name: 'ManageTeams', params: { id: props.id } });
};

const updateStatus = async (newStatus) => {
    if (!event.value) return;
    try {
        await store.dispatch('events/updateEventStatus', { eventId: props.id, newStatus });
        await fetchAndSetEvent(); // Re-fetch to get the latest state
         // If marking as completed, maybe show a confirmation?
    } catch (error) {
        console.error(`Error updating status to ${newStatus}:`, error);
        alert(`Failed to update status: ${error.message}`);
    }
};

const toggleRatingsOpen = async (isOpen) => {
     if (!event.value) return;
    try {
        await store.dispatch('events/toggleRatingsOpen', { eventId: props.id, isOpen });
         await fetchAndSetEvent(); // Re-fetch
    } catch (error) {
        console.error("Error toggling ratings:", error);
         alert(`Failed to toggle ratings: ${error.message}`);
    }
};

const saveWinners = async () => {
     if (!event.value || !selectedWinners.value) return;
    try {
        await store.dispatch('events/setWinners', { eventId: props.id, winners: selectedWinners.value });
        await fetchAndSetEvent(); // Re-fetch
         alert("Winners saved successfully!");
    } catch (error) {
        console.error("Error saving winners:", error);
        alert(`Failed to save winners: ${error.message}`);
    }
};

const deleteEvent = async () => {
     if (!event.value) return;
    if (confirm(`Are you sure you want to PERMANENTLY DELETE the event "${event.value.eventName}"? This cannot be undone.`)) {
        try {
            await store.dispatch('events/deleteEvent', props.id);
            alert("Event deleted successfully.");
            router.push({ name: 'Home' }); // Navigate away after deletion
        } catch (error) {
            console.error('Error deleting event:', error);
            alert(`Failed to delete event: ${error.message}`);
        }
    }
};

const calculateWinners = async () => {
     if (!event.value) return;
    try {
        // This action currently shows an alert and doesn't fully implement logic
        await store.dispatch('events/calculateWinners', props.id);
         await fetchAndSetEvent(); // Re-fetch in case the action does update winners partially
    } catch (error) {
        console.error("Error triggering winner calculation:", error);
        alert(`Error calculating winners: ${error.message}`);
    }
};

const copyRatingLink = async () => {
    if (!event.value) return;
    // Generate the link to the event details page itself. Users rate from here.
    const link = window.location.href; // Use the current page URL
    try {
        await navigator.clipboard.writeText(link);
        linkCopied.value = true;
        setTimeout(() => { linkCopied.value = false; }, 2000); // Hide message after 2s
    } catch (err) {
        console.error('Failed to copy link: ', err);
        alert("Failed to copy link to clipboard.");
    }
};

const goToIndividualRating = () => {
    if (!event.value || !event.value.participants || event.value.participants.length === 0) return;
    // Navigate to the rating form, passing ALL participants in the query for now
    // The RatingForm needs refinement to handle rating multiple users if this is the intent
    // Or, ideally, link to rate specific users from the UserCard component itself
    console.warn("Navigating to generic rating form for individual event. Form needs refinement to handle multiple participants.");
     router.push({
        path: `/rating/${props.id}`, // No teamId needed
        // Query might include all participants, but form currently handles one
        query: { members: event.value.participants.join(',') }
    });
};

</script>

<style scoped>
.badge {
    font-size: 0.9em;
}
.gap-2 { /* Ensure gap works */
    gap: 0.5rem;
}
.ms-auto { /* Ensure margin works */
    margin-left: auto !important;
}
.fa-award {
    color: #ffc107; /* Bootstrap warning yellow */
}
</style>