<!-- .\views\LeaderboardView.vue-->
<template>
  <section class="leaderboard-section">
    <div class="container-lg py-4 py-md-5">
      <h1 class="h2 h1-lg fw-bold text-primary mb-4 text-center">Leaderboard</h1>

      <!-- Role Filter -->
      <div class="filter-section mb-4 mb-md-5">
        <label class="form-label text-secondary mb-3 text-center d-block">Select Role to Rank By</label>
        <div class="role-filter-group justify-content-center">
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
      <div v-if="loading" class="loader-container">
         <div class="spinner-border text-primary" role="status">
             <span class="visually-hidden">Loading...</span>
         </div>
         <p class="text-secondary mt-3">Loading leaderboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>Error loading leaderboard:</strong> {{ error }}
        <button @click="retryLoading" class="btn btn-sm btn-outline-danger ms-3">
          <i class="fas fa-sync-alt me-1"></i> Retry
        </button>
      </div>

      <!-- Leaderboard Content -->
      <div v-else>
        <div v-if="!filteredUsers || filteredUsers.length === 0" class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          <span v-if="isFirstLoad">
            Leaderboard is currently empty. Participate in events to earn XP!
          </span>
          <span v-else>
            No users found for the selected role or leaderboard is empty.
          </span>
          <button @click="retryLoading" class="btn btn-sm btn-outline-primary ms-3">
            <i class="fas fa-sync-alt me-1"></i> Refresh
          </button>
        </div>

        <div v-else class="leaderboard-content">
          <p class="text-secondary mb-2 text-center">
            Showing {{ filteredUsers.length }} users ranked by {{ currentRoleDisplayName }} XP.
          </p>

          <div class="leaderboard-table-container">
            <div class="leaderboard-table">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th style="width: 60px;">#</th>
                    <th>User</th>
                    <th class="text-end">XP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(user, index) in filteredUsers" :key="user.uid" class="align-middle">
                    <td>
                      <div v-if="index < 3" :class="['rank-badge', `rank-${index + 1}`]">
                        {{ index + 1 }}
                      </div>
                      <span v-else class="rank-number">{{ index + 1 }}</span>
                    </td>
                    <td>
                      <div class="d-flex align-items-center">
                        <img
                          :src="user.photoURL || defaultAvatarUrl"
                          :alt="user.name || 'User'"
                          @error="handleImageError"
                          class="leaderboard-avatar me-2"
                        />
                        <router-link
                          :to="{ name: 'PublicProfile', params: { userId: user.uid } }"
                          class="user-link"
                        >
                          {{ user.name || `User ${user.uid.substring(0, 6)}` }}
                        </router-link>
                      </div>
                    </td>
                    <td class="text-end">
                      <span class="xp-value">{{ user.displayValue }} XP</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProfileStore } from '@/stores/profileStore'; // Changed useProfileStore
import { formatRoleName } from '@/utils/formatters'; // Assuming this handles display names
import { XPData, XpFirestoreFieldKey } from '@/types/xp'; // Import XP types
import { EnrichedStudentData } from '@/types/student'; // Changed EnrichedUserData

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
/* .leaderboard-section styles removed - handled by global styles/variables */
.role-filter-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  max-width: 600px;
  margin: 0 auto;
  justify-content: center;
}

.role-btn {
  padding: 0.75rem 1rem;
  border: 2px solid var(--bs-primary);
  background: transparent;
  color: var(--bs-primary);
  border-radius: 2rem;
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
  background: var(--bs-primary-subtle);
  transform: translateY(-1px);
}

.role-btn.active {
  background: var(--bs-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
}

.leaderboard-content {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.leaderboard-table-container {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 0 1rem;
}

.leaderboard-table {
  background: white;
  border-radius: 1rem;
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.table {
  margin-bottom: 0;
  width: 100%;
}

.table th {
  border-top: none;
  font-weight: 600;
  color: var(--bs-secondary);
  text-transform: uppercase;
  font-size: 0.875rem;
  padding: 1.25rem 1rem;
  border-bottom: 2px solid var(--bs-border-color-translucent);
}

.table td {
  padding: 1.25rem 1rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.rank-badge {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1rem;
  position: relative;
  overflow: hidden;
}

.rank-badge::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: rotate(45deg);
  transition: all 0.6s;
  opacity: 0;
}

.rank-badge:hover::before {
  opacity: 1;
  transform: rotate(45deg) translate(50%, 50%);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500, #ff8c00);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
  border: 2px solid #ffed4e;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #e8e8e8, #c0c0c0, #a9a9a9);
  box-shadow: 0 4px 12px rgba(192, 192, 192, 0.4);
  border: 2px solid #f0f0f0;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #daa520, #cd7f32, #8b4513);
  box-shadow: 0 4px 12px rgba(205, 127, 50, 0.4);
  border: 2px solid #f4a460;
}

.rank-number {
  font-weight: 500;
  color: var(--bs-secondary);
}

.user-link {
  color: var(--bs-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.xp-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.loader-container {
  text-align: center;
  padding: 3rem;
}

.leaderboard-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--bs-border-color-translucent);
}

@media (max-width: 768px) {
  .role-filter-group {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 0.5rem;
    max-width: 400px;
  }
  
  .role-btn {
    padding: 0.625rem 0.75rem;
    font-size: 0.8rem;
    min-height: 40px;
  }
  
  .table th, .table td {
    padding: 1rem 0.75rem;
  }
  
  .leaderboard-table {
    padding: 1.5rem;
  }
  
  .leaderboard-table-container {
    padding: 0 0.5rem;
  }
  
  .rank-badge {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .role-filter-group {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 0.4rem;
    max-width: 350px;
  }
  
  .role-btn {
    padding: 0.4rem 0.5rem;
    font-size: 0.7rem;
    min-height: 32px;
  }
  
  .table th, .table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
  }
  
  .leaderboard-table {
    padding: 1rem;
  }
  
  .leaderboard-table-container {
    padding: 0 0.25rem;
  }
  
  .rank-badge {
    width: 2rem;
    height: 2rem;
    font-size: 0.8rem;
  }
}
</style>