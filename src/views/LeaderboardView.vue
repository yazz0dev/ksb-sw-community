<!-- .\views\LeaderboardView.vue-->
<template>
  <div class="leaderboard-section">
    <div class="container-lg px-3 px-md-4">
      <!-- Page Header -->
      <div class="text-center mb-4 mb-md-5">
        <h1 class="h2 h1-lg fw-bold text-dark mb-2">
          <i class="fas fa-trophy text-primary me-2"></i>
          Leaderboard
        </h1>
        <p class="text-secondary mb-0">See who's leading in different roles and overall XP</p>
      </div>

      <!-- Role Filter Section -->
      <div class="section-card shadow-sm rounded-4 p-3 p-md-4 mb-4 mb-md-5 animate-fade-in">
        <h3 class="h5 h4-md mb-3 text-center">
          <i class="fas fa-filter text-primary me-2"></i>
          Filter by Role
        </h3>
        <div class="role-filter-grid">
          <button
            v-for="role in availableDisplayRoles"
            :key="role.key"
            @click="selectRoleFilter(role.key as keyof XPData | 'totalCalculatedXp')"
            type="button"
            class="role-btn"
            :class="{ active: selectedRoleKey === role.key }"
          >
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
        <button @click="retryLoading" class="btn btn-sm btn-outline-danger ms-3">
          <i class="fas fa-sync-alt me-1"></i> Retry
        </button>
      </div>

      <!-- Leaderboard Content -->
      <div v-else class="section-card shadow-sm rounded-4 p-3 p-md-4 animate-fade-in">
        <!-- Empty State -->
        <div v-if="!filteredUsers || filteredUsers.length === 0" class="text-center py-4 py-md-5">
          <i class="fas fa-info-circle text-info fs-1 mb-3"></i>
          <h4 class="h5 text-secondary mb-3">
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
          <button @click="retryLoading" class="btn btn-primary">
            <i class="fas fa-sync-alt me-1"></i> Refresh
          </button>
        </div>

        <!-- Leaderboard Table -->
        <div v-else>
          <!-- Stats Header -->
          <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
            <h3 class="h5 h4-md mb-0 text-dark">
              <i class="fas fa-ranking-star text-primary me-2"></i>
              {{ currentRoleDisplayName }} Rankings
            </h3>
            <span class="badge bg-primary-subtle text-primary-emphasis fs-6">
              {{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'user' : 'users' }}
            </span>
          </div>

          <!-- Responsive Table Container -->
          <div class="table-responsive">
            <table class="table table-hover leaderboard-table">
              <thead class="table-light">
                <tr>
                  <th scope="col" class="rank-column">
                    <i class="fas fa-hashtag text-muted"></i>
                  </th>
                  <th scope="col">User</th>
                  <th scope="col" class="text-end">XP</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(user, index) in filteredUsers" :key="user.uid" class="leaderboard-row">
                  <td class="rank-cell">
                    <!-- Rank number is displayed by StudentCard with variant='ranked' -->
                  </td>
                  <td class="user-cell">
                    <StudentCard 
                      :userId="user.uid"
                      :photoURL="user.photoURL"
                      :variant="'ranked'"
                      :rank="index + 1"
                      :displayValue="user.displayValue"
                      :showXp="false"
                      :showAvatar="true"
                      :linkToProfile="true"
                      class="leaderboard-student-card"
                    />
                  </td>
                  <td class="xp-cell text-end">
                    <div class="xp-container">
                      <span class="xp-value">{{ user.displayValue }}</span>
                      <span class="xp-label text-muted d-none d-sm-inline">XP</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
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
import { XPData, XpFirestoreFieldKey } from '@/types/xp';
import { EnrichedStudentData } from '@/types/student';
import StudentCard from '@/components/user/StudentCard.vue'; 

const defaultAvatarUrl: string = '/default-avatar.png';

const handleImageError = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  if (imgElement) {
    imgElement.src = defaultAvatarUrl;
  }
};

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
            return { ...user, displayValue };
        })
        // Show all users regardless of XP value (including 0 XP)
        .sort((a: UserWithDisplayValue, b: UserWithDisplayValue) => {
            if (b.displayValue !== a.displayValue) {
                return b.displayValue - a.displayValue;
            }
            return ((a.name || a.uid) || '').localeCompare((b.name || b.uid) || '');
        });
});

const selectRoleFilter = (roleKey: keyof XPData | 'totalCalculatedXp'): void => {
  selectedRoleKey.value = roleKey;
};
</script>

<style scoped>
/* Use consistent section styling */
.section-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

/* Role Filter Grid */
.role-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  max-width: 600px;
  margin: 0 auto;
}

.role-btn {
  padding: 0.75rem 1rem;
  border: 2px solid var(--bs-primary);
  background: transparent;
  color: var(--bs-primary);
  border-radius: var(--bs-border-radius-lg);
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.875rem;
  white-space: nowrap;
  text-align: center;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-btn:hover {
  background: var(--bs-primary-bg-subtle);
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow);
}

.role-btn.active {
  background: var(--bs-primary);
  color: white;
  box-shadow: var(--bs-box-shadow);
}

/* Leaderboard Table */
.leaderboard-table {
  margin-bottom: 0;
}

.leaderboard-table th {
  border-top: none;
  font-weight: 600;
  color: var(--bs-secondary);
  text-transform: uppercase;
  font-size: 0.875rem;
  padding: 1rem 0.75rem;
  border-bottom: 2px solid var(--bs-border-color-translucent);
}

.leaderboard-table td {
  padding: 1rem 0.75rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.leaderboard-row:hover {
  background-color: var(--bs-light);
}

.rank-column {
  width: 60px;
}

.rank-cell {
  padding-right: 0 !important;
}

.user-cell {
  min-width: 200px;
}

.leaderboard-student-card {
  padding: 0 !important;
}

.xp-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.xp-value {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--bs-dark);
}

.xp-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .role-filter-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    max-width: 400px;
  }
  
  .role-btn {
    padding: 0.625rem 0.75rem;
    font-size: 0.8rem;
    min-height: 40px;
  }
  
  .leaderboard-table th,
  .leaderboard-table td {
    padding: 0.75rem 0.5rem;
  }
  
  .xp-value {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .role-filter-grid {
    grid-template-columns: 1fr;
    max-width: 300px;
  }
  
  .role-btn {
    padding: 0.5rem;
    font-size: 0.75rem;
    min-height: 36px;
  }
  
  .leaderboard-table th,
  .leaderboard-table td {
    padding: 0.5rem 0.25rem;
    font-size: 0.875rem;
  }
  
  .xp-value {
    font-size: 0.9rem;
  }
  
  .user-cell {
    min-width: auto;
  }
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>