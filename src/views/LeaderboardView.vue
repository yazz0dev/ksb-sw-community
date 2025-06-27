<!-- .\views\LeaderboardView.vue-->
<template>
  <div class="leaderboard-section section-spacing">
    <div class="container-lg px-3 px-md-4">
      <!-- Page Header -->
      <div class="text-center mb-4 mb-md-5">
        <h1 class="h1 text-gradient-primary mb-2">
          <i class="fas fa-trophy me-2"></i>
          Leaderboard
        </h1>
        <p class="text-subtitle mb-0">See who's leading in different roles and overall XP</p>
      </div>

      <!-- Role Filter Section -->
      <div class="section-card shadow-sm rounded-4 p-3 p-md-4 mb-4 animate-fade-in">
        <h3 class="h4 mb-3 text-center">
          <i class="fas fa-filter text-primary me-2"></i>
          Filter by Role
        </h3>
        <div class="role-filter-grid">
          <button
            v-for="role in availableDisplayRoles"
            :key="role.key"
            @click="selectRoleFilter(role.key)"
            type="button"
            class="btn btn-outline-primary btn-sm role-chip"
            :class="{ active: selectedRoleKey === role.key }"
          >
            {{ role.displayName }}
          </button>
        </div>
      </div>

      <SkeletonProvider
        :loading="loading"
        :skeleton-component="LeaderboardSkeleton"
      >
        <!-- Error State -->
        <div v-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <div class="flex-grow-1">
            <strong>Error loading leaderboard:</strong> {{ error }}
          </div>
          <button @click="retryLoading" class="btn btn-outline-danger btn-sm btn-icon ms-3">
            <i class="fas fa-sync-alt me-1"></i> Retry
          </button>
        </div>

        <!-- Leaderboard Content -->
        <div v-else class="section-card shadow-sm rounded-4 p-3 p-md-4 animate-fade-in">
          <!-- Empty State -->
          <div v-if="!filteredUsers || filteredUsers.length === 0" class="text-center py-4 py-md-5">
            <i class="fas fa-info-circle text-info text-display mb-3"></i>
            <h4 class="h4 text-secondary mb-3">
              <span v-if="isFirstLoad">Leaderboard is currently empty</span>
              <span v-else>No users found for {{ currentRoleDisplayName }}</span>
            </h4>
            <p class="text-muted mb-3">
              <span v-if="isFirstLoad">Participate in events to earn XP and appear on the leaderboard!</span>
              <span v-else>Try selecting a different role or check back later.</span>
            </p>
            <button @click="retryLoading" class="btn btn-primary btn-icon">
              <i class="fas fa-sync-alt me-1"></i> Refresh
            </button>
          </div>

          <!-- Leaderboard Table -->
          <div v-else>
            <!-- Stats Header -->
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
              <h3 class="h4 mb-0">
                <i class="fas fa-ranking-star text-primary me-2"></i>
                {{ currentRoleDisplayName }} Rankings
              </h3>
              <span class="badge bg-primary-subtle text-primary-emphasis small">
                {{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'user' : 'users' }}
              </span>
            </div>

            <!-- Top 3 Podium (Desktop) -->
            <div v-if="topThreeUsers.length > 0" class="top-three-container d-none d-md-block mb-5">
              <h4 class="h5 text-muted mb-3 text-center">
                <i class="fas fa-trophy text-warning me-2"></i>
                Top 3
              </h4>
              <div class="row g-3">
                <div 
                  v-for="(user, index) in topThreeUsers" 
                  :key="`desktop-top-${user.uid}`" 
                  class="col-md-4"
                >
                  <div class="top-desktop-card">
                    <StudentCard 
                      :userId="user.uid"
                      :photoURL="user.photoURL || null"
                      :variant="'ranked'"
                      :rank="index + 1"
                      :displayValue="user.displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="unified-student-card"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Top 3 Mobile View -->
            <div v-if="topThreeUsers.length > 0" class="d-md-none mb-4">
              <h4 class="h5 text-muted mb-3 text-center">
                <i class="fas fa-trophy text-warning me-2"></i>
                Top 3
              </h4>
              <div class="row g-3">
                <div 
                  v-for="(user, index) in topThreeUsers" 
                  :key="`mobile-top-${user.uid}`" 
                  class="col-12"
                >
                  <div class="top-mobile-card">
                    <StudentCard 
                      :userId="user.uid"
                      :photoURL="user.photoURL || null"
                      :variant="'ranked'"
                      :rank="index + 1"
                      :displayValue="user.displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="unified-student-card"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- All Rankings - Unified Desktop/Mobile Layout -->
            <div v-if="remainingUsers.length > 0 || topThreeUsers.length === 0">
              <h4 class="h5 text-muted mb-3 text-center text-md-start">
                Rankings
              </h4>
              
              <div class="row">
                <div 
                  class="col-12 col-md-6" 
                  v-for="(user, index) in (topThreeUsers.length > 0 ? remainingUsers : filteredUsers)" 
                  :key="user.uid"
                >
                  <div 
                    class="leaderboard-row-card mb-3"
                    v-motion
                    :initial="{ opacity: 0, y: 30 }"
                    :enter="{ opacity: 1, y: 0, transition: { delay: index * 50 } }"
                  >
                    <StudentCard 
                      :userId="user.uid"
                      :photoURL="user.photoURL || null"
                      :variant="'ranked'"
                      :rank="topThreeUsers.length > 0 ? user.actualRank : index + 1"
                      :displayValue="user.displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="unified-student-card"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SkeletonProvider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { formatRoleNameForDisplay } from '@/types/xp';
