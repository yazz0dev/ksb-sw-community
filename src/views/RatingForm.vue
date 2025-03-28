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
            This event has no valid rating criteria defined. Please contact the event organizer.
        </div>
        <div v-else>
            <div class="card shadow-sm">
                <div class="card-body">
                    <form @submit.prevent="submitRating">
                        <!-- Team Event Rating -->
                        <div v-if="isTeamEvent">
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
                        </div>
                        
                        <!-- Individual Event Winner Selection -->
                        <div v-else>
                            <h5 class="mb-3">Select Winners</h5>
                            <div v-for="(constraint, index) in ratingConstraints" :key="index" class="mb-4">
                                <div class="constraint-section p-3 border rounded">
                                    <h6 class="mb-3">{{ constraint }}</h6>
                                    <div class="form-group">
                                        <label :for="'winner'+index">Select Winner for {{ constraint }}</label>
                                        <select 
                                            :id="'winner'+index"
                                            v-model="ratings[`constraint${index}`]"
                                            class="form-select"
                                            required
                                            :disabled="isSubmitting"
                                        >
                                            <option value="">Choose winner...</option>
                                            <option 
                                                v-for="participant in availableParticipants" 
                                                :key="participant"
                                                :value="participant"
                                            >
                                                {{ getUserName(participant) }}
                                            </option>
                                        </select>
                                        <p v-if="getXpForConstraint(index)" class="text-muted small mt-2">
                                            <i class="fas fa-trophy me-1"></i>Winner gets {{ getXpForConstraint(index) }} XP 
                                            ({{ getRoleForConstraint(index) }})
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" class="btn btn-primary mt-3" :disabled="isSubmitting || !isValid">
                            <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status"></span>
                            {{ isSubmitting ? 'Submitting...' : (isTeamEvent ? 'Submit Rating' : 'Submit Winners') }}
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
const ratingConstraints = computed(() => {
    if (!event.value) return [];
    
    // Always use xpAllocation as the source of truth
    if (Array.isArray(event.value.xpAllocation) && event.value.xpAllocation.length > 0) {
        return event.value.xpAllocation
            .sort((a, b) => (a.constraintIndex || 0) - (b.constraintIndex || 0))
            .map(allocation => allocation.constraintLabel)
            .filter(label => !!label);
    }
    return [];
});

const isValid = computed(() => {
    if (!event.value?.ratingConstraints || event.value.ratingConstraints.length === 0) return false;
    return event.value.ratingConstraints.every((_, index) => {
        if (isTeamEvent.value) {
            return typeof ratings.value[`constraint${index}`] === 'number' && 
                   ratings.value[`constraint${index}`] > 0;
        } else {
            return ratings.value[`constraint${index}`] && 
                   typeof ratings.value[`constraint${index}`] === 'string';
        }
    });
});

// Add computed for available participants
const availableParticipants = computed(() => {
    if (!event.value?.participants) return [];
    return event.value.participants.filter(p => p !== currentUser.value?.uid);
});

const hasValidRatingCriteria = computed(() => {
    if (!event.value) return false;

    return Array.isArray(event.value.xpAllocation) && 
        event.value.xpAllocation.some(allocation => 
            allocation?.constraintLabel?.trim() && 
            typeof allocation.points === 'number' && 
            allocation.points > 0
        );
});

// Helper Methods
const getXpForConstraint = (index) => {
    if (!event.value?.xpAllocation || !Array.isArray(event.value.xpAllocation)) return null;
    // Find allocation by constraintIndex
    const allocation = event.value.xpAllocation.find(a => a.constraintIndex === index);
    return allocation?.points || null;
};

const getRoleForConstraint = (index) => {
    if (!event.value?.xpAllocation || !Array.isArray(event.value.xpAllocation)) return '';
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
        
        if (eventDetails.status !== 'Completed' || !eventDetails.ratingsOpen) {
            throw new Error('Ratings are currently closed for this event.');
        }

        if (!hasValidRatingCriteria.value) {
            throw new Error('This event has no valid rating criteria defined.');
        }
        
        event.value = eventDetails;
    } catch (error) {
        console.error("Error loading rating form:", error);
        errorMessage.value = error.message || 'Failed to load rating details. Please try again.';
        event.value = null;
    } finally {
        loading.value = false;
    }
});

// Submit Rating Logic
const submitRating = async () => {
    if (!isValid.value || isSubmitting.value) return;
    isSubmitting.value = true;

    try {
        let ratingData;
        const xpAllocation = event.value.xpAllocation || [];
        
        if (isTeamEvent.value) {
            // Transform team ratings using xpAllocation
            const ratingsByLabel = {};
            xpAllocation.forEach((allocation, index) => {
                if (allocation.constraintLabel) {
                    ratingsByLabel[allocation.constraintLabel] = ratings.value[`constraint${index}`];
                }
            });
            ratingData = {
                ratingType: 'team',
                targetId: route.query.teamId,
                rating: ratingsByLabel
            };
        } else {
            // Transform individual ratings using xpAllocation
            const selectionsByConstraint = {};
            xpAllocation.forEach((allocation, index) => {
                if (allocation.constraintLabel) {
                    selectionsByConstraint[allocation.constraintLabel] = ratings.value[`constraint${index}`];
                }
            });
            ratingData = {
                ratingType: 'individual',
                selections: selectionsByConstraint
            };
        }

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

// Add helper method for participant names
const getUserName = (userId) => {
    return participantName.value || userId;
};

const goBack = () => router.back();

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

.constraint-section {
    background-color: var(--bs-gray-100);
}
</style>