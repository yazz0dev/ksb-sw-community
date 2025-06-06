<!-- .\views\LeaderboardView.vue-->
<template>
  <div class="leaderboard-section">
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
      <div class="section-card shadow-sm rounded-4 p-3 p-md-4 mb-4 mb-md-5 animate-fade-in">
        <h3 class="h4 mb-3 text-center">
          <i class="fas fa-filter text-primary me-2"></i>
          Filter by Role
        </h3>
        <div class="role-filter-grid">
          <button
            v-for="role in availableDisplayRoles"
            :key="role.key"
            @click="selectRoleFilter(role.key as keyof XPData | 'totalCalculatedXp')"
            type="button"
            class="btn btn-outline-primary"
            :class="{ active: selectedRoleKey === role.key }"
          >
            <span class="role-icon">{{ getRoleIcon(role.key) }}</span>
            {{ role.displayName }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="section-card shadow-sm rounded-4 p-4 p-md-5 text-center animate-fade-in">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-secondary mb-0">Loading leaderboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
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
          <i class="fas fa-info-circle text-info fs-1 mb-3"></i>
          <h4 class="h4 text-secondary mb-3">
            <span v-if="isFirstLoad">
              Leaderboard is currently empty
            </span>
            <span v-else>
              No users found for {{ currentRoleDisplayName }}
            </span>
          </h4>
          <p class="text-muted mb-3">
            <span v-if="isFirstLoad">
              Participate in events to earn XP and appear on the leaderboard!
            </span>
            <span v-else>
              Try selecting a different role or check back later.
            </span>
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
            <span class="badge bg-primary-subtle text-primary-emphasis fs-6">
              {{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'user' : 'users' }}
            </span>
          </div>

          <!-- Top 3 Podium (Desktop) -->
          <div v-if="topThreeUsers.length > 0" class="top-three-container d-none d-md-block mb-5">
            <div class="row justify-content-center">
              <div class="col-12">
                <div class="podium-row d-flex justify-content-center align-items-end gap-4">
                  <!-- 2nd Place -->
                  <div v-if="topThreeUsers[1]" class="podium-item podium-second">
                    <div class="podium-rank-badge rank-2">2</div>
                    <StudentCard 
                      :userId="topThreeUsers[1].uid"
                      :photoURL="topThreeUsers[1].photoURL || null"
                      :variant="'ranked'"
                      :rank="2"
                      :displayValue="topThreeUsers[1].displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="podium-student-card"
                    />
                  </div>
                  
                  <!-- 1st Place (Center, Tallest) -->
                  <div v-if="topThreeUsers[0]" class="podium-item podium-first">
                    <div class="podium-rank-badge rank-1">
                      <i class="fas fa-crown"></i>
                    </div>
                    <StudentCard 
                      :userId="topThreeUsers[0].uid"
                      :photoURL="topThreeUsers[0].photoURL || null"
                      :variant="'ranked'"
                      :rank="1"
                      :displayValue="topThreeUsers[0].displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="podium-student-card"
                    />
                  </div>
                  
                  <!-- 3rd Place -->
                  <div v-if="topThreeUsers[2]" class="podium-item podium-third">
                    <div class="podium-rank-badge rank-3">3</div>
                    <StudentCard 
                      :userId="topThreeUsers[2].uid"
                      :photoURL="topThreeUsers[2].photoURL || null"
                      :variant="'ranked'"
                      :rank="3"
                      :displayValue="topThreeUsers[2].displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="podium-student-card"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile: Show top 3 users prominently -->
          <div v-if="topThreeUsers.length > 0" class="d-md-none mb-4">
            <h4 class="h5 text-muted mb-4 text-center">
              <i class="fas fa-trophy text-warning me-2"></i>
              Top Rankings
            </h4>
            <div class="mobile-top-rankings">
              <div 
                v-for="(user, index) in topThreeUsers" 
                :key="user.uid" 
                class="mobile-top-item mb-3"
                :class="{
                  'mobile-rank-1': index === 0,
                  'mobile-rank-2': index === 1,
                  'mobile-rank-3': index === 2
                }"
                v-motion
                :initial="{ opacity: 0, scale: 0.8, y: 20 }"
                :enter="{ opacity: 1, scale: 1, y: 0, transition: { delay: index * 200, type: 'spring', stiffness: 200 } }"
              >
                <!-- Remove the mobile-rank-indicator div -->
                <div class="mobile-card-content">
                  <StudentCard 
                    :userId="user.uid"
                    :photoURL="user.photoURL || null"
                    :variant="'ranked'"
                    :rank="index + 1"
                    :displayValue="user.displayValue"
                    :showXp="true"
                    :showAvatar="true"
                    :linkToProfile="true"
                    class="mobile-top-student-card"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Remaining Users (Desktop 2-column, Mobile single column) -->
          <div v-if="remainingUsers.length > 0">
            <h4 class="h5 text-muted mb-3 text-center text-md-start">
              {{ topThreeUsers.length > 0 ? 'Other Rankings' : 'Rankings' }}
            </h4>
            
            <!-- Desktop 2-column layout -->
            <div class="d-none d-md-block">
              <div class="row">
                <div class="col-md-6" v-for="(user, index) in remainingUsers" :key="user.uid">
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
                      :rank="user.actualRank"
                      :displayValue="user.displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="remaining-student-card"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Mobile single column layout -->
            <div class="d-md-none">
              <div class="mobile-remaining-rankings">
                <div 
                  v-for="(user, index) in remainingUsers" 
                  :key="user.uid"
                  class="mobile-remaining-item mb-3"
                  v-motion
                  :initial="{ opacity: 0, x: -30 }"
                  :enter="{ opacity: 1, x: 0, transition: { delay: index * 100, type: 'spring' } }"
                >
                  <!-- Remove the mobile-rank-badge div -->
                  <div class="mobile-remaining-content">
                    <StudentCard 
                      :userId="user.uid"
                      :photoURL="user.photoURL || null"
                      :variant="'ranked'"
                      :rank="user.actualRank"
                      :displayValue="user.displayValue"
                      :showXp="true"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="remaining-student-card"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile: Show all users in single column when no remaining users (less than 4 total users) -->
          <div v-else-if="topThreeUsers.length === 0" class="d-md-none">
            <div class="mobile-simple-list">
              <div 
                v-for="(user, index) in filteredUsers" 
                :key="user.uid"
                class="mobile-simple-item mb-3"
                v-motion
                :initial="{ opacity: 0, y: 30 }"
                :enter="{ opacity: 1, y: 0, transition: { delay: index * 150 } }"
              >
                <!-- Remove the rank-indicator div -->
                <div class="user-content">
                  <StudentCard 
                    :userId="user.uid"
                    :photoURL="user.photoURL || null"
                    :variant="'ranked'"
                    :rank="index + 1"
                    :displayValue="user.displayValue"
                    :showXp="true"
                    :showAvatar="true"
                    :linkToProfile="true"
                    class="leaderboard-student-card"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProfileStore } from '@/stores/profileStore'; 
