// src/views/RatingForm.vue
<template>
    <div class="container mt-4">
        <button @click="goBack" class="btn btn-outline-secondary mb-3">
            <i class="fas fa-arrow-left me-2"></i>Back
        </button>
        
        <h2 v-if="!loading && eventName" class="text-center mb-3">
            Rate {{ isTeamEvent ? `Team: ${teamIdToRate}` : `Participant` }}
        </h2>
        <!-- Display Team Members -->
        <div v-if="isTeamEvent && teamMembersToDisplay.length > 0" class="text-center mb-3">
            <p class="mb-1 text-muted"><small><strong>Members:</strong></small></p>
            <ul class="list-inline small">
                <li v-for="memberId in teamMembersToDisplay" :key="memberId" class="list-inline-item">
                    <span class="badge bg-secondary">{{ nameCache[memberId] || memberId }}</span>
                </li>
            </ul>
        </div>
        <!-- End Display Team Members -->
        <p v-if="!loading && eventName" class="text-center text-muted mb-4 small">Event: {{ eventName }}</p>

        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
        <div v-if="errorMessage && !loading" class="alert alert-danger" role="alert">{{ errorMessage }}</div>

        <div v-else-if="!event" class="alert alert-warning">Event not found or ratings are not open.</div>
        <div v-else-if="!hasValidRatingCriteria" class="alert alert-warning">
            This event has no valid rating criteria defined or they are incomplete. Please contact an event organizer.
        </div>
        <div v-else>
            <div class="card">
                <div class="card-body">
                    <form @submit.prevent="submitRating">
                        <!-- Team Event Rating -->
                        <div v-if="isTeamEvent">
                            <h5 class="mb-4">Rate based on the following criteria:</h5>
                            <div v-for="allocation in sortedXpAllocation" :key="allocation.constraintIndex" class="mb-4">
                                <label :for="'rating-' + allocation.constraintIndex" class="form-label fw-bold">{{ allocation.constraintLabel }}</label>
                                <div class="rating-wrapper mb-2">
                                    <CustomStarRating
                                        :id="'rating-' + allocation.constraintIndex"
                                        v-model="ratings[`constraint${allocation.constraintIndex}`].score"
                                        :disabled="isSubmitting"
                                        :show-rating="true"
                                    />
                                </div>
                                <p class="text-muted small mt-1 mb-0">
                                    <i class="fas fa-trophy me-1"></i>Worth up to {{ allocation.points }} XP 
                                    ({{ formatRoleName(allocation.role) }})
                                </p>
                            </div>
                        </div>
                        
                        <!-- Individual Event Winner Selection -->
                        <div v-else>
                            <h5 class="mb-4">Select Winners for Each Criterion:</h5>
                            <div v-for="allocation in sortedXpAllocation" :key="allocation.constraintIndex" class="mb-4">
                                <div class="constraint-section p-3 border rounded bg-light-subtle">
                                    <h6 class="mb-3">{{ allocation.constraintLabel }}</h6>
                                    <div class="form-group">
                                        <label :for="'winner-' + allocation.constraintIndex" class="form-label">Select Winner for {{ allocation.constraintLabel }}</label>
                                        <select
                                            :id="'winner-' + allocation.constraintIndex"
                                            v-model="ratings[`constraint${allocation.constraintIndex}`].winnerId"
                                            class="form-select form-select-sm"
                                            required
                                            :disabled="isSubmitting"
                                        >
                                            <option value="">Choose winner...</option>
                                            <option
                                                v-for="participantId in availableParticipants"
                                                :key="participantId"
                                                :value="participantId"
                                            >
                                                {{ nameCache[participantId] || participantId }}
                                            </option>
                                        </select>
                                        <p v-if="allocation.points" class="text-muted small mt-2 mb-0">
                                            <i class="fas fa-trophy me-1"></i>Winner gets {{ allocation.points }} XP 
                                            ({{ formatRoleName(allocation.role) }})
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" class="btn btn-primary mt-3 w-100" :disabled="isSubmitting || !isValid">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status"></span>
                            {{ submitButtonText }}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import CustomStarRating from '../components/CustomStarRating.vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const props = defineProps({ eventId: { type: String, required: true }, teamId: { type: String, required: false } });
const store = useStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMessage = ref('');
const isSubmitting = ref(false);
const eventName = ref('');
const event = ref(null);
const isTeamEvent = ref(null);
const teamIdToRate = ref(null);
const teamMembersToDisplay = ref([]);
const didLoadExistingRating = ref(false);
const nameCache = reactive({});