import type { XpFirestoreFieldKey } from '@/types/xp';
import type { EnrichedStudentData } from '@/types/student';
import StudentCard from '@/components/shared/StudentCard.vue';
import SkeletonProvider from '@/skeletons/SkeletonProvider.vue';

const LeaderboardSkeleton = defineAsyncComponent(() => import('@/skeletons/LeaderboardSkeleton.vue'));

type LeaderboardRoleKey = XpFirestoreFieldKey | 'totalCalculatedXp';

interface DisplayRole {
  key: LeaderboardRoleKey;
  displayName: string;
}

const availableDisplayRoles = ref<DisplayRole[]>([
  { key: 'totalCalculatedXp', displayName: 'Overall' },
  { key: 'xp_developer', displayName: formatRoleNameForDisplay('xp_developer') },
  { key: 'xp_presenter', displayName: formatRoleNameForDisplay('xp_presenter') },
  { key: 'xp_designer', displayName: formatRoleNameForDisplay('xp_designer') },
  { key: 'xp_problemSolver', displayName: formatRoleNameForDisplay('xp_problemSolver') },
  { key: 'xp_organizer', displayName: formatRoleNameForDisplay('xp_organizer') },
]);

const selectedRoleKey = ref<LeaderboardRoleKey>('totalCalculatedXp');
const users = ref<EnrichedStudentData[]>([]);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const retryCount = ref<number>(0);
const MAX_RETRIES = 3;
const isFirstLoad = ref<boolean>(true);

const studentStore = useProfileStore();

const getErrorMessage = (errorValue: unknown): string => {
  if (errorValue instanceof Error) return errorValue.message;
  if (typeof errorValue === 'string') return errorValue;
  if (errorValue && typeof (errorValue as any).message === 'string') return (errorValue as any).message;
  return 'An unknown error occurred';
};

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const fetchedUsers = await studentStore.loadLeaderboardUsers();
    users.value = fetchedUsers || [];
    if (studentStore.error) {
      const storeError = getErrorMessage(studentStore.error);
      if (!storeError.includes('empty')) error.value = storeError;
    }
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

