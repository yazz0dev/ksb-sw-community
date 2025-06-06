<template>
  <div class="user-profile-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container d-flex flex-column align-items-center justify-content-center py-5">
      <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-secondary fw-medium">Loading profile data...</p>
    </div>

    <!-- Error/Not Found States -->
    <div v-else-if="errorMessage || !user" class="error-container animate-fade-in">
      <div class="alert alert-warning d-flex align-items-center shadow-sm rounded-4" role="alert">
        <div class="alert-icon me-3">
          <i class="fas fa-exclamation-triangle fa-2x"></i>
        </div>
        <div class="alert-content">
          <h6 class="alert-heading mb-1">Profile Not Available</h6>
          <p class="mb-0">{{ errorMessage || 'User profile data not available or could not be loaded.' }}</p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="profile-content animate-fade-in">
      <div class="row g-4 g-lg-5">
        <!-- Left Column -->
        <div class="col-lg-4">
          <div class="profile-sidebar">
            <UserProfileHeader 
              :user="user" 
              :is-current-user="isCurrentUserProp" 
              :stats="stats"
              @edit-profile="openEditProfile"
              class="animate-fade-in"
              style="animation-delay: 0.1s"
            />
          </div>
        </div>

        <!-- Right Column -->
        <div class="col-lg-8">
          <div class="profile-details d-flex flex-column gap-4">
            <!-- XP Breakdown -->
            <div 
              v-if="hasXpData" 
              class="xp-section animate-fade-in"
              style="animation-delay: 0.2s"
            >
              <UserXpBreakdown 
                :xp-data="filteredXpData"
              />
            </div>

            <!-- Event History -->
            <div 
              class="events-section animate-fade-in"
              style="animation-delay: 0.3s"
            >
              <UserEventHistory 
                :events="participatedEvents" 
                :loading="loadingEventsOrProjects"
              />
            </div>

            <!-- Projects -->
            <div 
              class="projects-section animate-fade-in"
              style="animation-delay: 0.4s"
            >
              <UserProjects 
                :projects="userProjects"
                :loading="loadingEventsOrProjects"
                :initial-data-loaded="initialDataLoaded"
              />
            </div>
            
            <!-- Additional Content Slot -->
            <div 
              v-if="$slots['additional-content']" 
              class="additional-content animate-fade-in"
              style="animation-delay: 0.5s"
            >
              <slot name="additional-content"></slot>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import type { EnrichedUserData, StudentEventHistoryItem } from '@/types/student';

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
  // Component is mounted, check if userId is already available
  if (props.userId) {
    fetchProfileData();
  }
});
</script>

<style scoped>
/* Container Styling */
.user-profile-container {
  min-height: 50vh;
}

/* Loading State */
.loading-container {
  min-height: 400px;
  animation: fadeIn 0.5s ease-in-out;
}

/* Error State */
.error-container {
  margin: 2rem 0;
}

.alert {
  border: none;
  border-left: 4px solid var(--bs-warning);
}

.alert-icon {
  color: var(--bs-warning);
  opacity: 0.8;
}

.alert-content .alert-heading {
  color: var(--bs-warning-emphasis);
  font-weight: 600;
}

/* Profile Content */
.profile-content {
  opacity: 0;
  animation: fadeIn 0.6s ease-in-out forwards;
}

/* Profile Sidebar */
.profile-sidebar {
  position: sticky;
  top: 2rem;
  z-index: 10;
}

/* Profile Details Sections */
.profile-details > div {
  opacity: 0;
  transform: translateY(20px);
  animation: slideInUp 0.6s ease-out forwards;
}

.xp-section {
  animation-delay: 0.1s;
}

.events-section {
  animation-delay: 0.2s;
}

.projects-section {
  animation-delay: 0.3s;
}

.additional-content {
  animation-delay: 0.4s;
}

/* Responsive Design */
@media (max-width: 992px) {
  .profile-sidebar {
    position: static;
    top: auto;
  }
  
  .profile-details {
    gap: 1.5rem !important;
  }
}

@media (max-width: 768px) {
  .row {
    gap: 1.5rem !important;
  }
  
  .loading-container {
    min-height: 300px;
    padding: 2rem 0 !important;
  }
  
  .error-container {
    margin: 1rem 0;
  }
  
  .alert {
    padding: 1rem;
    border-radius: var(--bs-border-radius-lg) !important;
  }
  
  .alert-icon .fa-2x {
    font-size: 1.5rem !important;
  }
}

@media (max-width: 480px) {
  .user-profile-container {
    padding: 0;
  }
  
  .profile-details {
    gap: 1rem !important;
  }
  
  .loading-container {
    min-height: 250px;
    padding: 1.5rem 0 !important;
  }
  
  .loading-container .spinner-border {
    width: 2.5rem !important;
    height: 2.5rem !important;
  }
  
  .alert {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .alert-icon {
    margin: 0 !important;
  }
}

/* Animation Keyframes */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
