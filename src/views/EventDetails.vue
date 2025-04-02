// src/views/EventDetails.vue
<template>
    <div class="container mt-4">
        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
        <div v-else-if="event">
            <!-- Back Button -->
            <div class="mb-4">
                <button class="btn btn-secondary btn-sm" @click="$router.back()">
                    <i class="fas fa-arrow-left me-1"></i> Back
                </button>
            </div>

            <!-- Global Error Message Display -->
            <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
                {{ errorMessage }}
                <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
            </div>

            <!-- Event Header Card -->
            <div class="card mb-4 shadow"> 
                <div class="card-header d-flex justify-content-between align-items-center flex-wrap">
                    <h2 class="mb-0 me-3">{{ event.eventName }}</h2>
                    <span :class="['badge', statusBadgeClass, 'mt-1 mt-md-0']">{{ event.status }}</span>
                </div>
                <div class="card-body">
                    <p><strong>Type:</strong> {{ event.eventType }}</p>
                    <p><strong>Description:</strong> {{ event.description || 'No description provided.' }}</p>
                    <p><strong>Dates:</strong> {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}</p>
                    <p>
                        <strong>Organizer(s):</strong>
                        <span v-if="organizerNamesLoading" class="spinner-border spinner-border-sm text-muted ms-1"
                            role="status" aria-hidden="true"></span>
                        <span v-else>{{ getOrganizerNames() || 'N/A' }}</span>
                    </p>
                    <p v-if="event.coOrganizers && event.coOrganizers.length > 0">
                        <strong>Co-Organizer(s):</strong>
                        <span v-if="organizerNamesLoading" class="spinner-border spinner-border-sm text-muted ms-1"
                            role="status" aria-hidden="true"></span>
                        <span v-else>{{ getCoOrganizerDisplayNames() || 'N/A' }}</span>
                    </p>
                    <p><strong>Team Event:</strong> {{ event.isTeamEvent ? 'Yes' : 'No' }}</p>
                    <p v-if="event.status === 'Completed'">
                        <strong>Ratings:</strong>
                        <span :class="['badge', event.ratingsOpen ? 'bg-success' : 'bg-secondary']">
                            {{ event.ratingsOpen ? 'Open' : 'Closed' }}
                        </span>
                    </p>
                    <p v-if="event.ratingConstraints && event.ratingConstraints.length > 0" class="small">
                        <strong>Rating Criteria:</strong> {{ event.ratingConstraints.join(' | ') }}
                    </p>

                    <!-- Participant/User Actions -->
                    <div v-if="isAuthenticated && !isAdmin && (event.status === 'Upcoming' || event.status === 'In Progress')"
                        class="mt-3 pt-3 border-top">
                        <h5 class="mb-3">My Actions</h5>
                        <div class="d-flex flex-wrap gap-2">
                            <!-- Leave Event Button -->
                            <button v-if="event.status === 'Upcoming' && isParticipantOrTeamMember" @click="leaveEvent"
                                class="btn btn-outline-warning btn-sm">
                                <i class="fas fa-sign-out-alt me-1"></i> Leave Event
                            </button>

                            <!-- Submit Project Button -->
                            <button v-if="canSubmitProject" @click="showSubmissionModal = true"
                                class="btn btn-outline-success btn-sm">
                                <i class="fas fa-upload me-1"></i> Submit Project
                            </button>
                            <span v-if="event.status === 'In Progress' && hasSubmittedProject"
                                class="text-success small align-self-center">
                                <i class="fas fa-check-circle me-1"></i> Project Submitted
                            </span>
                            <span v-else-if="event.status === 'In Progress' && isParticipantOrTeamMember"
                                class="text-muted small align-self-center">
                                (Submission allowed during 'In Progress')
                            </span>
                            <span
                                v-if="event.status !== 'Upcoming' && event.status !== 'In Progress' && isParticipantOrTeamMember"
                                class="text-muted small align-self-center">
                                (Actions only available before/during event)
                            </span>
                            <span v-if="!isParticipantOrTeamMember && event.status === 'Upcoming'"
                                class="text-muted small align-self-center">
                                (You are not currently participating in this event)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Management Section (for Admin/Organizer/CoOrganizer) -->
            <div v-if="canManageEvent" class="card mb-4 shadow">  
                <div class="card-header">Event Management</div>
                <div class="card-body d-flex flex-wrap gap-2">
                    <!-- Status Buttons with Date Checks -->
                    <template v-if="event.status !== 'Completed' && event.status !== 'Cancelled'">
                        <button v-if="event.status === 'Upcoming' || event.status === 'Approved'"
                            @click="updateStatus('In Progress')" class="btn btn-info btn-sm"
                            :disabled="!canActuallyMarkInProgress"
                            :title="canActuallyMarkInProgress ? 'Set event status to In Progress' : 'Can only mark in progress on or after start date'">
                            <i class="fas fa-play me-1"></i> Mark In Progress
                        </button>
                        <button v-if="event.status === 'In Progress'" @click="updateStatus('Completed')"
                            class="btn btn-success btn-sm"
                            :disabled="!canActuallyMarkCompleted"
                            :title="canActuallyMarkCompleted ? 'Set event status to Completed' : 'Can only mark completed on or after end date'">
                            <i class="fas fa-check-circle me-1"></i> Mark Completed
                        </button>
                        <button @click="updateStatus('Cancelled')" class="btn btn-warning btn-sm"><i
                                class="fas fa-times-circle me-1"></i> Cancel Event</button>
                    </template>

                    <!-- Ratings Toggle, Winner Calc, Copy Link -->
                    <button v-if="event.status === 'Completed'" @click="toggleRatingsOpen(!event.ratingsOpen)"
                        class="btn btn-secondary btn-sm">
                        <i :class="['fas', event.ratingsOpen ? 'fa-lock' : 'fa-lock-open', 'me-1']"></i> {{
                            event.ratingsOpen ? 'Close Ratings' : 'Open Ratings' }}
                    </button>
                    <button v-if="event.status === 'Completed' && event.ratingsOpen && hasEnoughRatings"
                        @click="calculateWinners" class="btn btn-outline-secondary btn-sm"
                        title="Attempt automatic calculation based on average ratings">
                        <i class="fas fa-trophy me-1"></i> Calculate Winner (Auto)
                    </button>
                    <button v-if="event.status === 'Completed' && event.ratingsOpen" @click="copyRatingLink"
                        class="btn btn-outline-info btn-sm">
                        <i class="fas fa-share-alt me-1"></i> Copy Rating Link
                    </button>

                    <!-- Delete Button - Only show during Pending state AND if user can manage -->
                    <button v-if="canManageEvent && event?.status === 'Pending'" @click="deleteEvent"
                        class="btn btn-danger btn-sm ms-auto">
                        <i class="fas fa-trash-alt me-1"></i> Delete Event Request
                    </button>
                </div>
            </div>

            <!-- Teams Section (Display Only for Team Events) -->
            <div v-if="event.isTeamEvent" class="mb-4">
                <h3 class="mb-3">Teams</h3>
                <TeamList v-if="event.teams && event.teams.length > 0" :teams="event.teams" :eventId="id"
                    :ratingsOpen="event.ratingsOpen && event.status === 'Completed'"
                    :get-user-name="getUserNameFromCache" :organizer-names-loading="organizerNamesLoading"
                    :current-user-uid="currentUser.uid" />
                <p v-else class="alert alert-light">No teams defined for this event.</p>
            </div>

            <!-- Participants Section (Display Only for Individual Events) -->
            <div v-else class="mb-4">
                <h3 class="mb-3">Participants</h3>
                <div v-if="event.participants && event.participants.length > 0">
                    <!-- Add Rating Button for Individual Events -->
                    <div v-if="event.ratingsOpen && event.status === 'Completed'" class="mb-3">
                        <button @click="goToWinnerSelection" class="btn btn-primary" v-if="canRateEvent">
                            <i class="fas fa-trophy me-1"></i>
                            Select Winners
                        </button>
                        <span v-else class="text-muted">
                            (You've already submitted your winner selections)
                        </span>
                    </div>

                    <ul class="list-group shadow"> 
                        <li v-for="(participantId, index) in sortedParticipants" :key="participantId"
                            class="list-group-item d-flex justify-content-between align-items-center"
                            :class="{ 'highlighted-user': participantId === currentUser?.uid }">
                            <div class="d-flex align-items-center">
                                <i v-if="isWinner(participantId)" class="fas fa-trophy text-warning me-2"
                                    title="Winner">
                                </i>
                                <router-link :to="{ name: 'PublicProfile', params: { userId: participantId } }">
                                    <i class="fas fa-user me-2 text-muted"></i>
                                    {{ getUserNameFromCache(participantId) || 'Anonymous User' }}
                                </router-link>
                            </div>
                        </li>
                    </ul>
                </div>
                <p v-else class="alert alert-light">No participants found for this event. Students are added
                    automatically but may
                    have left.</p>
            </div>

            <!-- Display Submissions Section -->
            <div class="card mb-4 shadow"> 
                <div class="card-header">
                    <h3 class="mb-0">Project Submissions</h3>
                </div>
                <div class="card-body">
                    <div v-if="loadingSubmissions" class="text-center"> /* ... loading spinner ... */ </div>
                    <div v-else-if="submissions.length === 0" class="alert alert-light mb-0">No projects submitted yet.
                    </div>
                    <ul v-else class="list-group list-group-flush">
                        <li v-for="(sub, index) in submissions" :key="`sub-${index}`" class="list-group-item px-0 py-3">
                            <p class="mb-1 fw-bold">{{ sub.projectName }}</p>
                            <p class="mb-1 small" v-if="sub.description">{{ sub.description }}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <a :href="sub.link" target="_blank" rel="noopener noreferrer"
                                    class="btn btn-sm btn-outline-primary me-2 btn-inline-mobile" v-if="sub.link">
                                    <i class="fas fa-link me-1"></i> View Link
                                </a>
                                <span v-if="sub.submittedBy" class="text-muted small ms-auto">
                                    Submitted by: {{ getUserNameFromCache(sub.submittedBy) || 'Anonymous User' }}
                                </span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Display Winner -->
            <div v-if="event.winners && event.winners.length > 0" class="card bg-light border-warning mb-4 shadow"> 
                <div class="card-body text-center">
                    <h4 class="text-warning mb-2"><i class="fas fa-award me-2"></i>Winner!</h4>
                    <div v-for="winnerId in event.winners" :key="winnerId" class="lead mb-1">
                        {{ getWinnerName(winnerId) || winnerId }}
                    </div>
                </div>
            </div>

            <!-- Project Submission Modal -->
            <div class="modal fade" id="submissionModal" tabindex="-1" aria-labelledby="submissionModalLabel"
                aria-hidden="true" ref="submissionModalRef">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="submissionModalLabel">Submit Project Details</h5>
                            <button type="button" class="btn-close" aria-label="Close"
                                @click="closeSubmissionModal"></button>
                        </div>
                        <form @submit.prevent="submitProject">
                            <div class="modal-body">
                                <div v-if="submissionError" class="alert alert-danger">{{ submissionError }}</div>
                                <div class="mb-3">
                                    <label for="projectName" class="form-label">Project Name <span
                                            class="text-danger">*</span></label>
                                    <input type="text" v-model="submissionForm.projectName" id="projectName"
                                        class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label for="projectLink" class="form-label">Project Link (GitHub, Demo, etc.) <span
                                            class="text-danger">*</span></label>
                                    <input type="url" v-model="submissionForm.link" id="projectLink"
                                        class="form-control" required placeholder="https://...">
                                </div>
                                <div class="mb-3">
                                    <label for="projectDescription" class="form-label">Brief Description</label>
                                    <textarea v-model="submissionForm.description" id="projectDescription"
                                        class="form-control" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary"
                                    @click="closeSubmissionModal">Close</button>
                                <button type="submit" class="btn btn-primary" :disabled="isSubmittingProject">
                                    <span v-if="isSubmittingProject" class="spinner-border spinner-border-sm me-1"
                                        role="status" aria-hidden="true"></span>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import TeamList from '../components/TeamList.vue';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Modal } from 'bootstrap';