const retryLoading = async () => {
  if (retryCount.value >= MAX_RETRIES) {
    error.value = `Failed after ${MAX_RETRIES} attempts. Please try again later.`;
    return;
  }
  retryCount.value++;
  isFirstLoad.value = false;
  await loadData();
};

onMounted(async () => {
  isFirstLoad.value = true;
  retryCount.value = 0;
  await loadData();
  isFirstLoad.value = false;
});

const currentRoleDisplayName = computed(() => {
  const role = availableDisplayRoles.value.find(r => r.key === selectedRoleKey.value);
  return role ? role.displayName : 'XP';
});

interface UserWithDisplayValue extends EnrichedStudentData {
  displayValue: number;
  actualRank: number;
}

const filteredUsers = computed((): UserWithDisplayValue[] => {
    return users.value
        .map((user) => {
            const xpData = user.xpData;
            const displayValue = xpData ? (xpData as any)[selectedRoleKey.value] || 0 : 0;
            return { ...user, displayValue, actualRank: 0 };
        })
        .sort((a, b) => b.displayValue - a.displayValue || (a.name || '').localeCompare(b.name || ''))
        .map((user, index) => ({ ...user, actualRank: index + 1 }));
});

const selectRoleFilter = (roleKey: LeaderboardRoleKey): void => {
  selectedRoleKey.value = roleKey;
};

const topThreeUsers = computed(() => {
  return filteredUsers.value.slice(0, 3);
});

const remainingUsers = computed(() => {
  return filteredUsers.value.slice(3);
});
</script>

<style lang="scss" scoped>
/* Scoped styles remain the same as the original */
.leaderboard-section {
  background: linear-gradient(135deg, var(--bs-light) 0%, var(--bs-primary-bg-subtle) 100%);
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding: 2rem 0 4rem 0;
}

@media (min-width: 992px) {
  .leaderboard-section {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}

.section-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.section-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--bs-box-shadow);
}

.role-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 0 auto;
  max-width: 100%;
}

@media (min-width: 576px) {
  .role-filter-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    max-width: 480px;
    gap: 0.75rem;
  }
}

@media (min-width: 768px) {
  .role-filter-grid {
    grid-template-columns: repeat(6, 1fr);
    max-width: 600px;
    gap: 0.75rem;
  }
}

@media (min-width: 992px) {
  .role-filter-grid {
    max-width: 700px;
    gap: 1rem;
  }
}

.role-chip {
  border-radius: var(--bs-border-radius-pill) !important;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.role-chip.active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
}

@media (max-width: 575px) {
  .role-chip {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    min-height: 28px;
  }
}

.leaderboard-row-card {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  transition: all 0.3s ease;
}

.leaderboard-row-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--bs-primary);
}

/* Podium */
.top-three-container {
  margin-bottom: 3rem;
}

/* Desktop Top 3 Cards */
.top-desktop-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 255, 255, 0.95));
  border: 2px solid rgba(255, 215, 0, 0.2);
  border-radius: var(--bs-border-radius-lg);
  transition: all 0.3s ease;
  height: 100%;
}

.top-desktop-card:nth-child(1) { border-color: rgba(255, 215, 0, 0.4); }
.top-desktop-card:nth-child(2) { border-color: rgba(192, 192, 192, 0.4); }
.top-desktop-card:nth-child(3) { border-color: rgba(205, 127, 50, 0.4); }

.top-desktop-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Mobile Podium View */
.top-mobile-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 255, 255, 0.95));
  border: 2px solid rgba(255, 215, 0, 0.2);
  border-radius: var(--bs-border-radius-lg);
  transition: all 0.3s ease;
}

.top-mobile-card:nth-child(1) { border-color: rgba(255, 215, 0, 0.4); }
.top-mobile-card:nth-child(2) { border-color: rgba(192, 192, 192, 0.4); }
.top-mobile-card:nth-child(3) { border-color: rgba(205, 127, 50, 0.4); }

.top-mobile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Remove old podium styles */
.podium-row {
  margin-top: 1.5rem;
}

