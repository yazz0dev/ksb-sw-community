// src/views/RatingForm.vue
<template>
    <div class="container mt-4">
        <button @click="goBack" class="btn btn-outline-secondary mb-3">
            <i class="fas fa-arrow-left me-2"></i>Back
        </button>
        
        <h2 v-if="!loading && eventName" class="text-center mb-3">
            Rate {{ isTeamEvent ? `Team: ${teamId}` : `Participant` }}
        </h2>
        <h4 v-if="!loading && !isTeamEvent && participantToRate" class="text-center text-muted mb-4">
            {{ participantName || participantToRate }}
        </h4>
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
            <div class="card shadow">
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
                                <div class="constraint-section p-3 border rounded bg-light">
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
                            {{ isSubmitting ? 'Submitting...' : (isTeamEvent ? 'Submit Team Ratings' : 'Submit Winners') }}
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
            if (teamEventStatus) {
                // Team event: initialize with score 0
                ratings[key] = { score: 0 };
            } else {
                // Individual event: initialize with empty winnerId
                ratings[key] = { winnerId: '' };
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
    teamIdToRate.value = route.query.teamId || null; // Get teamId from route if present

    try {
        const eventDetails = await store.dispatch('events/fetchEventDetails', props.eventId);
        if (!eventDetails) throw new Error('Event not found or not accessible.');
        
        // Assign to ref *before* checks that depend on it
        event.value = eventDetails;
        eventName.value = eventDetails.eventName;
        isTeamEvent.value = !!eventDetails.isTeamEvent;
        
        if (eventDetails.status !== 'Completed' || !eventDetails.ratingsOpen) {
            throw new Error('Ratings are currently closed for this event.');
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
    if (!isValid.value || isSubmitting.value) return;
    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        let ratingDataPayload;

        if (isTeamEvent.value) {
            if (!teamIdToRate.value) throw new Error("Team ID is missing for rating.");
            // Team: Prepare payload with scores
            ratingDataPayload = {
                ratingType: 'team',
                targetId: teamIdToRate.value, 
                rating: {}
            };
            sortedXpAllocation.value.forEach(alloc => {
                const key = `constraint${alloc.constraintIndex}`;
                // Ensure score is sent as a number
                ratingDataPayload.rating[key] = Number(ratings[key]?.score || 0);
            });
        } else {
            // Individual: Prepare payload with winner selections
            ratingDataPayload = {
                ratingType: 'individual',
                selections: {} // Submit winner IDs per constraint
            };
            sortedXpAllocation.value.forEach(alloc => {
                const key = `constraint${alloc.constraintIndex}`;
                ratingDataPayload.selections[key] = ratings[key]?.winnerId || null;
            });
        }

        console.log("Submitting payload:", ratingDataPayload);

        // Dispatch action to the user module (assuming it handles both types)
        await store.dispatch('user/submitRating', {
            eventId: props.eventId,
            ratingData: ratingDataPayload
        });

        alert(isTeamEvent.value ? 'Team ratings submitted successfully!' : 'Winner selections submitted successfully!');
        router.back(); // Go back to the previous page

    } catch (error) {
        console.error('Rating/Selection submission error:', error);
        errorMessage.value = error.message || 'Failed to submit. Please try again.';
        // Keep isSubmitting false if error occurs during dispatch to allow retry
        isSubmitting.value = false;
    }
};

// Method: Go back
const goBack = () => router.back();

</script>

<style scoped>
.rating-wrapper {
    display: flex;
    justify-content: center; /* Center stars */
    align-items: center;
    min-height: 40px; /* Ensure space even if stars don't load */
}

.constraint-section {
    background-color: var(--bs-light); /* Use Bootstrap variable */
    margin-bottom: 1rem; /* Add space between sections */
}

.form-label {
    margin-bottom: 0.5rem;
}

/* Improve button visibility */
button[type="submit"] {
    font-weight: bold;
}
</style>
