<!-- .\views\LeaderboardView.vue-->
<template>
  <section class="leaderboard-section">
    <div class="container-lg py-5">
      <h1 class="display-5 fw-bold text-primary mb-4">Leaderboard</h1>

      <!-- Role Filter -->
      <div class="filter-section mb-5">
        <label class="form-label text-secondary mb-3">Select Role to Rank By</label>
        <div class="role-filter-group">
          <button
            v-for="role in availableDisplayRoles"
            :key="role.key"
            @click="selectRoleFilter(role.key as keyof XPData | 'totalCalculatedXp' | 'count_wins')"
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

        <div v-else>
          <p class="text-secondary mb-3">
            Showing {{ filteredUsers.length }} users ranked by {{ currentRoleDisplayName }}
            <span v-if="selectedRoleKey !== 'totalCalculatedXp' && selectedRoleKey !== 'count_wins'">XP</span>.
          </p>

          <div class="leaderboard-table">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th style="width: 60px;">#</th>
                  <th>User</th>
                  <th class="text-end">{{ selectedRoleKey === 'count_wins' ? 'Wins' : 'XP' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(user, index) in filteredUsers" :key="user.uid" class="align-middle">
                  <td>
                    <div v-if="index < 3 && user.displayValue > 0" :class="['rank-badge', `rank-${index + 1}`]">
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
                    <span class="xp-value">{{ user.displayValue }}</span>
                    <span v-if="selectedRoleKey !== 'count_wins'"> XP</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useStudentProfileStore } from '@/stores/studentProfileStore'; // Changed useUserStore
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
  { key: 'totalCalculatedXp', displayName: 'Overall XP' },
  { key: 'xp_developer', displayName: formatRoleName('developer') },
  { key: 'xp_presenter', displayName: formatRoleName('presenter') },
  { key: 'xp_designer', displayName: formatRoleName('designer') },
  { key: 'xp_problemSolver', displayName: formatRoleName('problemSolver') },
  { key: 'xp_organizer', displayName: formatRoleName('organizer') },
  // Add 'Wins' to the available roles if it's not implicitly handled by totalCalculatedXp or another mechanism
  // For example, if 'count_wins' is a distinct metric you want to rank by:
  { key: 'count_wins', displayName: 'Wins' },
]);

const selectedRoleKey = ref<keyof XPData | 'totalCalculatedXp' | 'count_wins'>('totalCalculatedXp'); // Default to overall XP

const users = ref<EnrichedStudentData[]>([]); // Now uses EnrichedStudentData
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const retryCount = ref<number>(0);
const MAX_RETRIES = 3;
const isFirstLoad = ref<boolean>(true);

const userStore = useStudentProfileStore();

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

watch(() => userStore.isLoading, (storeLoading) => { // Changed userStore.loading to userStore.isLoading
  loading.value = storeLoading;
});

watch(() => userStore.error, (storeErrorValue) => {
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
    const fetchedUsers = await userStore.loadLeaderboardUsers(); // Changed action name
    users.value = fetchedUsers || []; // Assign fetched data, default to empty array if null/undefined

    if (userStore.error) {
        const storeErrorMessage = getErrorMessage(userStore.error);
        if (!storeErrorMessage.includes('No users found in the database') && !storeErrorMessage.includes('collection might be empty')) {
            error.value = storeErrorMessage;
        } else {
            error.value = null;
        }
    } else {
        error.value = null;
    }
  } catch (err: any) {
    error.value = getErrorMessage(err) || 'Failed to fetch leaderboard data on retry';
    users.value = [];
  } finally {
    loading.value = userStore.isLoading; // Changed userStore.loading to userStore.isLoading
  }
};

onMounted(async () => {
    loading.value = true;
    error.value = null;
    isFirstLoad.value = true;
    retryCount.value = 0;
    try {
        const fetchedUsers = await userStore.loadLeaderboardUsers(); // Changed action name
        users.value = fetchedUsers || []; // Assign fetched data, default to empty array if null/undefined

        if (userStore.error) {
            const storeErrorMessage = getErrorMessage(userStore.error);
            if (!storeErrorMessage.includes('No users found in the database') && !storeErrorMessage.includes('collection might be empty')) {
                error.value = storeErrorMessage;
            } else {
                 error.value = null;
            }
        } else {
            error.value = null;
        }
    } catch (err: any) {
        error.value = getErrorMessage(err) || "An unexpected error occurred while loading the leaderboard.";
        users.value = [];
    } finally {
        loading.value = userStore.isLoading; // Changed userStore.loading to userStore.isLoading
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
                } else if (selectedRoleKey.value === 'count_wins') {
                    displayValue = userXpData.count_wins || 0;
                } else if (selectedRoleKey.value.startsWith('xp_')) {
                    displayValue = (userXpData as any)[selectedRoleKey.value as XpFirestoreFieldKey] || 0;
                }
            }
            return { ...user, displayValue };
        })
        .filter((user: UserWithDisplayValue) => user.displayValue > 0 || (selectedRoleKey.value === 'count_wins' && user.displayValue >= 0) ) // Show users with 0 wins if that's selected, otherwise only >0 XP
        .sort((a: UserWithDisplayValue, b: UserWithDisplayValue) => {
            if (b.displayValue !== a.displayValue) {
                return b.displayValue - a.displayValue;
            }
            return ((a.name || a.uid) || '').localeCompare((b.name || b.uid) || '');
        });
});

const selectRoleFilter = (roleKey: keyof XPData | 'totalCalculatedXp' | 'count_wins'): void => {
  selectedRoleKey.value = roleKey;
};
</script>

<style scoped>
/* .leaderboard-section styles removed - handled by global styles/variables */
.role-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.role-btn {
  padding: 0.5rem 1rem;
  border: 2px solid var(--bs-primary);
  background: transparent;
  color: var(--bs-primary);
  border-radius: 2rem;
  transition: all 0.2s ease;
  font-weight: 500;
}

.role-btn:hover {
  background: var(--bs-primary-subtle);
}

.role-btn.active {
  background: var(--bs-primary);
  color: white;
}

.leaderboard-table {
  background: white; /* Keep white background for table */
  border-radius: 1rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075); /* Keep specific shadow */
  padding: 1.5rem;
}

.table {
  margin-bottom: 0;
}

.table th {
  border-top: none;
  font-weight: 600;
  color: var(--bs-secondary);
  text-transform: uppercase;
  font-size: 0.875rem;
  padding: 1rem;
}

.table td {
  padding: 1rem;
  vertical-align: middle;
}

.rank-badge {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 0.875rem;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500); /* Keep specific gradient */
  box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3); /* Keep specific shadow */
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a9a9a9); /* Keep specific gradient */
  box-shadow: 0 2px 4px rgba(192, 192, 192, 0.3); /* Keep specific shadow */
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #8b4513); /* Keep specific gradient */
  box-shadow: 0 2px 4px rgba(205, 127, 50, 0.3); /* Keep specific shadow */
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
    gap: 0.25rem;
  }
  .role-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }
  .table th, .table td {
    padding: 0.75rem;
  }
}
</style>