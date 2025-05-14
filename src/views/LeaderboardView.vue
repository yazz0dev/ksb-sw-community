<!-- .\views\LeaderboardView.vue-->
<template>
  <section class="leaderboard-section">
    <div class="container-lg py-5">
      <h1 class="display-5 fw-bold text-primary mb-4">Leaderboard</h1>
      
      <!-- Role Filter -->
      <div class="filter-section mb-5">
        <label class="form-label text-secondary mb-3">Select Role</label>
        <div class="role-filter-group">
          <button
            v-for="role in availableRoles"
            :key="role"
            @click="selectRoleFilter(role)"
            type="button"
            class="role-btn"
            :class="{ active: selectedRole === role }"
          >
            {{ formatRoleName(role) }}
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
        <!-- Show message when no users are found -->
        <div v-if="!filteredUsers || filteredUsers.length === 0" class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          <span v-if="isFirstLoad">
            No users found for the leaderboard. This might be normal for a new application.
          </span>
          <span v-else>
            No users found for the selected role or leaderboard is empty.
          </span>
          <button @click="retryLoading" class="btn btn-sm btn-outline-primary ms-3">
            <i class="fas fa-sync-alt me-1"></i> Refresh
          </button>
        </div>
        
        <!-- Actual leaderboard table -->
        <div v-else>
          <!-- Add a summary text about the current view -->
          <p class="text-secondary mb-3">
            Showing {{ filteredUsers.length }} users ranked by {{ selectedRole === 'Overall' ? 'total' : selectedRole }} XP
          </p>
          
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
                    <span class="xp-value">{{ user.displayXp }}</span> XP
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
import { useUserStore } from '@/store/user';
import { formatRoleName } from '../utils/formatters';

interface User {
    uid: string;
    name: string | null; // Changed from 'string' to 'string | null' to match actual data
    photoURL?: string;
    xpByRole?: Record<string, number>;
    // Add any other potential fields from userStore if needed
    email?: string | null;
    bio?: string;
}

const defaultAvatarUrl: string = '/default-avatar.png';

const handleImageError = (event: Event) => {
  const imgElement = event.target as HTMLImageElement;
  if (imgElement) {
    imgElement.src = defaultAvatarUrl;
  }
};

// Function to convert display role name to xpByRole key
const getRoleKey = (roleName: string): string => {
  if (!roleName) return '';
  const lower = roleName.toLowerCase();
  if (lower === 'overall') return 'overall';
  const roleMap: Record<string, string> = {
    'developer': 'developer',
    'presenter': 'presenter',
    'designer': 'designer',
    'organizer': 'organizer',
    'problem solver': 'problemSolver'
  };
  return roleMap[lower] || lower.replace(/\s+/g, '');
};

// Define available roles
const availableRoles = ref<string[]>([
  'Overall',
  'developer',
  'presenter',
  'designer',
  'organizer',
  'problemSolver'
]);

const selectedRole = ref<string>('Overall');
const users = ref<User[]>([]);
const loading = ref<boolean>(true); // Start with loading true
const error = ref<string | null>(null);
const retryCount = ref<number>(0);
const MAX_RETRIES = 3;
const isFirstLoad = ref<boolean>(true);

const userStore = useUserStore();

// Watch the store's loading state and update local loading state accordingly
watch(() => userStore.loading, (storeLoading) => {
  // If the store is loading, ensure our component shows loading
  // This might be too simplistic if multiple operations can set userStore.loading
  loading.value = storeLoading;
});

// Watch for errors in the store
watch(() => userStore.error, (storeError) => {
  // This will react to any error set in the userStore.
  // We need to be careful if an "error" is just an informational message (e.g. "collection empty")
  if (storeError) {
    const errorMessage = typeof storeError === 'string' ? storeError : 
                (storeError instanceof Error ? storeError.message : 'Unknown error occurred');
    
    // Avoid overwriting a more specific error from retryLoading or onMounted
    if (error.value && error.value.startsWith("Failed after")) return;

    // Filter out messages that are not actual errors for the leaderboard view
    if (errorMessage.includes('No users found in the database') ||
        errorMessage.includes('collection might be empty')) {
        // This is an informational "error" from fetchAllUsers if the collection is empty.
        // LeaderboardView handles this by showing "No users found..."
        // So, we don't set the component's `error.value` for this case.
        // `users.value` will be empty, and the template will show the correct message.
        if(users.value.length === 0 && !loading.value){ // ensure users is also empty
             // error.value = null; // Let the template handle empty state
        }
    } else {
        error.value = errorMessage;
    }
  } else {
    // If store error is cleared, clear local error too, unless it's a retry error
     if (!(error.value && error.value.startsWith("Failed after"))) {
        error.value = null;
     }
  }
});