import { formatRoleName } from '@/utils/formatters';
import type { XPData, XpFirestoreFieldKey } from '@/types/xp';
import type { EnrichedStudentData } from '@/types/student';
import StudentCard from '@/components/shared/StudentCard.vue'; 

// Define available roles for filtering, mapping to XPData keys
// Key: the field in XPData, DisplayName: what's shown to the user
const availableDisplayRoles = ref([
  { key: 'totalCalculatedXp', displayName: 'Overall' },
  { key: 'xp_developer', displayName: formatRoleName('developer') },
  { key: 'xp_presenter', displayName: formatRoleName('presenter') },
  { key: 'xp_designer', displayName: formatRoleName('designer') },
  { key: 'xp_problemSolver', displayName: formatRoleName('problemSolver') },
  { key: 'xp_organizer', displayName: formatRoleName('organizer') },
]);

const selectedRoleKey = ref<keyof XPData | 'totalCalculatedXp'>('totalCalculatedXp'); // Default to overall XP

const users = ref<EnrichedStudentData[]>([]); // Now uses EnrichedStudentData
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const retryCount = ref<number>(0);
const MAX_RETRIES = 3;
const isFirstLoad = ref<boolean>(true);

const studentStore = useProfileStore();

// Helper function to safely get an error message
const getErrorMessage = (errorValue: unknown): string => {
  if (errorValue instanceof Error) {
    return errorValue.message;
  }
  if (typeof errorValue === 'string') {
    return errorValue;
  }
  // Handle cases where errorValue might be an object with a message property but not an Error instance
  if (errorValue && typeof (errorValue as any).message === 'string') {
    return (errorValue as any).message;
  }
  return String(errorValue); // Fallback
};

watch(() => studentStore.isLoading, (storeLoading) => { // Changed studentStore.loading to studentStore.isLoading
  loading.value = storeLoading;
});

