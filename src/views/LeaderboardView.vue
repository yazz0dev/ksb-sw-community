<template>
  <section class="py-5 leaderboard-section">
    <div class="container-lg">
      <h1 class="h1 text-primary mb-5">Leaderboard</h1>
      
      <!-- Role Filter -->
      <div class="mb-5">
        <label class="form-label small text-secondary mb-2">Filter by Role:</label>
        <div class="btn-group flex-wrap" role="group" aria-label="Role Filter">
          <button
            v-for="role in availableRoles"
            :key="role"
            @click="selectRoleFilter(role)"
            type="button"
            class="btn btn-sm"
            :class="{ 
              'btn-primary': selectedRole === role, 
              'btn-outline-primary': selectedRole !== role 
            }"
          >
            {{ formatRoleName(role) }}
          </button>
        </div>
      </div>
    
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
         <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
             <span class="visually-hidden">Loading...</span>
         </div>
         <p class="text-secondary mt-2">Loading...</p>
      </div>

      <!-- Leaderboard Content -->
      <div v-else>
         <div v-if="filteredUsers.length === 0" class="alert alert-info text-center" role="alert">
            No users found for this role.
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover table-striped align-middle">
            <thead>
              <tr>
                <th class="text-center" style="width: 5%;">Rank</th>
                <th>Name</th>
                <th class="text-end">XP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(user, index) in filteredUsers" :key="user.uid">
                <td class="text-center fw-medium">{{ index + 1 }}</td>
                <td>
                  <router-link :to="`/profile/${user.uid}`" class="text-primary fw-medium text-decoration-none">
                     {{ user.name }}
                  </router-link>
                </td>
                <td class="text-end fw-semibold">{{ user.displayXp }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { formatRoleName } from '../utils/formatters';
// Removed Chakra UI imports

// Function to convert display role name to xpByRole key
const getRoleKey = (roleName) => {
  if (!roleName) return '';
  const lower = roleName.toLowerCase();
  if (lower === 'overall') return 'overall';
  // Adjust key mapping based on your actual xpByRole field names
  const roleMap = {
      'fullstack': 'fullstack',
      'presenter': 'presenter',
      'designer': 'designer',
      'organizer': 'organizer',
      'problem solver': 'problemSolver',
       // Add more mappings if necessary
  };
  return roleMap[lower] || lower.replace(/\s+/g, ''); // Default conversion if not in map
};

// Use role keys consistent with getRoleKey logic and potential Firestore fields
const availableRoles = ref([
    'Overall', 'fullstack', 'presenter', 'designer', 'organizer', 'problemSolver' 
]);
const selectedRole = ref('Overall');
const users = ref([]);
const loading = ref(true);

onMounted(async () => {
    loading.value = true;
    try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        users.value = querySnapshot.docs
            .map(doc => ({
                uid: doc.id,
                name: doc.data().name || 'Anonymous User',
                role: doc.data().role || 'Student',
                xpByRole: doc.data().xpByRole || {} 
            }))
            .filter(user => user.role !== 'Admin');
    } catch (error) {
        console.error("Error fetching leaderboard users:", error);
        users.value = [];
    } finally {
        loading.value = false;
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

const selectRoleFilter = (role) => {
    selectedRole.value = role;
};
</script>

<style scoped>
.leaderboard-section {
  background-color: var(--bs-body-bg); /* Updated variable */
}

/* Loader Styles Removed */

/* Custom Table Styles Removed */
</style>