// Props, Store, Router
const props = defineProps({ id: { type: String, required: true } });
const store = useStore();
const router = useRouter();
const route = useRoute();

// State Refs
const loading = ref(true);
const event = ref(null); // Holds reactive event data from store
const selectedWinner = ref(null);
const linkCopied = ref(false);
const nameCache = ref(new Map());
const organizerNamesLoading = ref(false);
const submissionModalRef = ref(null);
let submissionModalInstance = null;
const showSubmissionModal = ref(false);
const submissionForm = ref({ projectName: '', link: '', description: '' });
const submissionError = ref('');
const isSubmittingProject = ref(false);
const loadingSubmissions = ref(false);
const errorMessage = ref(''); // Already exists, will be used for action errors too

// Fetch User Names
async function fetchUserNames(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) return;
    organizerNamesLoading.value = true;
    const idsToFetch = [...new Set(userIds)].filter(id => id && !nameCache.value.has(id));
    if (idsToFetch.length === 0) { organizerNamesLoading.value = false; return; }
    try {
        const chunkSize = 10;
        for (let i = 0; i < idsToFetch.length; i += chunkSize) {
            const chunk = idsToFetch.slice(i, i + chunkSize);
            const fetchPromises = chunk.map(async (id) => {
                try {
                    const userDocRef = doc(db, 'users', id);
                    const docSnap = await getDoc(userDocRef);
                    nameCache.value.set(id, docSnap.exists() ? (docSnap.data().name || id) : id);
                } catch (fetchError) { nameCache.value.set(id, id); }
            });
            await Promise.all(fetchPromises);
        }
    } catch (error) {
        console.error("Error fetching user names:", error);
        idsToFetch.forEach(id => { if (!nameCache.value.has(id)) nameCache.value.set(id, id); });
    } finally {
        organizerNamesLoading.value = false;
    }
}

