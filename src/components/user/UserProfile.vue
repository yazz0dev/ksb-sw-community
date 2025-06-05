<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex flex-column align-items-center justify-content-center py-5 text-secondary">
      <div class="spinner-border text-primary mb-3" role="status" style="width: 4rem; height: 4rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Loading profile data...</p>
    </div>

    <!-- Error/Not Found States -->
    <div v-else-if="errorMessage || !user" class="alert alert-warning d-flex align-items-center" role="alert">
        <i class="fas fa-exclamation-triangle me-3"></i>
        <div>{{ errorMessage || 'User profile data not available or could not be loaded.' }}</div>
    </div>

    <!-- Main Content -->
    <div v-else class="row g-4 g-lg-5">
      <!-- Left Column -->
      <div class="col-lg-4">
        <UserProfileHeader 
          :user="user" 
          :is-current-user="isCurrentUserProp" 
          :stats="stats"
          @edit-profile="openEditProfile"
        />
      </div>

      <!-- Right Column -->
      <div class="col-lg-8">
        <div class="d-flex flex-column gap-3">
          <UserXpBreakdown 
            v-if="hasXpData" 
            :xp-data="filteredXpData"
          />

          <UserEventHistory 
            :events="participatedEvents" 
            :loading="loadingEventsOrProjects"
          />

          <UserProjects 
            :projects="userProjects"
            :loading="loadingEventsOrProjects"
            :initial-data-loaded="initialDataLoaded"
          />
          
          <slot name="additional-content"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { EnrichedUserData, type StudentEventHistoryItem } from '@/types/student';

// Component imports
import UserProfileHeader from '@/components/user/UserProfileHeader.vue';
import UserXpBreakdown from '@/components/user/UserXpBreakdown.vue';
import UserEventHistory from '@/components/user/UserEventHistory.vue';
import UserProjects from '@/components/user/UserProjects.vue';

interface Props {
    userId: string;
    isCurrentUserProp: boolean;
}

interface Stats {
    participatedCount: number;
    organizedCount: number;
    wonCount: number;
}

interface UserProjectDisplay {
  id: string;
  projectName: string;
  link: string;
  description?: string | null;
  eventId?: string;
  eventName?: string;
  submittedAt?: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'edit-profile'): void;
}>();

const isCurrentUser = ref<boolean>(props.isCurrentUserProp);
const router = useRouter();
const studentStore = useProfileStore();

const user = ref<EnrichedUserData | null>(null);
const loading = ref<boolean>(true);
const errorMessage = ref<string>('');
const userProjects = ref<UserProjectDisplay[]>([]);
const participatedEvents = ref<StudentEventHistoryItem[]>([]);
const loadingEventsOrProjects = ref<boolean>(true);
const stats = ref<Stats>({ participatedCount: 0, organizedCount: 0, wonCount: 0 });
const initialDataLoaded = ref<boolean>(false);

const totalXpFromStore = computed((): number => {
  return user.value?.xpData?.totalCalculatedXp ?? 0;
});

const hasXpData = computed((): boolean => {
  return !!(user.value?.xpData && totalXpFromStore.value > 0 &&
            Object.values(user.value.xpData).some(val => typeof val === 'number' && val > 0));
});

// Create a filtered version of xpData that only includes numeric fields
const filteredXpData = computed(() => {
  if (!user.value?.xpData) return null;
  
  const result: Record<string, number> = {};
  
  // Include only numeric fields
  Object.entries(user.value.xpData).forEach(([key, value]) => {
    if (typeof value === 'number') {
      result[key] = value;
    }
  });
  
  return result;
});

const fetchProfileData = async () => {
    loading.value = true;
    loadingEventsOrProjects.value = true;
    errorMessage.value = '';
    user.value = null;
    userProjects.value = [];
    participatedEvents.value = [];
    stats.value = { participatedCount: 0, organizedCount: 0, wonCount: 0 };
    initialDataLoaded.value = false;

    try {
        const userIdToFetch = props.userId;
        if (!userIdToFetch) throw new Error('Invalid User ID provided.');

        await studentStore.fetchProfileForView(userIdToFetch);
        const profileDataFromStore = studentStore.viewedStudentProfile; 

        if (!profileDataFromStore) throw new Error('User data not found.');

        // Ensure xpData is explicitly null if undefined from store/inference
        user.value = { ...profileDataFromStore, xpData: profileDataFromStore.xpData ?? null };
        
        participatedEvents.value = studentStore.viewedStudentEventHistory; 
        userProjects.value = studentStore.viewedStudentProjects.map(p => ({...p, description: p.description === undefined ? null : p.description }));

        calculateStatsFromEvents(participatedEvents.value);
        if (user.value?.xpData) {
            stats.value.wonCount = user.value.xpData.count_wins ?? 0;
        }

    } catch (error: any) {
        errorMessage.value = error?.message || 'Failed to load profile.';
    } finally {
        loading.value = false;
        loadingEventsOrProjects.value = false;
        initialDataLoaded.value = true;
    }
};

const calculateStatsFromEvents = (events: StudentEventHistoryItem[]) => {
    let participated = 0, organized = 0; 

    events.forEach((eventItem: StudentEventHistoryItem) => { 
        if (eventItem.roleInEvent === 'participant' || eventItem.roleInEvent === 'team_member' || eventItem.roleInEvent === 'team_lead') {
            participated++;
        }
        if (eventItem.roleInEvent === 'organizer') {
            organized++;
        }
    });
    stats.value = { ...stats.value, participatedCount: participated, organizedCount: organized };
};

watch(() => props.userId, (newUserId) => {
  if (newUserId && typeof newUserId === 'string') {
    fetchProfileData();
    isCurrentUser.value = newUserId === studentStore.studentId;
  } else {
      loading.value = false;
      errorMessage.value = "Invalid User ID.";
      user.value = null;
  }
}, { immediate: true });

watch(() => props.isCurrentUserProp, (newVal) => {
    isCurrentUser.value = newVal;
});

const openEditProfile = () => {
  emit('edit-profile');
};

onMounted(() => {
  if (props.userId) {
    fetchProfileData();
  }
});
</script>
