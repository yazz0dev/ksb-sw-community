// src/views/RatingForm.vue
<template>
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Tailwind Container -->
        <button @click="goBack" class="inline-flex items-center rounded border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary shadow-sm hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mb-4">
            <i class="fas fa-arrow-left mr-2 h-3 w-3"></i>Back
        </button>
        
        <h2 v-if="!loading && eventName" class="text-center text-xl font-semibold text-text-primary mb-2">
            {{ isTeamEvent ? 'Rate Teams & Select Best Performer' : 'Select Winners' }}
        </h2>
        <p v-if="!loading && eventName" class="text-center text-text-disabled mb-6 text-sm">Event: {{ eventName }}</p>

        <div v-if="loading" class="flex justify-center items-center my-10">
            <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
        <div v-else-if="errorMessage" 
             class="rounded-md bg-error-light p-4 text-sm text-error-dark border border-error-light" 
             role="alert">{{ errorMessage }}
        </div>
        <div v-else-if="!event" class="rounded-md bg-warning-light p-4 text-sm text-warning-dark border border-warning-light">
            Event not found or ratings are not open.
        </div>
        <div v-else-if="!hasValidRatingCriteria" class="rounded-md bg-warning-light p-4 text-sm text-warning-dark border border-warning-light">
            This event has no valid rating criteria defined. Please contact an event organizer.
        </div>
        
        <!-- Main Form Content -->
        <div v-else>
            <div class="bg-surface shadow sm:rounded-lg overflow-hidden">
                <div class="px-4 py-5 sm:p-6">
                    <form @submit.prevent="submitRating" class="space-y-6">
                        
                        <!-- Corrected Conditional Rendering Structure using  === -->

                        <template v-if="isTeamEvent">
                            <!-- Team Event Rating Section -->
                            <div> 
                                <h3 class="text-base font-semibold leading-6 text-text-primary mb-4">Select Best Team per Criterion:</h3>
                                <div class="space-y-4 mb-6">
                                    <div v-for="allocation in sortedXpAllocation" :key="`team-crit-${allocation.constraintIndex}`">
                                        <label :for="`team-criterion-${allocation.constraintIndex}`" class="block text-sm font-medium text-text-secondary mb-1">
                                            {{ allocation.constraintLabel }} ({{ allocation.points }} XP)
                                        </label>
                                        <select
                                            :id="`team-criterion-${allocation.constraintIndex}`"
                                            v-model="ratings[`constraint${allocation.constraintIndex}`].teamName"
                                            required
                                            class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                                            :disabled="isSubmitting"
                                        >
                                            <option disabled value="">Select Team...</option>
                                            <option v-for="team in eventTeams" :key="team.teamName" :value="team.teamName">
                                                {{ team.teamName }}
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <h3 class="text-base font-semibold leading-6 text-text-primary mb-3 border-t border-border pt-4">Select Overall Best Performer:</h3>
                                <div v-if="!allTeamMembers || allTeamMembers.length === 0" class="text-sm text-text-secondary italic">
                                    No participants found in teams.
                                </div>
                                <div v-else>
                                    <label for="bestPerformer" class="block text-xs font-medium leading-6 text-text-secondary mb-1">Select the standout individual participant</label>
                                    <select
                                        id="bestPerformer"
                                        v-model="ratings.bestPerformer"
                                        required
                                        class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                                        :disabled="isSubmitting"
                                    >
                                        <option disabled value="">Select Participant...</option>
                                        <option v-for="member in allTeamMembers" :key="member.uid" :value="member.uid">
                                            {{ nameCache[member.uid] || member.uid }} ({{ getTeamNameForMember(member.uid) }})
                                        </option>
                                    </select>
                                    <p class="text-xs text-text-disabled mt-2 flex items-center">
                                        <i class="fas fa-award mr-1 text-accent"></i>Best Performer gets a bonus 10 XP (General)
                                    </p>
                                </div>
                            </div>
                        </template>
                        
                        <template v-else> 
                            <!-- Individual Event Winner Selection Section -->
                            <div> 
                                <h3 class="text-base font-semibold leading-6 text-text-primary mb-4">Select Winners for Each Criterion:</h3>
                                <div class="space-y-4">
                                    <div v-for="allocation in sortedXpAllocation" :key="`ind-crit-${allocation.constraintIndex}`" 
                                        class="p-4 border border-border rounded-md bg-surface-variant">
                                        <h4 class="text-sm font-medium text-text-primary mb-3">{{ allocation.constraintLabel }}</h4>
                                        <div>
                                            <label :for="'winner-' + allocation.constraintIndex" class="block text-xs font-medium leading-6 text-text-secondary mb-1">Select Winner for {{ allocation.constraintLabel }}</label>
                                            <select
                                                :id="'winner-' + allocation.constraintIndex"
                                                v-model="ratings[`constraint${allocation.constraintIndex}`].winnerId"
                                                class="block w-full rounded-md border-border py-1.5 text-text-primary shadow-sm ring-1 ring-inset ring-border focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 disabled:opacity-50 disabled:bg-surface-disabled"
                                                required
                                                :disabled="isSubmitting"
                                            >
                                                <option value="">Choose winner...</option>
                                                <option
                                                    v-for="participantId in availableParticipants"
                                                    :key="`ind-part-${participantId}`"
                                                    :value="participantId"
                                                >
                                                    {{ nameCache[participantId] || participantId }}
                                                </option>
                                            </select>
                                            <p v-if="allocation.points" class="text-xs text-text-disabled mt-2 flex items-center">
                                                <i class="fas fa-trophy mr-1 text-warning"></i>Winner gets {{ allocation.points }} XP
                                                <span class="ml-1 text-text-disabled">({{ formatRoleName(allocation.role) }})</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <!-- Submit Button -->
                        <button type="submit" 
                                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                :disabled="isSubmitting || !isValid">
                            <span v-if="isSubmitting" class="flex items-center">
                                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </span>
                            <span v-else>{{ submitButtonText }}</span>
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const props = defineProps({ eventId: { type: String, required: true }, teamId: { type: String, required: false } }); // teamId might not be needed anymore
const store = useStore();
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const errorMessage = ref('');
const isSubmitting = ref(false);
const eventName = ref('');
const event = ref(null);
const isTeamEvent = ref(null);
const teamIdToRate = ref(null); // Keep for potential display purposes
const teamMembersToDisplay = ref([]); // Keep for potential display purposes
const eventTeams = ref([]); // Store teams for dropdown
const allTeamMembers = ref([]); // Store all members for best performer dropdown
const teamMemberMap = ref({}); // Map userId -> teamName
const didLoadExistingRating = ref(false);
const nameCache = reactive({});

