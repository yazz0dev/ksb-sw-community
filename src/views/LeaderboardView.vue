 <!-- .\views\LeaderboardView.vue-->
<template>
  <section class="leaderboard-section">
    <div class="container-lg py-4 py-lg-5">
      <h1 class="display-5 fw-bold text-primary mb-3 text-center">Leaderboard</h1>
      
      <!-- Role Filter -->
      <div class="filter-section mb-4">
        <label class="form-label text-secondary mb-2 fw-medium text-center text-md-start">Select Role</label>
        <div class="role-filter-group d-flex flex-wrap justify-content-center justify-content-md-start">
          <button
            v-for="role in availableRoles"
            :key="role"
            @click="selectRoleFilter(role)"
            type="button"
            class="role-btn btn"
            :class="{ 'active btn-primary': selectedRole === role, 'btn-outline-primary': selectedRole !== role }"
          >
            {{ formatRoleName(role) }}
          </button>
        </div>
      </div>
    
      <!-- Loading State -->
      <div v-if="loading" class="loader-container text-center py-5">
         <div class="spinner-border text-primary spinner-lg" role="status">
             <span class="visually-hidden">Loading...</span>
         </div>
         <p class="text-secondary mt-3 fs-5">Loading leaderboard...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger d-flex flex-column align-items-center text-center shadow-sm p-4">
        <i class="fas fa-exclamation-triangle fa-2x me-2 mb-2"></i>
        <strong class="mb-2">Error loading leaderboard:</strong> 
        <p class="mb-3">{{ error }}</p>
        <button @click="retryLoading" class="btn btn-danger">
          <i class="fas fa-sync-alt me-1"></i> Retry
        </button>
      </div>

      <!-- Leaderboard Content -->
      <div v-else>
        <div v-if="!filteredUsers || filteredUsers.length === 0" class="alert alert-info d-flex flex-column align-items-center text-center shadow-sm p-4">
          <i class="fas fa-info-circle fa-2x me-2 mb-2"></i>
          <span v-if="isFirstLoad" class="mb-3">
            No users found for the leaderboard. This might be a fresh start!
          </span>
          <span v-else class="mb-3">
            No users found for the selected role, or the leaderboard is currently empty.
          </span>
          <button @click="retryLoading" class="btn btn-primary">
            <i class="fas fa-sync-alt me-1"></i> Refresh
          </button>
        </div>

        <div v-if="filteredUsers && filteredUsers.length > 0" class="leaderboard-table-container centered-leaderboard">
          <div class="table-responsive shadow-sm">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th scope="col" class="text-center">Rank</th>
                  <th scope="col">User</th>
                  <th scope="col" class="text-end">XP Points</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(user, index) in filteredUsers" :key="user.uid" class="leaderboard-row">
                  <td class="text-center">
                    <div v-if="index < 3" :class="`rank-badge rank-${index + 1} shadow-sm`">{{ index + 1 }}</div>
                    <span v-else class="rank-number text-secondary">{{ index + 1 }}</span>
                  </td>
                  <td>
                    <div class="d-flex align-items-center py-1">
                      <img 
                        :src="user.photoURL || defaultAvatarUrl" 
                        @error="handleImageError"
                        class="leaderboard-avatar me-2 shadow-sm" 
                        alt="User avatar"
                      />
                      <router-link :to="`/user/${user.uid}`" class="user-link fw-medium">
                        {{ user.name || `User ${user.uid.substring(0, 5)}...` }}
                      </router-link>
                    </div>
                  </td>
                  <td class="text-end">
                    <span class="xp-value fw-bold text-primary">{{ user.displayXp }}</span>
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
    name: string;
    photoURL?: string; // Added
    xpByRole?: Record<string, number>;
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
    // Clear any existing users in the store to force a fresh fetch by fetchLeaderboardUsers
    // userStore.leaderboardUsers = []; // fetchLeaderboardUsers will populate this
    // userStore.allUsers = []; // fetchAllUsers (called by fetchLeaderboardUsers) will populate this
                             // Clearing allUsers here ensures fetchAllUsers doesn't use its cache.
    
    await userStore.fetchLeaderboardUsers(); // This action now has more logging
    
    // After the fetch, update local state based on the store
    users.value = userStore.leaderboardUsers;
    
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
        users.value = userStore.leaderboardUsers;
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
            return (a.name || a.uid || '').localeCompare(b.name || b.uid || '');
        });
});

const selectRoleFilter = (role: string): void => {
  selectedRole.value = role;
};
</script>

<style scoped>
.leaderboard-section {
  background-color: var(--bs-light);
  min-height: calc(100vh - var(--navbar-height-desktop, 4.5rem)); /* Adjust if navbar height var exists */
  padding-top: 1rem; /* Add a bit of spacing at the top */
}

.filter-section .form-label {
  font-size: 1.1rem;
}

.role-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem; /* Reduced gap for potentially more buttons */
}

.role-btn {
  /* Using Bootstrap button classes for base styling, customizing here */
  padding: 0.5rem 1rem;
  border-radius: var(--bs-border-radius-pill);
  transition: all 0.2s ease;
  font-weight: 500;
  /* No specific border needed if using btn-outline-primary */
}