// Watch Store Getter for Event Data
const eventFromStore = computed(() => store.getters['events/currentEventDetails']);
watch(eventFromStore, (newEventData) => {
    if (newEventData && newEventData.id === props.id) {
        event.value = newEventData;
        selectedWinner.value = (newEventData.winners && newEventData.winners.length > 0) ? newEventData.winners[0] : null;
        // Collect all relevant IDs from the new event data
        let ids = new Set();
        if (newEventData.organizer) ids.add(newEventData.organizer);
        (newEventData.coOrganizers || []).forEach(id => ids.add(id));
        (newEventData.participants || []).forEach(id => ids.add(id));
        (newEventData.teams || []).forEach(team => (team.members || []).forEach(id => ids.add(id)));
        (newEventData.submissions || []).forEach(sub => { if (sub.participantId) ids.add(sub.participantId); });
        (newEventData.teams || []).forEach(team => (team.submissions || []).forEach(s => { if (s.submittedBy) ids.add(s.submittedBy); })); // Fetch submitter name if needed
        fetchUserNames(Array.from(ids)); // Fetch names based on updated IDs
        loading.value = false; // Ensure loading stops
    } else if (!loading.value && newEventData?.id !== props.id) {
        // Handle case where store details change to a *different* event
        event.value = null;
        loading.value = false; // Stop loading if event becomes irrelevant/null
    }
}, { immediate: true, deep: true }); // Use deep watch to catch nested changes like teams array