// Unified ratings object - structure adapts based on event type
const ratings = reactive({}); 

// Computed: Get current user (memoized)
const currentUser = computed(() => store.getters['user/getUser']);

// Computed: Sorted XP Allocation (ensures it exists and is an array)
const sortedXpAllocation = computed(() => {
    if (!event.value?.xpAllocation || !Array.isArray(event.value.xpAllocation)) return [];
    const validAllocations = event.value.xpAllocation.filter(
        alloc => typeof alloc.constraintIndex === 'number' && 
                 alloc.constraintLabel?.trim() &&
                 typeof alloc.points === 'number' && alloc.points >= 0 &&
                 typeof alloc.role === 'string'
    );
    return [...validAllocations].sort((a, b) => a.constraintIndex - b.constraintIndex);
});

// Computed: Check if form is valid for submission
const isValid = computed(() => {
    if (!sortedXpAllocation.value || sortedXpAllocation.value.length === 0) return false;

    // Check criteria selections
    const allCriteriaSelected = sortedXpAllocation.value.every(allocation => {
        const ratingKey = `constraint${allocation.constraintIndex}`;
        const ratingEntry = ratings[ratingKey];
        if (!ratingEntry) return false;
        // For team events, check teamName; for individual, check winnerId
        return isTeamEvent.value
            ? (ratingEntry.teamName && ratingEntry.teamName !== '') 
            : (ratingEntry.winnerId && ratingEntry.winnerId !== ''); 
    });

    // Check best performer selection only for team events
    const bestPerformerSelected = isTeamEvent.value
        ? (ratings.bestPerformer && ratings.bestPerformer !== '')
        : true; // Not applicable for individual events

    return allCriteriaSelected && bestPerformerSelected;
});