const ratings = reactive({});

// Computed: Get current user (memoized)
const currentUser = computed(() => store.getters['user/getUser']);

// Computed: Sorted XP Allocation (ensures it exists and is an array)
const sortedXpAllocation = computed(() => {
    if (!event.value?.xpAllocation || !Array.isArray(event.value.xpAllocation)) return [];
    // Filter out any potentially invalid entries just in case
    const validAllocations = event.value.xpAllocation.filter(
        alloc => typeof alloc.constraintIndex === 'number' && 
                 alloc.constraintLabel?.trim() &&
                 typeof alloc.points === 'number' && alloc.points >= 0 &&
                 typeof alloc.role === 'string'
    );
    // Create a copy before sorting
    return [...validAllocations].sort((a, b) => a.constraintIndex - b.constraintIndex);
});

// Computed: Check if form is valid for submission
const isValid = computed(() => {
    if (!sortedXpAllocation.value || sortedXpAllocation.value.length === 0) return false;
    
    return sortedXpAllocation.value.every(allocation => {
        const ratingKey = `constraint${allocation.constraintIndex}`;
        const ratingEntry = ratings[ratingKey]; // Access reactive ratings directly

        if (!ratingEntry) return false; // Entry must exist

        if (isTeamEvent.value) {
            // Team event: score must be a number > 0
            return typeof ratingEntry.score === 'number' && ratingEntry.score > 0;
        } else {
            // Individual event: winnerId must be a non-empty string
            return ratingEntry.winnerId && typeof ratingEntry.winnerId === 'string';
        }
    });
});

// Computed: Available participants for individual winner selection
const availableParticipants = computed(() => {
    if (isTeamEvent.value || !event.value?.participants) return [];
    // Exclude the current user from the list of potential winners
    return event.value.participants.filter(pId => pId !== currentUser.value?.uid);
});

// Computed: Check if event has defined criteria suitable for rating/selection
const hasValidRatingCriteria = computed(() => {
    // Use the already filtered and sorted computed property
    return sortedXpAllocation.value.length > 0;
});

// Computed: Text for the submit button
const submitButtonText = computed(() => {
    const action = didLoadExistingRating.value ? 'Update' : 'Submit';
    const target = isTeamEvent.value ? 'Team Ratings' : 'Winners';
    return isSubmitting.value ? 'Submitting...' : `${action} ${target}`;
});

// Helper: Format role names (unchanged)
const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    return roleKey
        .replace(/([A-Z])/g, ' $1') // Add space before caps
        .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
};

// Watcher: Initialize/reset ratings object when allocation or event type changes
watch([sortedXpAllocation, isTeamEvent], ([allocations, teamEventStatus]) => {
    // Clear existing keys first to handle allocation removal
    Object.keys(ratings).forEach(key => delete ratings[key]);
    
    if (Array.isArray(allocations)) {
        allocations.forEach(allocation => {
            const key = `constraint${allocation.constraintIndex}`;
            // Initialize based on type, but don't overwrite if pre-populating later
            if (!ratings[key]) { // Avoid overwriting pre-populated data
                if (teamEventStatus) {
                    ratings[key] = { score: 0 };
                } else {
                    ratings[key] = { winnerId: '' };
                }
            } 
        });
    }
}, { immediate: true, deep: true });

// Helper: Fetch user name and cache it
async function fetchAndCacheUserName(userId) {
    if (!userId || nameCache[userId]) return;
    nameCache[userId] = 'Loading...'; // Placeholder
    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);
        nameCache[userId] = docSnap.exists() ? (docSnap.data().name || userId) : `(${userId} not found)`;
    } catch (error) { 
        console.error(`Error fetching name for ${userId}:`, error); 
        nameCache[userId] = `(Error: ${userId})`;
    }
}

// Watcher: Fetch names for available participants when the list changes
watch(availableParticipants, (participants) => {
    if (Array.isArray(participants)) {
        participants.forEach(fetchAndCacheUserName);
    }
}, { immediate: true });