// Initial Fetch Function
const fetchAndSetEventInitial = async () => {
    try {
        // Add loading state if not already present
        loading.value = true;
        errorMessage.value = '';

        const eventData = await store.dispatch('events/fetchEventDetails', props.id);
        if (!eventData) {
            errorMessage.value = `Event ${props.id} not found.`;
            router.push('/home');
            return;
        }

        event.value = eventData;
        // Fetch names for all users involved in the event
        const userIds = new Set();
        if (eventData.organizer) userIds.add(eventData.organizer);
        if (eventData.coOrganizers) eventData.coOrganizers.forEach(id => userIds.add(id));
        if (eventData.participants) eventData.participants.forEach(id => userIds.add(id));
        if (eventData.teams) {
            eventData.teams.forEach(team => {
                if (team.members) team.members.forEach(id => userIds.add(id));
            });
        }
        await fetchUserNames(Array.from(userIds));
    } catch (error) {
        console.error('Error fetching event:', error);
        errorMessage.value = error.message || 'Failed to load event details.';
    } finally {
        loading.value = false;
    }
};

// Lifecycle Hooks
onMounted(() => {
    fetchAndSetEventInitial();
    // Modal setup
    if (submissionModalRef.value) {
        submissionModalInstance = new Modal(submissionModalRef.value);
        submissionModalRef.value.addEventListener('hidden.bs.modal', () => {
            showSubmissionModal.value = false;
            submissionForm.value = { projectName: '', link: '', description: '' };
            submissionError.value = '';
            isSubmittingProject.value = false;
        });
    }
});
onUnmounted(() => { submissionModalInstance?.dispose(); });
watch(showSubmissionModal, (newValue) => {
    if (!submissionModalInstance) { /* ... try init modal ... */ return; }
    try { if (newValue) { submissionModalInstance.show(); } else { submissionModalInstance.hide(); } }
    catch (e) { console.error("Modal show/hide error:", e); }
});
const closeSubmissionModal = () => { showSubmissionModal.value = false; };

