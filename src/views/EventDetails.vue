// /src/views/EventDetails.vue
<template>
    <div class="container mt-4">
        <div v-if="loading" class="text-center">
             <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
        <div v-else-if="event">
            <!-- Add Back Button -->
            <div class="d-flex align-items-center mb-4">
                <button class="btn btn-secondary me-3" @click="$router.back()">
                    <i class="fas fa-arrow-left me-2"></i>Back
                </button>
            </div>

            <!-- Event Header Card -->
            <div class="card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h2 class="mb-0">{{ event.eventName }}</h2>
                    <span :class="['badge', statusBadgeClass]">{{ event.status }}</span>
                </div>
                <div class="card-body">
                    <p><strong>Type:</strong> {{ event.eventType }}</p>
                    <p><strong>Description:</strong> {{ event.description || 'No description provided.' }}</p>
                    <p><strong>Dates:</strong> {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}</p>
                    <p>
                        <strong>Organizer(s):</strong>
                        <span v-if="organizerNamesLoading">Loading...</span>
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

                    <!-- Participant Actions -->
                    <div v-if="isParticipantOrTeamMember && !isAdmin" class="mt-3 pt-3 border-top">
                        <h5 class="mb-3">Participant Actions</h5>
                        <!-- Leave Event Button -->
                        <button v-if="event.status === 'Upcoming'"
                                @click="leaveEvent"
                                class="btn btn-outline-warning btn-sm me-2">
                            <i class="fas fa-sign-out-alt me-1"></i> Leave Event
                        </button>

                        <!-- Submit Project Button -->
                        <button v-if="event.status === 'In Progress' && !hasSubmittedProject"
                                @click="showSubmissionModal = true"
                                class="btn btn-outline-success btn-sm">
                            <i class="fas fa-upload me-1"></i> Submit Project
                        </button>
                        <span v-if="event.status === 'In Progress' && hasSubmittedProject" class="text-success small ms-2">
                            <i class="fas fa-check-circle me-1"></i> Project Submitted
                        </span>
                         <span v-if="event.status !== 'Upcoming' && event.status !== 'In Progress'" class="text-muted small">
                            (Actions available before/during event)
                        </span>

                    </div>
                </div>
            </div>

            <!-- Management Section (for Admin/Organizer) -->
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
                       <li v-for="participantId in event.participants" :key="participantId" class="list-group-item d-flex justify-content-between align-items-center">
                            <router-link :to="{ name: 'PublicProfile', params: { userId: participantId }}">
                                {{ getUserNameFromCache(participantId) || participantId }}
                            </router-link>
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

             <!-- Display Submissions Section -->
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Project Submissions</h3>
                </div>
                <div class="card-body">
                    <div v-if="loadingSubmissions" class="text-center">Loading submissions...</div>
                     <div v-else-if="submissions.length === 0" class="alert alert-light">No projects submitted yet.</div>
                     <ul v-else class="list-group list-group-flush">
                         <li v-for="(sub, index) in submissions" :key="`sub-${index}`" class="list-group-item">
                             <p class="mb-1"><strong>{{ sub.projectName }}</strong></p>
                             <p class="mb-1" v-if="sub.description"><small>{{ sub.description }}</small></p>
                             <a :href="sub.link" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary me-2">
                                <i class="fas fa-link me-1"></i> View Link
                             </a>
                             <span v-if="sub.submittedBy" class="text-muted small">
                                Submitted by: {{ sub.submittedBy }}
                            </span>
                         </li>
                     </ul>
                </div>
            </div>

             <!-- Winner Selection UI (Manual) -->
            <div v-if="canManageEvent && event.status === 'Completed'" class="card mb-4">
                 <div class="card-header">Select Winner (Manual)</div>
                 <div class="card-body">
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
                    <div v-else-if="!event.isTeamEvent && event.participants && event.participants.length > 0">
                        <div v-for="participantId in event.participants" :key="'win-user-'+participantId" class="form-check">
                             <input
                                type="radio"
                                :id="'user-' + participantId"
                                :value="participantId"
                                v-model="selectedWinner"
                                name="winnerSelection"
                                class="form-check-input">
                            <label :for="'user-' + participantId" class="form-check-label">
                                {{ getUserNameFromCache(participantId) || participantId }}
                            </label>
                        </div>
                    </div>
                     <p v-else class="text-muted">No teams or participants available to select a winner from.</p>
                    <button @click="saveWinner" class="btn btn-primary btn-sm mt-3" :disabled="!selectedWinner">Save Selected Winner</button>
                 </div>
            </div>

             <!-- Display Winner -->
             <div v-if="event.winners && event.winners.length > 0" class="card bg-light border-warning mb-4">
                 <div class="card-body text-center">
                    <h4 class="text-warning mb-2"><i class="fas fa-award me-2"></i>Winner!</h4>
                     <p class="lead mb-0">{{ getWinnerName(event.winners[0]) || event.winners[0] }}</p>
                 </div>
             </div>

             <!-- Project Submission Modal -->
             <div class="modal fade" id="submissionModal" tabindex="-1" aria-labelledby="submissionModalLabel" aria-hidden="true" ref="submissionModalRef"> {/* Added ref */}
                 <div class="modal-dialog">
                     <div class="modal-content">
                         <div class="modal-header">
                             <h5 class="modal-title" id="submissionModalLabel">Submit Project Details</h5>
                             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" @click="showSubmissionModal = false"></button> {/* Close ref state */}
                         </div>
                         <form @submit.prevent="submitProject">
                             <div class="modal-body">
                                 <div v-if="submissionError" class="alert alert-danger">{{ submissionError }}</div>
                                 <div class="mb-3">
                                     <label for="projectName" class="form-label">Project Name <span class="text-danger">*</span></label>
                                     <input type="text" v-model="submissionForm.projectName" id="projectName" class="form-control" required>
                                 </div>
                                 <div class="mb-3">
                                     <label for="projectLink" class="form-label">Project Link (GitHub, Website, etc.) <span class="text-danger">*</span></label>
                                     <input type="url" v-model="submissionForm.link" id="projectLink" class="form-control" required placeholder="https://...">
                                 </div>
                                 <div class="mb-3">
                                     <label for="projectDescription" class="form-label">Brief Description</label>
                                     <textarea v-model="submissionForm.description" id="projectDescription" class="form-control" rows="3"></textarea>
                                 </div>
                             </div>
                             <div class="modal-footer">
                                 <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="showSubmissionModal = false">Close</button> {/* Close ref state */}
                                 <button type="submit" class="btn btn-primary" :disabled="isSubmittingProject">
                                     {{ isSubmittingProject ? 'Submitting...' : 'Submit Project' }}
                                </button>
                             </div>
                         </form>
                     </div>
                 </div>
             </div>

        </div>
        <div v-else class="alert alert-warning">Event not found or you do not have permission to view it.</div>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'; // Added onUnmounted
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Modal } from 'bootstrap'; // Import Modal