watch(() => studentStore.error, (storeErrorValue) => {
  if (storeErrorValue) {
    const errorMessage = getErrorMessage(storeErrorValue);
    if (!(error.value && error.value.startsWith("Failed after"))) {
        // Only set local error if it's a "real" error for leaderboard context
        if (!errorMessage.includes('No users found in the database') && !errorMessage.includes('collection might be empty')) {
             error.value = errorMessage;
        } else {
            error.value = null; // Clear if it's just an empty state info
        }
    }
  } else {
    if (!(error.value && error.value.startsWith("Failed after"))) {
        error.value = null;
    }
  }
});

const currentRoleDisplayName = computed(() => {
  const role = availableDisplayRoles.value.find(r => r.key === selectedRoleKey.value);
  return role ? role.displayName : 'XP';
});

const retryLoading = async () => {
  if (retryCount.value >= MAX_RETRIES) {
    error.value = `Failed after ${MAX_RETRIES} attempts. Please refresh the page or try again later.`;
    loading.value = false;
    return;
  }
  error.value = null;
  loading.value = true;
  retryCount.value++;
  isFirstLoad.value = false;
  try {
    // Load leaderboard data regardless of authentication status
    const fetchedUsers = await studentStore.loadLeaderboardUsers();
    users.value = fetchedUsers || [];

    if (studentStore.error) {
        const storeErrorMessage = getErrorMessage(studentStore.error);
        if (!storeErrorMessage.includes('No users found in the database') && !storeErrorMessage.includes('collection might be empty')) {
            error.value = storeErrorMessage;
        } else {
            error.value = null;
        }
    } else {
        error.value = null;
    }
  } catch (err: any) {
    // Handle errors gracefully for unauthenticated users
    const errorMessage = getErrorMessage(err);
    if (!errorMessage.includes('permission') && !errorMessage.includes('unauthorized')) {
        error.value = errorMessage || 'Failed to fetch leaderboard data on retry';
    } else {
        // For auth-related errors, still show empty state instead of error
        error.value = null;
    }
    users.value = [];
  } finally {
    loading.value = studentStore.isLoading;
  }
};

onMounted(async () => {
    loading.value = true;
    error.value = null;
    isFirstLoad.value = true;
    retryCount.value = 0;
    try {
        // Load leaderboard data regardless of authentication status
        const fetchedUsers = await studentStore.loadLeaderboardUsers();
        users.value = fetchedUsers || [];

        if (studentStore.error) {
            const storeErrorMessage = getErrorMessage(studentStore.error);
            if (!storeErrorMessage.includes('No users found in the database') && !storeErrorMessage.includes('collection might be empty')) {
                error.value = storeErrorMessage;
            } else {
                 error.value = null;
            }
        } else {
            error.value = null;
        }
    } catch (err: any) {
        // Handle errors gracefully for unauthenticated users
        const errorMessage = getErrorMessage(err);
        if (!errorMessage.includes('permission') && !errorMessage.includes('unauthorized')) {
            error.value = errorMessage || "An unexpected error occurred while loading the leaderboard.";
        } else {
            // For auth-related errors, still show empty state instead of error
            error.value = null;
        }
        users.value = [];
    } finally {
        loading.value = studentStore.isLoading;
        isFirstLoad.value = false;
    }
});

// Define an interface for the user object after adding displayValue
interface UserWithDisplayValue extends EnrichedStudentData {
  displayValue: number;
  actualRank: number;
}

const filteredUsers = computed(() => {
    return users.value
        .map((user: EnrichedStudentData): UserWithDisplayValue => {
            let displayValue = 0;
            const userXpData = user.xpData; // Access nested xpData

            if (userXpData) {
                if (selectedRoleKey.value === 'totalCalculatedXp') {
                    displayValue = userXpData.totalCalculatedXp || 0;
                } else if (selectedRoleKey.value.startsWith('xp_')) {
                    displayValue = (userXpData as any)[selectedRoleKey.value as XpFirestoreFieldKey] || 0;
                }
            }
            return { ...user, displayValue, actualRank: 0 }; // Initialize actualRank, will be set below
        })
        // Show all users regardless of XP value (including 0 XP)
        .sort((a: UserWithDisplayValue, b: UserWithDisplayValue) => {
            if (b.displayValue !== a.displayValue) {
                return b.displayValue - a.displayValue;
            }
            return ((a.name || a.uid) || '').localeCompare((b.name || b.uid) || '');
        })
        .map((user, index) => ({ ...user, actualRank: index + 1 })); // Set actual rank based on sorted position
});

const selectRoleFilter = (roleKey: keyof XPData | 'totalCalculatedXp'): void => {
  selectedRoleKey.value = roleKey;
};

