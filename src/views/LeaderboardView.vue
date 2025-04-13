<template>
  <section class="section">
    <div class="container is-max-desktop">
      <h1 class="title is-2 has-text-primary mb-5">Leaderboard</h1>
      
      <!-- Role Filter -->
      <div class="mb-6">
        <p class="label is-small has-text-grey mb-2">Filter by Role:</p>
        <div class="buttons">
          <button
            v-for="role in availableRoles"
            :key="role"
            @click="selectRoleFilter(role)"
            class="button is-small"
            :class="{ 
              'is-primary': selectedRole === role, 
              'is-light': selectedRole !== role 
            }"
          >
            {{ formatRoleName(role) }}
          </button>
        </div>
      </div>
    
      <!-- Loading State -->
      <div v-if="loading" class="has-text-centered py-6">
         <div class="loader is-loading is-large mx-auto mb-2" style="border-color: var(--color-primary); border-left-color: transparent;"></div>
      </div>

      <!-- Leaderboard Content -->
      <div v-else>
         <div v-if="filteredUsers.length === 0" class="notification is-info is-light has-text-centered">
            No users found for this role.
        </div>
        <table v-else class="table is-fullwidth is-hoverable is-striped">
          <thead>
            <tr>
              <th class="has-text-centered" style="width: 5%;">Rank</th>
              <th>Name</th>
              <th class="has-text-right">XP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in filteredUsers" :key="user.uid">
              <td class="has-text-centered has-text-weight-medium">{{ index + 1 }}</td>
              <td>
                <router-link :to="`/profile/${user.uid}`" class="has-text-link has-text-weight-medium">
                   {{ user.name }}
                </router-link>
              </td>
              <td class="has-text-right has-text-weight-semibold">{{ user.displayXp }}</td>
            </tr>
          </tbody>
        </table>
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
        // Filter out users with 0 XP AFTER calculating displayXp
        .filter(user => user.displayXp > 0)
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
/* Loader Styles */
.loader {
  border-radius: 50%;
  border-width: 2px;
  border-style: solid;
  width: 3em;
  height: 3em;
  animation: spinAround 1s infinite linear;
}
@keyframes spinAround {
  from { transform: rotate(0deg); }
  to { transform: rotate(359deg); }
}
.mx-auto { margin-left: auto; margin-right: auto; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-5 { margin-bottom: 1.25rem; }
.mb-6 { margin-bottom: 1.5rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }

/* Custom Table Styles (Optional) */
table {
    margin-top: 1.5rem;
}
</style>