/* Ensure active state is visually distinct, Bootstrap's .btn-primary.active should handle most of this */
.role-btn.active {
  /* color: var(--bs-white); already handled by .btn-primary */
  /* background-color: var(--bs-primary); already handled by .btn-primary */
  box-shadow: var(--bs-box-shadow-sm);
}

.leaderboard-table-container {
  background: var(--bs-card-bg, white);
  border-radius: var(--bs-border-radius-lg);
  /* Padding is removed here, handled by table-responsive or table itself if needed */
  overflow: hidden; /* Ensures border-radius is respected by table */
  width: 100%; /* Ensure full width on all devices */
}

.centered-leaderboard {
  max-width: 960px; /* Changed from 1140px to match .container-lg or be narrower */
  margin-left: auto;
  margin-right: auto;
}

.table {
  margin-bottom: 0; /* Remove default table margin */
  width: 100%; /* Ensure table takes full width of container */
}

.table th {
  /* background-color: var(--bs-gray-100); */ /* Using table-light class instead */
  color: var(--bs-dark);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  padding: 1rem 1.5rem; /* Increased base padding */
  border-top: none;
  border-bottom: 2px solid var(--bs-border-color);
}

.table td {
  padding: 1rem 1.5rem; /* Increased base padding, consistent padding */
  vertical-align: middle;
}

.rank-badge {
  width: 2.5rem; /* Slightly larger base */
  height: 2.5rem; /* Slightly larger base */
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1rem; /* Adjusted for new size */
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #f0c000); /* Gold */
  border: 2px solid #e6b800;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #adadad); /* Silver */
  border: 2px solid #a0a0a0;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b8732d); /* Bronze */
  border: 2px solid #a5672a;
}

.rank-number {
  font-weight: 500;
  font-size: 1rem;
}

.leaderboard-avatar {
  width: 44px; /* Larger base avatar */
  height: 44px; /* Larger base avatar */
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--bs-border-color-translucent);
}

.user-link {
  color: var(--bs-primary-text-emphasis); /* More emphasis */
  text-decoration: none;
  /* font-weight: 500; from utility */
  transition: color 0.2s ease;
}

.user-link:hover {
  color: var(--bs-primary); /* Standard primary hover */
  text-decoration: underline;
}

.xp-value {
  font-size: 1.1rem;
  /* color: var(--bs-primary); from utility */
}

.loader-container .spinner-lg {
  width: 3rem;
  height: 3rem;
}

.alert { /* Styling for error/info alerts */
  border-width: 0;
  border-left: 5px solid;
}
.alert-danger {
  border-left-color: var(--bs-danger);
}
.alert-info {
  border-left-color: var(--bs-info);
}


@media (max-width: 991.98px) { /* Medium devices (tablets, less than 992px) */
  .filter-section .form-label {
    font-size: 1rem;
  }
  .role-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
  .table th {
    font-size: 0.75rem;
    padding: 0.8rem 1.2rem; /* Adjusted responsive padding */
  }
  .table td {
    padding: 0.8rem 1.2rem; /* Adjusted responsive padding */
  }
  .leaderboard-avatar {
    width: 36px;
    height: 36px;
  }
  .xp-value {
    font-size: 1rem;
  }
  .rank-badge {
    width: 2rem; /* Kept as is, good relative to new base */
    height: 2rem;
    font-size: 0.8rem; /* Kept as is */
  }
}

@media (max-width: 767.98px) { /* Small devices (landscape phones, less than 768px) */
  .container-lg {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  h1.display-5 {
    font-size: 1.75rem; /* Bootstrap's h2 size */
    margin-bottom: 1rem !important;
  }
  .role-filter-group {
    gap: 0.375rem;
  }
  .role-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.85rem;
  }
  .table-responsive {
    width: 100%; /* Ensure full width */
    border: 0; /* Remove borders */
  }
  .table th, .table td {
    padding: 0.6rem 0.9rem; /* Adjusted responsive padding */
    font-size: 0.85rem; /* Slightly larger font for better readability */
  }
  .leaderboard-avatar {
    width: 32px;
    height: 32px;
    margin-right: 0.5rem !important; /* Reduce margin */
  }
  .user-link {
    font-size: 0.9rem;
  }
  .xp-value {
    font-size: 0.95rem;
  }
  .rank-badge {
    width: 1.75rem; /* Kept as is */
    height: 1.75rem;
    font-size: 0.75rem; /* Kept as is */
  }
}

@media (max-width: 575.98px) { /* Extra small devices (portrait phones, less than 576px) */
  .filter-section {
    margin-bottom: 1rem !important; /* Tighter spacing */
  }
  .leaderboard-table-container {
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    width: calc(100% + 1rem); /* Expand table container slightly beyond container-lg padding */
    border-radius: 0; /* Remove border radius on smallest screens for full-width look */
  }
  .table-responsive {
    border-radius: 0;
  }
  .role-btn {
    flex-grow: 1; /* Allow buttons to grow and wrap better */
    font-size: 0.8rem;
  }
  .table th {
    font-size: 0.75rem; /* Slightly larger for better readability */
    padding: 0.75rem; /* More consistent padding */
  }
  .table td {
     font-size: 0.8rem; /* Slightly larger for better readability */
     padding: 0.75rem; /* More consistent padding */
  }
  .user-link {
    font-size: 0.85rem;
  }
   .leaderboard-avatar {
    width: 30px;
    height: 30px;
  }
}
</style>