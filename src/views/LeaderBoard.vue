<template>
  <div class="container">
      <h2 class="mb-3">Leaderboard</h2>

      <!-- Role Filter Button Group -->
      <div class="mb-4 role-filter-container">
          <label class="form-label d-block mb-2">Filter by Role:</label>
          <div class="d-flex flex-nowrap overflow-x-auto pb-2">
              <button
                  v-for="role in availableRoles"
                  :key="role"
                  @click="selectRoleFilter(role)"
                  type="button"
                  class="btn btn-sm me-2 flex-shrink-0 text-nowrap"
                  :class="selectedRole === role ? 'btn-primary active' : 'btn-outline-secondary'"
              >
                  {{ role }}
              </button>
          </div>
      </div>

      <div v-if="loading" class="text-center">
          <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
          </div>
      </div>
      <div v-else-if="filteredUsers.length === 0" class="alert alert-info">No users found matching the criteria.</div>
      <ul v-else class="list-group">
          <li v-for="(user, index) in filteredUsers" :key="user.uid" class="list-group-item d-flex justify-content-between align-items-center">
              <span>
                  {{ index + 1 }}.
                  <!-- Link to public profile -->
                   <router-link :to="{ name: 'PublicProfile', params: { userId: user.uid }}">
                       {{ user.name }}
                   </router-link>
              </span>
              <!-- Display the calculated displayXp -->
              <span class="badge bg-primary rounded-pill">XP: {{ user.displayXp }}</span>
          </li>
      </ul>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, query } from 'firebase/firestore'; // Removed orderBy for client-side sort
import { db } from '../firebase';

// Function to convert display role name to xpByRole key
const getRoleKey = (roleName) => {
  if (!roleName) return '';
  const lower = roleName.toLowerCase();
  if (lower === 'overall') return 'overall'; // Special case
  if (lower === 'problem solver') return 'problemSolver';
  // Simple conversion for others (e.g., 'Fullstack' -> 'fullstack')
  return lower.charAt(0) + lower.slice(1).replace(/\s+/g, '');
};


export default {
  setup() {
      const availableRoles = ref([
          'Overall', 'Fullstack', 'Presenter', 'Designer', 'Organizer', 'Problem Solver'
      ]);
      const selectedRole = ref('Overall');
      const users = ref([]);
      const loading = ref(true);

      onMounted(async () => {
          loading.value = true;
          try {
              const q = query(collection(db, 'users'));
              const querySnapshot = await getDocs(q);
              // Filter out Admins immediately after fetching
              users.value = querySnapshot.docs
                  .map(doc => ({
                      uid: doc.id,
                      ...doc.data(),
                      role: doc.data().role || 'Student' // Ensure role default
                  }))
                  .filter(user => user.role !== 'Admin'); // <-- FILTER ADMINS HERE
          } catch (error) {
              console.error("Error fetching leaderboard users:", error);
          } finally {
              loading.value = false;
          }
      });

      const filteredUsers = computed(() => {
          const roleKey = getRoleKey(selectedRole.value);

          return users.value
              // Map users to include the XP relevant to the selected filter
              .map(user => {
                  let displayXp = 0;
                  const userXpMap = user.xpByRole || {}; // Ensure map exists

                  if (roleKey === 'overall') {
                      // Calculate sum from the map for Overall
                      displayXp = Object.values(userXpMap).reduce((sum, val) => sum + (val || 0), 0);
                  } else {
                      // Get specific role XP using the calculated key
                      displayXp = userXpMap[roleKey] ?? 0; // Use ?? 0 to handle missing keys
                  }
                  return { ...user, displayXp }; // Return user data with the calculated XP for sorting
              })
              // Sort based on the calculated displayXp
              .sort((a, b) => b.displayXp - a.displayXp);
      });

      const selectRoleFilter = (role) => {
          selectedRole.value = role;
      };

      return {
          availableRoles,
          selectedRole,
          filteredUsers,
          loading,
          selectRoleFilter,
      };
  },
};
</script>

<style scoped>
/* Styles remain the same */
.list-group-item a { text-decoration: none; color: var(--color-primary); font-weight: 500; }
.list-group-item a:hover { text-decoration: underline; color: var(--color-primary-hover); }
.role-filter-container .overflow-x-auto { scrollbar-width: thin; scrollbar-color: var(--color-border) var(--color-background); }
.role-filter-container .overflow-x-auto::-webkit-scrollbar { height: 8px; }
.role-filter-container .overflow-x-auto::-webkit-scrollbar-track { background: var(--color-background); border-radius: 4px; }
.role-filter-container .overflow-x-auto::-webkit-scrollbar-thumb { background-color: var(--color-border); border-radius: 4px; border: 2px solid var(--color-background); }
.role-filter-container .overflow-x-auto::-webkit-scrollbar-thumb:hover { background-color: var(--color-text-muted); }
.role-filter-container .btn { white-space: nowrap; }
</style>