const retryLoading = async () => {
  if (retryCount.value >= MAX_RETRIES) {
    error.value = `Failed after ${MAX_RETRIES} attempts. Please refresh the page or try again later.`;
    loading.value = false; // Stop loading on max retries
    return;
  }
  
  error.value = null;
  loading.value = true;
  retryCount.value++;
  isFirstLoad.value = false; // It's no longer the first load attempt
  
  try {
    await userStore.fetchLeaderboardUsers(); // This action now has more logging
    
    // After the fetch, update local state based on the store
    users.value = userStore.leaderboardUsers.map(u => ({
      ...u,
      photoURL: u.photoURL === null ? undefined : u.photoURL
    }));
    
    // Handle error state from the store specifically after this operation
    if (userStore.error) {
        const storeErrorMessage = userStore.error instanceof Error ? userStore.error.message : String(userStore.error);
        // Only set local error if it's a "real" error, not an "empty collection" message
        if (!storeErrorMessage.includes('No users found in the database') && !storeErrorMessage.includes('collection might be empty')) {
            error.value = storeErrorMessage;
        } else {
            error.value = null; // Clear local error if it's just an info/empty message from store
        }
    } else {
        error.value = null; // Clear local error if store has no error
    }

  } catch (err: any) { // Catch errors from the action call itself, though store actions usually handle their own errors
    console.error("LeaderboardView: Error during retryLoading's call to fetchLeaderboardUsers:", err);
    error.value = err.message || 'Failed to fetch leaderboard data on retry';
    users.value = []; // Ensure users are empty on error
  } finally {
    loading.value = userStore.loading; // Reflect store's loading state
  }
};

onMounted(async () => {
    console.log("LeaderboardView: onMounted started.");
    loading.value = true; 
    error.value = null;
    isFirstLoad.value = true;
    retryCount.value = 0; // Reset retry count on new mount
    
    try {
        // No need to check for cached leaderboardUsers here, let fetchLeaderboardUsers handle logic
        // including its call to fetchAllUsers which has its own caching.
        console.log("LeaderboardView: Calling fetchLeaderboardUsers from onMounted.");
        await userStore.fetchLeaderboardUsers();
        
        // After the fetch, update local state based on the store
        users.value = userStore.leaderboardUsers.map(u => ({
          ...u,
          photoURL: u.photoURL === null ? undefined : u.photoURL
        }));
        console.log(`LeaderboardView: onMounted fetch complete. Users count: ${users.value.length}, Store error: ${userStore.error}`);
        
        // Handle error state from the store specifically after this operation
        if (userStore.error) {
            const storeErrorMessage = userStore.error instanceof Error ? userStore.error.message : String(userStore.error);
            // Only set local error if it's a "real" error
            if (!storeErrorMessage.includes('No users found in the database') && !storeErrorMessage.includes('collection might be empty')) {
                error.value = storeErrorMessage;
            } else {
                 error.value = null; // It's an "empty" message, not an error for the view itself
            }
        } else {
            error.value = null; // Clear local error if store has no error
        }

    } catch (err: any) { // Catch errors from the action call itself
        console.error("LeaderboardView: Critical error during onMounted's call to fetchLeaderboardUsers:", err);
        error.value = err.message || "An unexpected error occurred while loading the leaderboard.";
        users.value = [];
    } finally {
        loading.value = userStore.loading; // Reflect store's loading state
        isFirstLoad.value = false; // Initial load attempt is complete
        console.log(`LeaderboardView: onMounted finished. Loading: ${loading.value}, Error: ${error.value}`);
    }
});

const filteredUsers = computed(() => {
    const roleKey = getRoleKey(selectedRole.value);
    
    return users.value
        .map(user => {
            let displayXp = 0;
            const userXpMap = user.xpByRole || {};

            if (roleKey === 'overall') {
                displayXp = Object.values(userXpMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
            } else {
                displayXp = Number(userXpMap[roleKey]) || 0;
            }
            return { ...user, displayXp };
        })
        .sort((a, b) => {
            if (b.displayXp !== a.displayXp) {
                return b.displayXp - a.displayXp;
            }
            // Handle potential null name values in comparison
            return ((a.name || a.uid) || '').localeCompare((b.name || b.uid) || '');
        });
});

const selectRoleFilter = (role: string): void => {
  selectedRole.value = role;
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

/* .user-link:hover removed - handled by global utility */
.xp-value {
  font-weight: 600;
  font-size: 1.1rem;
}

.loader-container {
  text-align: center;
  padding: 3rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white; /* Keep white background */
  border-radius: 1rem;
  color: var(--bs-secondary);
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