.podium-item {
  text-align: center;
  padding: 1rem;
  border-radius: var(--bs-border-radius-lg);
  background-color: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  width: 180px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--bs-box-shadow-lg);
  }
}

.podium-first {
  width: 220px;
  padding-bottom: 2rem;
  background: linear-gradient(135deg, #ffd700, #ffed4e, #ffa500);
  border-color: #ffed4e;
}

.podium-second {
  width: 180px;
  background: linear-gradient(135deg, #c0c0c0, #e8e8e8, #a9a9a9);
  border-color: #e8e8e8;
}

.podium-third {
  width: 180px;
  background: linear-gradient(135deg, #cd7f32, #daa520, #8b4513);
  border-color: #daa520;
}

.podium-rank-badge {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid;
  font-weight: 700;
  font-size: 1rem;
  color: white;
  margin: 0 auto 0.5rem auto;
}

.podium-first .podium-rank-badge {
  background: #ffd700; /* Gold */
  border-color: #ffed4e;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.podium-second .podium-rank-badge {
  background: #c0c0c0; /* Silver */
  border-color: #e8e8e8;
  box-shadow: 0 4px 12px rgba(192, 192, 192, 0.4);
}

.podium-third .podium-rank-badge {
  background: #cd7f32; /* Bronze */
  border-color: #daa520;
  box-shadow: 0 4px 12px rgba(205, 127, 50, 0.4);
}

.podium-first .podium-rank-badge i.fa-crown {
  font-size: 1.2rem;
  color: var(--bs-warning);
}

/* Mobile Podium View */
.top-mobile-card {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 255, 255, 0.95));
  border: 2px solid rgba(255, 215, 0, 0.2);
  border-radius: var(--bs-border-radius-lg);
  transition: all 0.3s ease;
}

.top-mobile-card:nth-child(1) { border-color: rgba(255, 215, 0, 0.4); }
.top-mobile-card:nth-child(2) { border-color: rgba(192, 192, 192, 0.4); }
.top-mobile-card:nth-child(3) { border-color: rgba(205, 127, 50, 0.4); }

.top-mobile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Unified Student Card Styling */
.unified-student-card {
  margin: 0; /* Remove default margins */
}

/* Rankings List */
.leaderboard-row-card {
  padding: 1rem;
}

/* Generic Empty State */
.text-display {
  font-size: 4rem;
  opacity: 0.4;
}

.empty-state {
  padding: 3rem 1rem;
}

/* Animation */
.animate-fade-in {
  animation: fadeInUp 0.6s ease-out forwards; /* Uses global fadeInUp */
}

/* Local @keyframes fadeInUp removed. */

/* Responsive Adjustments */
@media (max-width: 767.98px) {
  .top-three-container {
    margin-bottom: 2rem; /* Adjusted margin */
  }
  
  .podium-item {
    width: 150px;
    padding: 0.75rem;
  }
  
  .podium-first {
    width: 180px;
    padding-bottom: 1.5rem;
  }
  
  .podium-rank-badge {
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
  }
  
  .podium-rank-badge i.fa-crown {
    font-size: 1rem;
  }
  
  .top-mobile-card .card-body {
    padding: 0.75rem;
  }
  
  .unified-student-card .name-section {
    font-size: 0.9rem;
  }
  
  .unified-student-card .xp-section .xp-value {
    font-size: 0.9rem;
  }
}

@media (max-width: 575.98px) {
  .leaderboard-row-card {
    padding: 0.75rem;
  }
  
  .podium-item {
    width: 130px;
  }
  
  .podium-first {
    width: 160px;
  }
  
  .leaderboard-row-card .student-card {
    font-size: 0.85rem;
  }
  
  .rank-text {
    font-size: 0.75rem;
  }
  
  .user-link, .user-name {
    font-size: 0.9rem;
  }
  
  .xp-value {
    font-size: 0.8rem;
  }
}
</style>