const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();

const loading = ref(true);
const event = ref(null);
const selectedWinner = ref(null);
const linkCopied = ref(false);
const nameCache = ref(new Map());
const organizerNamesLoading = ref(false);

// Modal and Submission State
const submissionModalRef = ref(null); // Ref for the modal DOM element
let submissionModalInstance = null; // To hold the Bootstrap Modal instance
const showSubmissionModal = ref(false); // Controls modal visibility via script
const submissionForm = ref({ projectName: '', link: '', description: '' });
const submissionError = ref('');
const isSubmittingProject = ref(false);

// Fetch Logic
async function fetchUserNames(userIds) {
    if (!userIds || userIds.length === 0) return;
    organizerNamesLoading.value = true; // Reuse this loading state for now
    const idsToFetch = userIds.filter(id => id && !nameCache.value.has(id));
    if (idsToFetch.length === 0) {
        organizerNamesLoading.value = false;
        return;
    }
    // console.log("Fetching names for UIDs:", idsToFetch);
    try {
        const fetchPromises = idsToFetch.map(async (id) => {
            try {
                const userDocRef = doc(db, 'users', id);
                const docSnap = await getDoc(userDocRef);
                nameCache.value.set(id, docSnap.exists() ? (docSnap.data().name || id) : id);
            } catch (fetchError) {
                console.error(`Failed to fetch user data for ${id}:`, fetchError);
                nameCache.value.set(id, id);
            }
        });
        await Promise.all(fetchPromises);
    } catch (error) {
        console.error("Error fetching user names:", error);
    } finally {
        organizerNamesLoading.value = false;
    }
}

