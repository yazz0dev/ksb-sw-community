// src/views/RatingForm.vue
<template>
    <div class="container mt-4">
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
        <div v-else>
            <div class="card shadow-sm">
                <div class="card-body">
                    <form @submit.prevent="submitRating">
                        <!-- Dynamic Rating Criteria -->
                        <div v-for="(constraint, index) in ratingConstraints" :key="index" class="mb-4">
                            <h5 class="mb-3">{{ constraint }}</h5>
                            <div class="rating-wrapper">
                                <CustomStarRating
                                    v-model="ratings[`constraint${index}`]"
                                    :disabled="isSubmitting"
                                    :show-rating="true"
                                />
                            </div>
                            <p v-if="getXpForConstraint(index)" class="text-muted small mt-1">
                                <i class="fas fa-trophy me-1"></i>Worth up to {{ getXpForConstraint(index) }} XP 
                                ({{ getRoleForConstraint(index) }})
                            </p>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" class="btn btn-primary" :disabled="isSubmitting || !isValid">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status"></span>
                            {{ isSubmitting ? 'Submitting...' : 'Submit Rating' }}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import CustomStarRating from '../components/CustomStarRating.vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Props and setup vars remain the same
const props = defineProps({ eventId: { type: String, required: true }, teamId: { type: String, required: false } });
const store = useStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMessage = ref('');
const isSubmitting = ref(false);
const eventName = ref('');
const isTeamEvent = ref(null);
const participantToRate = ref(null);
const participantName = ref(null);

const ratings = ref({});
const event = ref(null);

// Computed
const ratingConstraints = computed(() => event.value?.ratingConstraints || []);

const isValid = computed(() => {
    if (!event.value?.ratingConstraints) return false;
    return event.value.ratingConstraints.every((_, index) => 
        typeof ratings.value[`constraint${index}`] === 'number' && 
        ratings.value[`constraint${index}`] > 0
    );
});

// Helper Methods
const getXpForConstraint = (index) => {
    if (!event.value?.xpAllocation) return null;
    const allocation = event.value.xpAllocation.find(a => a.constraintIndex === index);
    return allocation?.points || null;
};

const getRoleForConstraint = (index) => {
    if (!event.value?.xpAllocation) return '';
    const allocation = event.value.xpAllocation.find(a => a.constraintIndex === index);
    return formatRoleName(allocation?.role || '');
};

const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    return roleKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
};

// Initialize ratings object when event loads
watch(() => event.value?.ratingConstraints, (constraints) => {
    if (Array.isArray(constraints)) {
        ratings.value = {};
        constraints.forEach((_, index) => {
            ratings.value[`constraint${index}`] = 0;
        });
    }
}, { immediate: true });

// Fetch User Name (remains the same)
async function fetchUserName(userId) { if (!userId) return null; try { const userDocRef = doc(db, 'users', userId); const docSnap = await getDoc(userDocRef); return docSnap.exists() ? (docSnap.data().name || userId) : userId; } catch (error) { console.error(`Error fetching name for ${userId}:`, error); return userId; } }

// onMounted (ensure rating reset uses 0)
onMounted(async () => {
    loading.value = true;
    errorMessage.value = '';
    participantToRate.value = null;
    participantName.value = null;
    isTeamEvent.value = null;
    ratings.value = {};

    try {
        const eventDetails = await store.dispatch('events/fetchEventDetails', props.eventId);
        if (!eventDetails) throw new Error('Event not found or not accessible.');
        eventName.value = eventDetails.eventName;
        isTeamEvent.value = !!eventDetails.isTeamEvent;
        const defaultConstraints = ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'];
        ratingConstraints.value = (Array.isArray(eventDetails.ratingConstraints) && eventDetails.ratingConstraints.length === 5) ? eventDetails.ratingConstraints : defaultConstraints;
        if (eventDetails.status !== 'Completed' || !eventDetails.ratingsOpen) throw new Error('Ratings are currently closed for this event.');
        if (isTeamEvent.value) {
            if (!props.teamId) throw new Error("Team ID is required for rating this team event.");
        } else {
            const participantQuery = route.query.participant;
            if (!participantQuery || typeof participantQuery !== 'string') throw new Error("Participant ID missing in URL query for individual rating.");
            participantToRate.value = participantQuery;
            participantName.value = await fetchUserName(participantToRate.value);
        }
        event.value = eventDetails;
    } catch (error) {
        console.error("Error loading rating form:", error);
        errorMessage.value = error.message || 'Failed to load rating details. Please try again.';
    } finally {
        loading.value = false;
    }
});

// Submit Rating Logic
const submitRating = async () => {
    if (!isValid.value || isSubmitting.value) return;
    isSubmitting.value = true;

    try {
        // Transform ratings to use constraint labels as keys
        const ratingsByLabel = {};
        event.value.ratingConstraints.forEach((constraint, index) => {
            ratingsByLabel[constraint] = ratings.value[`constraint${index}`];
        });

        // Prepare rating data
        const ratingData = {
            ratingType: route.query.teamId ? 'team' : 'individual',
            targetId: route.query.teamId || route.query.participant,
            rating: ratingsByLabel,
            submittedAt: new Date()
        };

        await store.dispatch('user/submitRating', {
            eventId: props.eventId,
            ratingData
        });

        alert('Rating submitted successfully!');
        router.back();
    } catch (error) {
        console.error('Rating submission error:', error);
        alert(error.message || 'Failed to submit rating.');
    } finally {
        isSubmitting.value = false;
    }
};

const goBack = () => { router.back(); };

</script>

<style scoped>
/* Keep the wrapper style for centering */
.rating-stars-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-2) 0;
    width: 100%;
}
</style>