// Lifecycle Hook: Fetch event details on mount
onMounted(async () => {
    loading.value = true;
    errorMessage.value = '';
    // Prioritize prop, fallback to query param for team ID
    teamIdToRate.value = props.teamId || route.query.teamId || null;

    try {
        const eventDetails = await store.dispatch('events/fetchEventDetails', props.eventId);
        if (!eventDetails) throw new Error('Event not found or not accessible.');
        
        // Assign to ref *before* checks that depend on it
        event.value = eventDetails;
        eventName.value = eventDetails.eventName;
        isTeamEvent.value = !!eventDetails.isTeamEvent;
        
        // Pre-populate form if user has already rated/selected winners
        if (currentUser.value) {
            const userId = currentUser.value.uid;
            if (isTeamEvent.value && teamIdToRate.value) {
                const team = eventDetails.teams?.find(t => t.teamName === teamIdToRate.value);
                if (team) {
                    teamMembersToDisplay.value = team.members || []; // Store members
                    teamMembersToDisplay.value.forEach(fetchAndCacheUserName); // Fetch names
                    const existingRating = team.ratings?.find(r => r.ratedBy === userId);
                    if (existingRating?.scores) {
                        didLoadExistingRating.value = true; // Set flag
                        console.log("Found existing team ratings:", existingRating.scores);
                        // Pre-populate team scores
                        for (const key in existingRating.scores) {
                            if (ratings[key] !== undefined) { // Check if key exists from allocation
                                // Try reassigning the object to potentially improve reactivity
                                ratings[key] = { 
                                    ...ratings[key], // Keep other potential properties if they exist
                                    score: Number(existingRating.scores[key] || 0)
                                }; 
                            }
                        }
                    }
                }
            } else if (!isTeamEvent.value) {
                const existingSelectionRecord = eventDetails.ratings?.find(r => r.ratedBy === userId && r.type === 'winner_selection');
                if (existingSelectionRecord && eventDetails.winnersPerRole) {
                    didLoadExistingRating.value = true; // Set flag
                    console.log("Found existing winner selections, pre-populating...");
                    // Pre-populate individual winner selections based on winnersPerRole
                    sortedXpAllocation.value.forEach(alloc => {
                        const role = alloc.role || 'general';
                        const winnerId = eventDetails.winnersPerRole[role]?.[0]; // Assuming single winner per role
                        const key = `constraint${alloc.constraintIndex}`;
                        if (winnerId && ratings[key] !== undefined) {
                            ratings[key].winnerId = winnerId;
                        }
                    });
                }
            }
        }
        
        // Validity check now uses computed property based on sortedXpAllocation
        if (!hasValidRatingCriteria.value) {
            // Error message is handled by the v-else-if in the template
            console.warn("Event lacks valid rating criteria.");
        }
        
        // If it's an individual event, pre-fetch names
        if (!isTeamEvent.value && event.value.participants) {
            availableParticipants.value.forEach(fetchAndCacheUserName); 
        }

    } catch (error) {
        console.error("Error loading rating form:", error);
        errorMessage.value = error.message || 'Failed to load rating details. Please try again.';
        event.value = null; // Ensure event is null on error
    } finally {
        loading.value = false;
    }
});

// Method: Submit the rating or winner selections
const submitRating = async () => {
    if (!isValid.value) {
        errorMessage.value = 'Please complete all ratings/selections before submitting.';
        return;
    }

    isSubmitting.value = true;
    errorMessage.value = '';
    
    let payload = {
        ratingType: isTeamEvent.value ? 'team' : 'individual',
        selections: { ...ratings } // Send a copy
    };
    
    if (isTeamEvent.value) {
        if (!teamIdToRate.value) {
            errorMessage.value = 'Team ID is missing. Cannot submit rating.';
            isSubmitting.value = false;
            return;
        }
        payload.teamId = teamIdToRate.value;
    } else {
        // Individual event winner selection payload doesn't need a specific participantId
    }

    console.log("Submitting payload:", payload);

    try {
        await store.dispatch('events/submitRating', {
            eventId: props.eventId,
            ...payload // Spread the payload containing type, selections, and team/participant ID
        });
        // Go back to event details on success
        router.push({ name: 'EventDetails', params: { id: props.eventId } });
        // Optionally show a global success message via store or another mechanism
    } catch (error) {
        console.error("Rating/Selection submission error:", error);
        errorMessage.value = `Submission failed: ${error.message || 'Unknown error'}`;
    } finally {
        isSubmitting.value = false;
    }
};

// Method: Go back
const goBack = () => {
    router.back();
};

</script>

<style scoped>
.rating-wrapper {
    display: flex;
    justify-content: center; /* Center stars */
    align-items: center;
    min-height: 40px; /* Ensure space even if stars don't load */
}

.constraint-section {
    margin-bottom: 1rem; /* Add space between sections */
}
</style>