async function fetchAndSetEvent() {
    loading.value = true;
    event.value = null;
    selectedWinner.value = null;
    try {
        const fetchedEvent = await store.dispatch('events/fetchEventDetails', props.id);
        if (fetchedEvent) {
            event.value = fetchedEvent;
            selectedWinner.value = fetchedEvent.winners?.[0] ?? null;

            let ids = new Set();
            if (fetchedEvent.organizer) ids.add(fetchedEvent.organizer);
            (fetchedEvent.coOrganizers || []).forEach(id => ids.add(id));
             (fetchedEvent.participants || []).forEach(id => ids.add(id));
             (fetchedEvent.teams || []).forEach(team => {
                 (team.members || []).forEach(id => ids.add(id));
                 // Add participant IDs from team submissions if needed later
             });
             // Add participant IDs from individual submissions
              (fetchedEvent.submissions || []).forEach(sub => ids.add(sub.participantId));


            await fetchUserNames(Array.from(ids));

        } else {
            console.warn(`Event with ID ${props.id} not found.`);
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
    } finally {
        loading.value = false;
    }
}

// Lifecycle Hooks
onMounted(async () => {
     await fetchAndSetEvent(); // Fetch event first

     // Initialize modal instance after DOM is ready
     if (submissionModalRef.value) {
         submissionModalInstance = new Modal(submissionModalRef.value);

         // Optional: Listen to BS modal events to sync state if user closes it via backdrop/esc/close button
         submissionModalRef.value.addEventListener('hidden.bs.modal', () => {
            if (showSubmissionModal.value) { // Only update if the script didn't trigger the hide
                 showSubmissionModal.value = false;
            }
            // Clear form when modal is hidden, regardless of how it was closed
            submissionForm.value = { projectName: '', link: '', description: '' };
            submissionError.value = '';
            isSubmittingProject.value = false;
         });
          submissionModalRef.value.addEventListener('shown.bs.modal', () => {
             if (!showSubmissionModal.value) { // If shown by other means (e.g., data-bs-toggle), sync state
                  showSubmissionModal.value = true;
             }
          });
     }
 });

 onUnmounted(() => {
     // Clean up modal instance and listeners to prevent memory leaks
     if (submissionModalInstance) {
         submissionModalInstance.dispose();
     }
      // Remove event listeners if added directly (BS might handle its own cleanup via dispose)
      // submissionModalRef.value?.removeEventListener(...) // If needed
 });

// Watcher to programmatically show/hide modal based on reactive state
watch(showSubmissionModal, (newValue) => {
    if (!submissionModalInstance) return; // Don't do anything if modal isn't initialized
    if (newValue) {
        submissionModalInstance.show();
    } else {
        submissionModalInstance.hide();
    }
});


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
const statusBadgeClass = computed(() => {
    switch (event.value?.status) {
        case 'Upcoming': return 'bg-info text-dark'; case 'In Progress': return 'bg-primary';
        case 'Completed': return 'bg-success'; case 'Cancelled': return 'bg-danger';
        case 'Approved': return 'bg-light text-dark border'; default: return 'bg-secondary';
    }
});
const isParticipantOrTeamMember = computed(() => {
    if (!currentUser.value || !event.value) return false;
    const userId = currentUser.value.uid;
    if (event.value.isTeamEvent) {
        return event.value.teams?.some(team => team.members?.includes(userId));
    } else {
        return event.value.participants?.includes(userId);
    }
});
const hasSubmittedProject = computed(() => {
    if (!currentUser.value || !event.value || !isParticipantOrTeamMember.value) return false;
     const userId = currentUser.value.uid;
     if (event.value.isTeamEvent) {
         const userTeam = event.value.teams?.find(team => team.members?.includes(userId));
         return userTeam?.submissions?.length > 0; // Simplified check
     } else {
         return event.value.submissions?.some(sub => sub.participantId === userId);
     }
});
const loadingSubmissions = ref(false);
const submissions = computed(() => {
     if (!event.value) return [];
     loadingSubmissions.value = true;
     let subs = [];
     if (event.value.isTeamEvent && event.value.teams) {
         event.value.teams.forEach(team => {
             (team.submissions || []).forEach(s => {
                  subs.push({ ...s, submittedBy: `Team: ${team.teamName}` });
             });
         });
     } else if (!event.value.isTeamEvent && event.value.submissions) {
         subs = event.value.submissions.map(s => {
             const participantName = getUserNameFromCache(s.participantId) || s.participantId;
             return { ...s, submittedBy: participantName };
         });
     }
     loadingSubmissions.value = false;
     return subs;
});


// Methods
const formatDate = (timestamp) => {
    if (timestamp?.seconds) { return new Date(timestamp.seconds * 1000).toLocaleDateString(); }
    try { if (timestamp instanceof Date) return timestamp.toLocaleDateString(); if (typeof timestamp === 'string') return new Date(timestamp).toLocaleDateString(); } catch (e) { /* ignore */ } return 'N/A';
};
const getOrganizerNames = () => {
     if (!event.value) return null;
     let names = [];
     const primaryName = getUserNameFromCache(event.value.organizer);
     if (primaryName) names.push(primaryName);
     else if(event.value.organizer) names.push(event.value.organizer);

     (event.value.coOrganizers || []).forEach(id => {
         const coName = getUserNameFromCache(id);
         if (coName) names.push(coName);
         else if(id) names.push(id);
     });
     return names.join(', ') || null;
};
const getUserNameFromCache = (userId) => nameCache.value.get(userId) || null;
const getWinnerName = (winnerIdentifier) => {
    if (!winnerIdentifier || !event.value) return winnerIdentifier;
    if (!event.value.isTeamEvent) {
        return getUserNameFromCache(winnerIdentifier) || winnerIdentifier;
    }
    return winnerIdentifier;
};
const goToManageTeams = () => { router.push({ name: 'ManageTeams', params: { id: props.id } }); };
const updateStatus = async (newStatus) => {
    if (!event.value) return; try { await store.dispatch('events/updateEventStatus', { eventId: props.id, newStatus }); await fetchAndSetEvent(); } catch (error) { console.error(`Error updating status to ${newStatus}:`, error); alert(`Failed to update status: ${error.message}`); }
};
const toggleRatingsOpen = async (isOpen) => {
     if (!event.value) return; try { await store.dispatch('events/toggleRatingsOpen', { eventId: props.id, isOpen }); await fetchAndSetEvent(); } catch (error) { console.error("Error toggling ratings:", error); alert(`Failed to toggle ratings: ${error.message}`); }
};
const saveWinner = async () => {
     if (!event.value || !selectedWinner.value) return;
    try {
        await store.dispatch('events/setWinners', { eventId: props.id, winners: [selectedWinner.value] });
        await fetchAndSetEvent();
        alert("Winner saved successfully!");
    } catch (error) {
        console.error("Error saving winner:", error);
        alert(`Failed to save winner: ${error.message}`);
    }
};
const deleteEvent = async () => {
     if (!event.value) return; if (confirm(`PERMANENTLY DELETE "${event.value.eventName}"?`)) { try { await store.dispatch('events/deleteEvent', props.id); alert("Event deleted."); router.push({ name: 'Home' }); } catch (error) { console.error('Error deleting:', error); alert(`Failed to delete: ${error.message}`); } }
};
const calculateWinners = async () => {
     if (!event.value) return; try { await store.dispatch('events/calculateWinners', props.id); await fetchAndSetEvent(); } catch (error) { console.error("Error calc winners:", error); alert(`Error calculating winners: ${error.message}`); } // Alert is in action now
};
const copyRatingLink = async () => {
    if (!event.value) return; const link = window.location.href; try { await navigator.clipboard.writeText(link); linkCopied.value = true; setTimeout(() => { linkCopied.value = false; }, 2000); } catch (err) { console.error('Copy failed: ', err); alert("Failed to copy."); }
};
const goToIndividualRating = (participantId) => {
    if (!event.value || !participantId) return;
     router.push({ path: `/rating/${props.id}`, query: { participant: participantId } });
};

// --- Submit Project Method ---
const submitProject = async () => {
    submissionError.value = '';
    if (!submissionForm.value.projectName || !submissionForm.value.link) {
        submissionError.value = 'Project Name and Link are required.';
        return;
    }
     if (!submissionForm.value.link.startsWith('http://') && !submissionForm.value.link.startsWith('https://')) {
        submissionError.value = 'Please enter a valid URL starting with http:// or https://';
        return;
    }
    isSubmittingProject.value = true;
    try {
        await store.dispatch('events/submitProjectToEvent', {
            eventId: props.id,
            submissionData: { ...submissionForm.value } // Send copy
        });
        showSubmissionModal.value = false; // Close modal on success
        await fetchAndSetEvent(); // Re-fetch data
        alert("Project submitted successfully!");

    } catch (error) {
        console.error("Error submitting project:", error);
        submissionError.value = error.message || 'Failed to submit project.';
    } finally {
        isSubmittingProject.value = false;
    }
};

// --- Leave Event Method ---
const leaveEvent = async () => {
    if (!event.value) return;
    if (confirm('Are you sure you want to leave this event? This cannot be undone.')) {
        try {
            await store.dispatch('events/leaveEvent', props.id);
            await fetchAndSetEvent();
            alert("You have successfully left the event.");
        } catch (error) {
            console.error("Error leaving event:", error);
            alert(`Failed to leave event: ${error.message}`);
        }
    }
};


</script>

<style scoped>
.gap-2 { gap: 0.5rem; }
.ms-auto { margin-left: auto !important; }
.fa-award { color: #ffc107; }
.form-check-label { margin-left: 0.25rem; }
.modal-body .alert { margin-bottom: 1rem; }
.badge { font-size: 0.9em; }
.btn-outline-primary {
    --bs-btn-color: var(--color-primary);
    --bs-btn-border-color: var(--color-primary);
    --bs-btn-hover-color: #fff;
    --bs-btn-hover-bg: var(--color-primary-hover);
    --bs-btn-hover-border-color: var(--color-primary-hover);
    --bs-btn-active-color: #fff;
    --bs-btn-active-bg: var(--color-primary-hover);
    --bs-btn-active-border-color: var(--color-primary-hover);
    --bs-btn-disabled-color: var(--color-primary);
    --bs-btn-disabled-bg: transparent;
}
.btn-outline-warning {
    --bs-btn-color: var(--color-warning);
    --bs-btn-border-color: var(--color-warning);
     --bs-btn-hover-color: #000;
    --bs-btn-hover-bg: #ffca2c; /* Slightly darker yellow */
    --bs-btn-hover-border-color: #ffc720;
    --bs-btn-active-color: #000;
    --bs-btn-active-bg: #ffcd39;
    --bs-btn-active-border-color: #ffc720;
}
.btn-outline-success {
    --bs-btn-color: var(--color-success);
    --bs-btn-border-color: var(--color-success);
     --bs-btn-hover-color: #fff;
    --bs-btn-hover-bg: var(--color-secondary-hover);
    --bs-btn-hover-border-color: var(--color-secondary-hover);
    --bs-btn-active-color: #fff;
    --bs-btn-active-bg: var(--color-secondary-hover);
    --bs-btn-active-border-color: var(--color-secondary-hover);
}
</style>