// Computed: Available participants for individual winner selection
const availableParticipants = computed(() => {
    if (isTeamEvent.value || !event.value?.participants) return [];
    // Exclude the current user from the list of potential winners
    return event.value.participants.filter(pId => pId !== currentUser.value?.uid);
});

// Computed: Check if event has defined criteria suitable for rating/selection
const hasValidRatingCriteria = computed(() => {
    return sortedXpAllocation.value.length > 0;
});

// Computed: Text for the submit button
const submitButtonText = computed(() => {
    const action = didLoadExistingRating.value ? 'Update' : 'Submit';
    const target = isTeamEvent.value ? 'Team Selections' : 'Winners'; // Adjusted text
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
    // Clear existing keys first to handle allocation removal/type change
    Object.keys(ratings).forEach(key => {
        // Preserve bestPerformer if switching between team event views (unlikely but safe)
        if (key !== 'bestPerformer' || !teamEventStatus) {
            delete ratings[key];
        }
    });

    if (Array.isArray(allocations)) {
        allocations.forEach(allocation => {
            const allocationKey = `constraint${allocation.constraintIndex}`; // Use a different variable name
            // Always initialize the constraint key object if it doesn't exist
            if (!ratings[allocationKey]) {
                 ratings[allocationKey] = {};
            }
            // Set default based on event type, preserving existing value if pre-populated
            if (teamEventStatus) {
                // Ensure teamName exists, default to empty string if not
                if (ratings[allocationKey].teamName === undefined) ratings[allocationKey].teamName = '';
            } else {
                 // Ensure winnerId exists, default to empty string if not
                if (ratings[allocationKey].winnerId === undefined) ratings[allocationKey].winnerId = '';
            }
        });
        // Initialize bestPerformer only for team events
        if (teamEventStatus && ratings.bestPerformer === undefined) {
             ratings.bestPerformer = '';
        }
        // Clean up bestPerformer if switching TO individual
        if (!teamEventStatus && ratings.bestPerformer !== undefined) {
             delete ratings.bestPerformer;
        }
    }
}, { immediate: true, deep: true }); // Deep watch needed here

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

// Helper to get team name for a member
const getTeamNameForMember = (memberId) => {
    return teamMemberMap.value[memberId] || 'Unknown Team';
};

// Watcher: Fetch names for available participants (individual events)
watch(availableParticipants, (participants) => {
    if (!isTeamEvent.value && Array.isArray(participants)) {
        participants.forEach(fetchAndCacheUserName);
    }
}, { immediate: true });

// Watcher: Fetch names for all team members (team events)
watch(allTeamMembers, (members) => {
     if (isTeamEvent.value && Array.isArray(members)) {
         members.forEach(member => fetchAndCacheUserName(member.uid));
     }
}, { immediate: true });

// Lifecycle Hook: Fetch event details on mount
onMounted(async () => {
    await initializeForm();
});