// Computed properties for top 3 users and remaining users
const topThreeUsers = computed(() => {
  return filteredUsers.value.slice(0, 3);
});

const remainingUsers = computed(() => {
  return filteredUsers.value.slice(3);
});

// Add role icon helper function
const getRoleIcon = (roleKey: string): string => {
  const iconMap: Record<string, string> = {
    'totalCalculatedXp': '🏆',
    'xp_developer': '💻',
    'xp_presenter': '🎤',
    'xp_designer': '🎨',
    'xp_problemSolver': '🧩',
    'xp_organizer': '📋'
  };
  return iconMap[roleKey] || '🏆';
};
</script>

<style scoped>
/* Minimal scoped styles - main styling handled in main.scss */
.leaderboard-student-card {
  padding: 0 !important;
}

.rank-cell {
  padding-right: 0 !important;
}

/* Role Filter Improvements */
.role-filter-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
  margin: 0 auto;
  max-width: 900px;
}

.role-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 2px solid var(--bs-border-color);
  background: white;
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;
  min-height: 3rem;
}

.role-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--bs-primary);
}

.role-btn.active {
  background: var(--bs-primary);
  border-color: var(--bs-primary);
  color: white;
  transform: translateY(-1px);
}

.role-icon {
  font-size: 1.2rem;
}

/* Mobile Styles - Updated to match desktop cards */
.mobile-top-rankings {
  padding: 0;
}

.mobile-top-item {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 249, 250, 0.9));
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.mobile-top-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--bs-primary), var(--bs-secondary));
  opacity: 0.3;
}

.mobile-top-item:active {
  transform: scale(0.98);
}

.mobile-rank-1 {
  border-color: #ffd700;
  background: linear-gradient(135deg, #fff9e6, #fef3cd);
}

.mobile-rank-1::before {
  background: linear-gradient(90deg, #ffd700, #ffed4e);
  opacity: 1;
}

.mobile-rank-2 {
  border-color: #c0c0c0;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.mobile-rank-2::before {
  background: linear-gradient(90deg, #c0c0c0, #d4d4d4);
  opacity: 1;
}

.mobile-rank-3 {
  border-color: #cd7f32;
  background: linear-gradient(135deg, #fdf6f0, #f4e4d6);
}

.mobile-rank-3::before {
  background: linear-gradient(90deg, #cd7f32, #deb887);
  opacity: 1;
}

/* Remove mobile rank indicator styles since we're using desktop layout */
.mobile-card-content {
  margin: 0;
}

.mobile-remaining-rankings {
  padding: 0;
}

.mobile-remaining-item {
  position: relative;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  overflow: hidden;
}

.mobile-remaining-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--bs-primary);
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.mobile-remaining-item:hover::before {
  opacity: 1;
}

.mobile-remaining-item:active {
  background: rgba(255, 255, 255, 0.95);
  transform: scale(0.98);
}

/* Remove mobile rank badge styles */
.mobile-remaining-content {
  margin: 0;
}

/* Simple list for when no top 3 */
.mobile-simple-list {
  padding: 0;
}

.mobile-simple-item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  gap: 0;
  overflow: hidden;
}

.mobile-simple-item:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 1);
}

/* Remove rank indicator styles since using desktop layout */
.mobile-top-student-card,
.remaining-student-card {
  margin: 0;
}

/* Responsive table improvements */
@media (max-width: 768px) {
  .role-filter-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    max-width: 100%;
  }
  
  .role-btn {
    padding: 0.625rem 0.5rem;
    font-size: 0.875rem;
    flex-direction: column;
    gap: 0.25rem;
    min-height: 4rem;
  }
  
  .role-icon {
    font-size: 1.2rem;
  }
}

@media (max-width: 576px) {
  .role-filter-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  
  .role-btn {
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
  }
  
  .role-icon {
    font-size: 1rem;
  }
  
  .leaderboard-table {
    font-size: 0.875rem;
  }
  
  .rank-badge {
    background: var(--bs-primary);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    margin: 0 auto;
  }
  
  .xp-value {
    font-weight: 600;
    color: var(--bs-primary);
  }
  
  .mobile-top-item {
    margin-bottom: 1rem;
  }
  
  .mobile-remaining-item {
    margin-bottom: 1rem;
  }
}

@media (max-width: 375px) {
  .role-filter-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .role-btn {
    font-size: 0.8rem;
    padding: 0.5rem 0.5rem;
  }
  
  .mobile-top-item {
    margin-bottom: 1rem;
  }
  
  .mobile-remaining-item {
    margin-bottom: 1rem;
  }
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.6s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

</style>