<template>
    <div class="p-4 sm:p-6 space-y-4">
        <transition-group name="fade-fast" tag="div" class="space-y-4">
            <div v-for="team in teamsWithDetails" 
                 :key="team.teamName" 
                 class="bg-surface border border-border rounded-lg shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
                <div class="p-4 sm:p-5">
                    <div class="flex justify-between items-start mb-3">
                        <h4 class="text-lg font-semibold text-primary">{{ team.teamName }}</h4>
                        <button v-if="ratingsOpen && canRate" @click="goToRatingForm(team.teamName)"
                            class="ml-2 flex-shrink-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
                            :class="currentUserHasRatedTeam ?
                                       'text-text-primary bg-surface border border-border hover:bg-neutral-light focus:ring-primary-light' :
                                       'text-white bg-primary hover:bg-primary-dark focus:ring-primary'">
                            <i class="fas fa-star mr-1.5"></i>
                            {{ currentUserHasRatedTeam ? 'View/Edit Ratings' : 'Rate Team' }}
                        </button>
                    </div>
                    <button @click="toggleTeamDetails(team.teamName)"
                        class="inline-flex items-center px-3 py-1.5 border border-border shadow-sm text-xs font-medium rounded-md text-text-secondary bg-surface hover:bg-neutral-light focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-light transition-colors">
                        <i :class="['fas w-3 transition-transform duration-200', team.showDetails ? 'fa-chevron-up' : 'fa-chevron-down', 'mr-1.5']"></i>
                        {{ team.showDetails ? 'Hide Members' : `Show Members (${team.members?.length || 0})` }}
                    </button>
                    <transition name="fade-fast">
                        <div v-show="team.showDetails" class="mt-4 pt-4 border-t border-border">
                            <div v-if="organizerNamesLoading" class="py-3 text-sm text-text-secondary italic">
                                <i class="fas fa-spinner fa-spin mr-1"></i> Loading members...
                            </div>
                            <div v-else-if="team.members && team.members.length > 0">
                                <h5 class="text-xs font-semibold text-text-secondary uppercase mb-2">Team Members</h5>
                                <ul role="list" class="space-y-2">
                                    <li v-for="memberId in team.members" :key="memberId"
                                        class="flex items-center p-2 rounded-md transition-colors duration-150"
                                        :class="{ 'bg-primary-extraLight font-medium': memberId === currentUserUid }">
                                        <i class="fas fa-user mr-2 text-text-secondary flex-shrink-0 w-4 text-center"></i>
                                        <router-link
                                            :to="{ name: 'PublicProfile', params: { userId: memberId } }"
                                            class="text-sm text-text-primary hover:text-primary truncate"
                                            :class="{'text-primary font-semibold': memberId === currentUserUid}">
                                            {{ getUserName(memberId) || memberId }} {{ memberId === currentUserUid ? '(You)' : '' }}
                                        </router-link>
                                    </li>
                                </ul>
                            </div>
                            <div v-else class="py-3 text-sm text-text-secondary italic">
                                No members assigned to this team yet.
                            </div>
                        </div>
                    </transition>
                </div>
            </div>
        </transition-group>
        <div v-if="teamsWithDetails.length === 0" class="bg-info-light text-info-dark px-4 py-3 rounded-md text-sm mt-4 border border-info-light italic">
             <i class="fas fa-info-circle mr-1"></i> No teams have been created for this event yet.
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const props = defineProps({
    teams: { 
        type: Array, 
        required: true, 
        default: () => [] 
    },
    eventId: { 
        type: String, 
        required: true 
    },
    ratingsOpen: { 
        type: Boolean, 
        default: false 
    },
    getUserName: { 
        type: Function, 
        required: true 
    },
    organizerNamesLoading: { 
        type: Boolean, 
        default: false 
    },
    currentUserUid: { 
        type: String, 
        default: null 
    },
    currentUserHasRatedTeam: { 
        type: Boolean, 
        default: false 
    }
});

const store = useStore();
const router = useRouter();
const canRate = computed(() => store.getters['user/isAuthenticated']);

const teamsWithDetails = ref([]);
const searchQueries = ref({});
const dropdownVisible = ref({});

let unwatchTeams = null;

onMounted(() => {
    updateLocalTeams(props.teams);
    unwatchTeams = watch(() => props.teams, (newTeams) => {
        updateLocalTeams(newTeams);
    }, { deep: true });
});

onBeforeUnmount(() => {
    if (unwatchTeams) {
        unwatchTeams();
    }
});

function updateLocalTeams(teamsFromProps) {
    if (!Array.isArray(teamsFromProps)) return;
    
    teamsWithDetails.value = teamsFromProps.map(team => ({
        ...team,
        showDetails: false,
        members: Array.isArray(team.members) ? [...team.members] : [],
        ratings: Array.isArray(team.ratings) ? [...team.ratings] : [],
        submissions: Array.isArray(team.submissions) ? [...team.submissions] : []
    }));
}

const toggleTeamDetails = (teamName) => {
    const teamIndex = teamsWithDetails.value.findIndex(t => t.teamName === teamName);
    if (teamIndex !== -1) {
        teamsWithDetails.value[teamIndex].showDetails = !teamsWithDetails.value[teamIndex].showDetails;
    } else {
        console.warn(`Could not find team ${teamName} to toggle details.`);
    }
};

const goToRatingForm = (teamId) => {
    router.push({ name: 'RatingForm', params: { eventId: props.eventId, teamId: teamId } });
};

defineEmits(['update:teams', 'canAddTeam']);

</script>

<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
    transition: all 0.2s ease-out;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.fade-fast-move {
    transition: transform 0.3s ease-out;
}
</style>