// Method: Submit the rating or winner selections
const submitRating = async () => {
    if (!isValid.value) {
        errorMessage.value = 'Please complete all selections before submitting.';
        return;
    }
    isSubmitting.value = true;
    errorMessage.value = '';

    try {
        if (isTeamEvent.value) {
            // Prepare payload for the new team criteria rating action
            const teamRatingPayload = {
                eventId: props.eventId,
                selections: {
                    criteria: {},
                    bestPerformer: ratings.bestPerformer
                }
            };
            // Extract team selections for criteria
            Object.keys(ratings).forEach(key => {
                if (key.startsWith('constraint')) {
                    const index = key.replace('constraint', '');
                    teamRatingPayload.selections.criteria[index] = ratings[key].teamName;
                }
            });
            console.log("Submitting Team Criteria Payload:", teamRatingPayload);
            await store.dispatch('events/submitTeamCriteriaRating', teamRatingPayload);

        } else {
            // Prepare payload for the existing individual winner selection action
            const individualRatingPayload = {
                eventId: props.eventId,
                ratingType: 'individual', // Keep type for the existing action
                selections: {}
            };
             // Extract winner selections for criteria
             Object.keys(ratings).forEach(key => {
                 if (key.startsWith('constraint')) {
                     individualRatingPayload.selections[key] = { winnerId: ratings[key].winnerId };
                 }
             });
            console.log("Submitting Individual Winner Payload:", individualRatingPayload);
            await store.dispatch('events/submitRating', individualRatingPayload); // Use existing action
        }

        // Go back to event details on success
        router.push({ name: 'EventDetails', params: { id: props.eventId } });
        // Optionally show a global success message via store or another mechanism
        store.dispatch('notification/showNotification', { message: 'Ratings submitted successfully!', type: 'success' });

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

const initializeForm = async () => {
    const currentUser = store.getters['user/getUser'];
    if (currentUser?.role === 'Admin') {
        errorMessage.value = 'Administrators cannot submit ratings.';
        router.push({ name: 'Home' });
        return;
    }

    loading.value = true;
    errorMessage.value = '';
    
    try {
        const eventDetails = await store.dispatch('events/fetchEventDetails', props.eventId);
        if (!eventDetails) {
            throw new Error('Event not found or not accessible.');
        }

        event.value = eventDetails;
        eventName.value = eventDetails.eventName;
        isTeamEvent.value = !!eventDetails.isTeamEvent;

        if (!eventDetails.ratingsOpen) {
            throw new Error('Ratings are currently closed for this event.');
        }

        if (eventDetails.status !== 'Completed') {
            throw new Error('Ratings can only be submitted for completed events.');
        }

        // Initialize based on event type
        if (isTeamEvent.value) {
            await initializeTeamEventForm(eventDetails);
        } else {
            await initializeIndividualEventForm(eventDetails);
        }

    } catch (error) {
        console.error('Error initializing form:', error);
        errorMessage.value = error.message || 'Failed to load rating details.';
        event.value = null;
    } finally {
        loading.value = false;
    }
};

const initializeTeamEventForm = async (eventDetails) => {
    eventTeams.value = eventDetails.teams || [];
    const memberIds = new Set();
    const tempMemberMap = {};

    eventTeams.value.forEach(team => {
        (team.members || []).forEach(memberId => {
            memberIds.add(memberId);
            tempMemberMap[memberId] = team.teamName;
        });
    });

    teamMemberMap.value = tempMemberMap;

    if (memberIds.size > 0) {
        const userNames = await store.dispatch('user/fetchUserNamesBatch', Array.from(memberIds));
        allTeamMembers.value = Array.from(memberIds)
            .map(uid => ({ uid, name: userNames[uid] || uid }))
            .sort((a, b) => (userNames[a.uid] || a.uid).localeCompare(userNames[b.uid] || b.uid));
    }

    // Check for existing ratings
    const existingRating = eventDetails.teamCriteriaRatings?.find(
        r => r.ratedBy === store.getters['user/userId']
    );

    if (existingRating) {
        didLoadExistingRating.value = true;
        Object.entries(existingRating.criteriaSelections || {}).forEach(([index, teamName]) => {
            if (ratings[`constraint${index}`]) {
                ratings[`constraint${index}`].teamName = teamName;
            }
        });
        if (existingRating.bestPerformer) {
            ratings.bestPerformer = existingRating.bestPerformer;
        }
    }
};

const initializeIndividualEventForm = async (eventDetails) => {
    if (eventDetails.participants) {
        const participantNames = await store.dispatch('user/fetchUserNamesBatch', eventDetails.participants);
        Object.entries(participantNames).forEach(([uid, name]) => {
            nameCache[uid] = name;
        });
    }

    // Check for existing ratings or winner data
    const existingRating = eventDetails.ratings?.find(
        r => r.ratedBy === store.getters['user/userId'] && r.type === 'winner_selection'
    );
    const winnersData = eventDetails.winnersPerRole || {};

    if (existingRating || Object.keys(winnersData).length > 0) {
        didLoadExistingRating.value = true;
        sortedXpAllocation.value.forEach(alloc => {
            const role = alloc.role || 'general';
            const winnerId = winnersData[role]?.[0];
            const key = `constraint${alloc.constraintIndex}`;
            if (winnerId && ratings[key]) {
                ratings[key].winnerId = winnerId;
            }
        });
    }
};
</script>