// Computed Properties
const currentUser = computed(() => store.getters['user/getUser']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']); // Check auth status
const isAdmin = computed(() => currentUser.value?.role === 'Admin');
const canManageEvent = computed(() => {
    if (!currentUser.value || !event.value) return false;
    const userId = currentUser.value.uid;
    return event.value.organizer === userId || (Array.isArray(event.value.coOrganizers) && event.value.coOrganizers.includes(userId)) || isAdmin.value;
});
const statusBadgeClass = computed(() => { /* ... badge class logic ... */ });
const isParticipantOrTeamMember = computed(() => {
    if (!currentUser.value || !event.value) return false;
    const userId = currentUser.value.uid;
    return event.value.isTeamEvent
        ? (Array.isArray(event.value.teams) && event.value.teams.some(team => Array.isArray(team.members) && team.members.includes(userId)))
        : (Array.isArray(event.value.participants) && event.value.participants.includes(userId));
});
const hasSubmittedProject = computed(() => {
    if (!currentUser.value || !event.value || !isParticipantOrTeamMember.value) return false;
    const userId = currentUser.value.uid;
    if (event.value.isTeamEvent) {
        const userTeam = (event.value.teams || []).find(team => team.members?.includes(userId));
        return userTeam?.submissions?.length > 0;
    } else {
        return (event.value.submissions || []).some(sub => sub.participantId === userId);
    }
});
const canSubmitProject = computed(() => event.value?.status === 'In Progress' && isParticipantOrTeamMember.value && !hasSubmittedProject.value);
const submissions = computed(() => {
    if (!event.value) return [];
    loadingSubmissions.value = true; // May not be needed if data updates reactively
    let subs = [];
    if (event.value.isTeamEvent && Array.isArray(event.value.teams)) {
        event.value.teams.forEach(team => (team.submissions || []).forEach(s => subs.push({ ...s, submittedBy: `Team: ${team.teamName}` })));
    } else if (!event.value.isTeamEvent && Array.isArray(event.value.submissions)) {
        subs = event.value.submissions.map(s => ({ ...s, submittedBy: getUserNameFromCache(s.participantId) || s.participantId }));
    }
    loadingSubmissions.value = false;
    subs.sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
    return subs;
});
const sortedParticipants = computed(() => {
    if (!event.value || !Array.isArray(event.value.participants)) return [];
    return [...event.value.participants].sort((a, b) => (getUserNameFromCache(a) || a).localeCompare(getUserNameFromCache(b) || b));
});
const sortedTeamsForSelection = computed(() => {
    if (!event.value || !Array.isArray(event.value.teams)) return [];
    return [...event.value.teams].sort((a, b) => (a.teamName || '').localeCompare(b.teamName || ''));
});
const canActuallyMarkInProgress = computed(() => {
    if (!event.value || (event.value.status !== 'Upcoming' && event.value.status !== 'Approved')) return false;
    if (!event.value.startDate) return false; // Cannot mark if no start date
    const now = new Date();
    const startDate = event.value.startDate.toDate();
    startDate.setHours(0, 0, 0, 0); // Compare dates only
    now.setHours(0, 0, 0, 0);
    return now >= startDate;
});
const canActuallyMarkCompleted = computed(() => {
    if (!event.value || event.value.status !== 'In Progress') return false;
    if (!event.value.endDate) return false; // Cannot mark if no end date
    const now = new Date();
    const endDate = event.value.endDate.toDate();
    endDate.setHours(0, 0, 0, 0); // Compare dates only
    now.setHours(0, 0, 0, 0);
    return now >= endDate;
});
const isEventInDateRange = computed(() => { // Keep this as it might be used elsewhere
    if (!event.value?.startDate || !event.value?.endDate) return false;
    const now = new Date();
    const startDate = event.value.startDate.toDate();
    const endDate = event.value.endDate.toDate();
    return now >= startDate && now <= endDate;
});

// --- Methods ---
const formatDate = (timestamp) => { if (timestamp?.seconds) { return new Date(timestamp.seconds * 1000).toLocaleDateString(); } return 'N/A'; };
const getOrganizerNames = () => {
    if (!event.value) return null;
    let names = new Set();
    const primaryName = getUserNameFromCache(event.value.organizer) || event.value.organizer;
    if (primaryName) names.add(primaryName);
    return Array.from(names).join(', ') || null;
};
const getCoOrganizerDisplayNames = () => {
    if (!event.value || !event.value.coOrganizers || event.value.coOrganizers.length === 0) return null;
    return event.value.coOrganizers.map(id => getUserNameFromCache(id) || id).join(', ');
}
const getUserNameFromCache = (userId) => nameCache.value.get(userId) || null;
const getWinnerName = (winnerIdentifier) => { if (!winnerIdentifier || !event.value) return winnerIdentifier; return event.value.isTeamEvent ? winnerIdentifier : (getUserNameFromCache(winnerIdentifier) || winnerIdentifier); };
const updateStatus = async (newStatus) => {
    if (!event.value) return;
    errorMessage.value = ''; // Clear previous errors

    // Add date checks before dispatching
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare dates only

    if (newStatus === 'In Progress') {
        if (!event.value.startDate) {
            alert("Cannot mark as 'In Progress' without a start date.");
            return;
        }
        const startDate = event.value.startDate.toDate();
        startDate.setHours(0, 0, 0, 0);
        if (now < startDate) {
            alert(`Cannot mark as 'In Progress' before the start date (${formatDate(event.value.startDate)}).`);
            return;
        }
    } else if (newStatus === 'Completed') {
        if (!event.value.endDate) {
            alert("Cannot mark as 'Completed' without an end date.");
            return;
        }
        const endDate = event.value.endDate.toDate();
        endDate.setHours(0, 0, 0, 0);
        if (now < endDate) {
            alert(`Cannot mark as 'Completed' before the end date (${formatDate(event.value.endDate)}).`);
            return;
        }
    }

    // Confirmation for Cancel
    if (newStatus === 'Cancelled' && !confirm(`Are you sure you want to cancel the event "${event.value.eventName}"? This action cannot be undone.`)) return;

    try {
        await store.dispatch('events/updateEventStatus', {
            eventId: props.id,
            newStatus
        });
        // Optionally add a success message or rely on UI update
    } catch (error) {
        console.error(`Status update error:`, error);
        errorMessage.value = `Failed to update status: ${error.message || 'Unknown error'}`;
    }
};
const toggleRatingsOpen = async (isOpen) => {
    if (!event.value) return;
    errorMessage.value = ''; // Clear previous errors
    try {
        // Dispatch and get the result status
        const result = await store.dispatch('events/toggleRatingsOpen', { eventId: props.id, isOpen });

        if (result.status === 'error') {
            // Show error message for failures
            errorMessage.value = `Failed to toggle ratings: ${result.message || 'Unknown error'}`;
        } else if (result.status === 'success') {
            // Optionally add a success message or simply rely on UI update
            console.log("Ratings toggled successfully.");
        }
    } catch (unexpectedError) {
        // Catch any truly unexpected errors during dispatch itself
        console.error("Unexpected error calling toggleRatingsOpen action:", unexpectedError);
        errorMessage.value = 'An unexpected error occurred. Please try again.';
    }
};
const saveWinner = async () => {
    if (!event.value || !selectedWinner.value) return;
    errorMessage.value = ''; // Clear previous errors
    try {
        // Update both winners array and winnersPerRole for compatibility
        const updates = {
            winners: [selectedWinner.value],  // Legacy format
            winnersPerRole: {
                default: [selectedWinner.value]  // New format
            }
        };

        await updateDoc(doc(db, 'events', props.id), updates);
        store.dispatch('events/updateLocalEvent', {
            id: props.id,
            changes: updates
        });
        // Optionally add success message
    } catch (error) {
        console.error("Save winner error:", error);
        errorMessage.value = `Failed to save winner: ${error.message || 'Unknown error'}`;
    }
};
const deleteEvent = async () => {
    if (!event.value) return;
    errorMessage.value = ''; // Clear previous errors
    if (confirm(`PERMANENTLY DELETE "${event.value.eventName}"?`)) {
        try {
            await store.dispatch('events/deleteEvent', props.id);
            alert("Event deleted."); // Keep alert for navigation confirmation
            router.push({ name: 'Home' });
        } catch (error) {
            console.error('Delete event error:', error);
            errorMessage.value = `Failed to delete event: ${error.message || 'Unknown error'}`;
        }
    }
};
const calculateWinners = async () => {
    if (!event.value) return;
    errorMessage.value = ''; // Clear previous errors
    try {
        await store.dispatch('events/calculateWinners', props.id);
        // Success/Error alert is handled within the action itself
    } catch (error) {
        console.error("Calc winners error:", error);
        // Error alert is handled within the action, but maybe set local error too?
        errorMessage.value = `Failed to calculate winners: ${error.message || 'Unknown error'}`;
    }
};
const copyRatingLink = async () => {
    const link = window.location.href;
    errorMessage.value = ''; // Clear previous errors
    try {
        await navigator.clipboard.writeText(link);
        linkCopied.value = true;
        setTimeout(() => { linkCopied.value = false; }, 2500);
    } catch (err) {
        console.error('Copy failed: ', err);
        errorMessage.value = "Failed to copy link to clipboard.";
    }
};
const goToIndividualRating = (participantId) => { if (!event.value || !participantId) return; router.push({ name: 'RatingForm', params: { eventId: props.id }, query: { participant: participantId } }); };
const submitProject = async () => {
    submissionError.value = ''; // Use specific error ref for modal
    errorMessage.value = ''; // Clear global error
    if (!submissionForm.value.projectName || !submissionForm.value.link) { submissionError.value = 'Project Name and Link are required.'; return; }
    if (!submissionForm.value.link.startsWith('http')) { submissionError.value = 'Please enter a valid URL starting with http:// or https://.'; return; }
    isSubmittingProject.value = true;
    try {
        await store.dispatch('events/submitProjectToEvent', { eventId: props.id, submissionData: { ...submissionForm.value } });
        showSubmissionModal.value = false;
        alert("Project submitted successfully!"); // Keep alert for modal confirmation
    } catch (error) {
        console.error("Submit project error:", error);
        submissionError.value = `Submission failed: ${error.message || 'Unknown error'}`; // Keep modal error specific
    } finally {
        isSubmittingProject.value = false;
    }
};
const leaveEvent = async () => {
    if (!event.value) return;
    errorMessage.value = ''; // Clear previous errors
    if (confirm('Are you sure you want to leave this event?')) {
        try {
            await store.dispatch('events/leaveEvent', props.id);
            alert("You have successfully left the event."); // Keep alert for confirmation
        } catch (error) {
            console.error("Leave event error:", error);
            errorMessage.value = `Failed to leave event: ${error.message || 'Unknown error'}`;
        }
    }
};

// Add new computed property
const canRateEvent = computed(() => {
    if (!event.value?.ratingsOpen || event.value?.status !== 'Completed') return false;
    if (!currentUser.value?.uid) return false;

    // Check if user has already submitted ratings
    const userRatings = event.value.ratings?.filter(r => r.ratedBy === currentUser.value.uid) || [];
    return userRatings.length === 0;
});

// Modify goToIndividualRating to goToWinnerSelection
const goToWinnerSelection = () => {
    if (!event.value) return;
    router.push({
        name: 'RatingForm',
        params: { eventId: props.id } // Ensure 'eventId' matches route param name
    });
};

// Add helper to check if participant is a winner
const isWinner = (participantId) => {
    if (!event.value) return false;
    // Check both winner formats
    return event.value.winners?.includes(participantId) ||
        Object.values(event.value.winnersPerRole || {}).some(winners =>
            Array.isArray(winners) && winners.includes(participantId)
        );
};

// Add this new computed property with the other computed properties
const hasEnoughRatings = computed(() => {
    if (!event.value) return false;
    const totalRatings = event.value.isTeamEvent
        ? (event.value.teams || []).reduce((sum, team) => sum + (team.ratings?.length || 0), 0)
        : (event.value.ratings?.length || 0);
    return totalRatings >= 10;
});

</script>

<style scoped>
/* Styles rely on main.css and utilities */
.badge {
    font-size: 0.8em;
}

/* Removed redundant spinner-border-sm style, Bootstrap provides it */

.highlighted-user {
    background-color: rgba(var(--color-primary-rgb), 0.1);
    /* Light primary background */
    border-left: 4px solid var(--color-primary);
    /* Primary border on left */
}
</style>
