<template>
    <div class="container mt-4">
        <h2 class="mb-3">Leaderboard</h2>
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
                    {{ formatRoleName(role) }} 
                </button>
            </div>
        </div>
  
        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        <div v-else-if="filteredUsers.length === 0" class="alert alert-info">No users found matching the criteria.</div>
         <ul v-else class="list-group">
            <li v-for="(user, index) in filteredUsers" :key="user.uid" class="list-group-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <span class="leaderboard-rank me-3">{{ index + 1 }}.</span>
                    
                    <router-link :to="{ name: 'PublicProfile', params: { userId: user.uid }}">
                         {{ user.name || 'Anonymous User' }} 
                    </router-link>
                </div>
                
                <span class="badge bg-primary rounded-pill fs-6"> 
                    {{ user.displayXp }} XP
                  </span>
            </li>
        </ul>
    </div>
  </template>
  
  <script setup> // Using setup script
  import { ref, computed, onMounted } from 'vue';
  import { collection, getDocs, query } from 'firebase/firestore';
  import { db } from '../firebase';
  
  // Function to convert display role name to xpByRole key
  const getRoleKey = (roleName) => {
    if (!roleName) return '';
    const lower = roleName.toLowerCase();
    if (lower === 'overall') return 'overall';
    if (lower === 'problem solver') return 'problemSolver';
    // Simple conversion (assumes single word roles or camelCase in xpByRole)
    return lower.charAt(0) + lower.slice(1).replace(/\s+/g, '');
  };
  
  // Helper to format role keys/names for display
  const formatRoleName = (roleKeyOrName) => {
      if (!roleKeyOrName) return '';
      // Handle potential keys or display names
      const name = roleKeyOrName
          .replace(/([A-Z])/g, ' $1') // Add space before capital letters
          .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
      // Special cases for display
      if (name === 'Xp By Role') return 'Overall';
      return name;
  };
  
  
  const availableRoles = ref([ // Use keys from xpByRole + 'Overall'
      'Overall', 'fullstack', 'presenter', 'designer', 'organizer', 'problemSolver'
  ]);
  const selectedRole = ref('Overall'); // Default filter
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
                  name: doc.data().name || 'Anonymous User', // Add fallback for missing names
                  role: doc.data().role || 'Student',
                  xpByRole: doc.data().xpByRole || {} // Ensure xpByRole exists
              }))
              .filter(user => user.role !== 'Admin'); // Filter out Admins
      } catch (error) {
          console.error("Error fetching leaderboard users:", error);
          users.value = []; // Set empty on error
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
                  // Calculate sum from the map for Overall
                  displayXp = Object.values(userXpMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
              } else {
                  // Get specific role XP using the calculated key
                  displayXp = Number(userXpMap[roleKey]) || 0; // Use Number() and default to 0
              }
              return { ...user, displayXp }; // Return user data with the calculated XP
          })
          // Filter out users with 0 XP for the selected category (optional)
          // .filter(user => user.displayXp > 0)
          .sort((a, b) => {
               // Primary sort: XP descending
               if (b.displayXp !== a.displayXp) {
                   return b.displayXp - a.displayXp;
               }
               // Secondary sort: Name ascending for ties
               return (a.name || a.uid || '').localeCompare(b.name || b.uid || '');
           });
  });
  
  const selectRoleFilter = (role) => {
      selectedRole.value = role;
  };
  
  </script>
  
  <style scoped>
  /* Link styling from main.css */
  /* .list-group-item a { ... } */
  
  .role-filter-container .overflow-x-auto {
      scrollbar-width: thin;
      scrollbar-color: var(--color-border) var(--color-background);
  }
  .role-filter-container .overflow-x-auto::-webkit-scrollbar { height: 6px; }
  .role-filter-container .overflow-x-auto::-webkit-scrollbar-track { background: var(--color-background); border-radius: 3px; }
  .role-filter-container .overflow-x-auto::-webkit-scrollbar-thumb { background-color: var(--color-border); border-radius: 3px; border: 1px solid var(--color-background); }
  .role-filter-container .overflow-x-auto::-webkit-scrollbar-thumb:hover { background-color: var(--color-text-muted); }
  
  .leaderboard-rank {
      font-weight: 600;
      color: var(--color-text-muted);
      min-width: 2.5ch; /* Ensure space for rank number */
      text-align: right;
  }
  .badge.fs-6 {
      font-size: 0.9rem !important; /* Adjust badge size */
      padding: 0.4em 0.7em;
  }
  </style>
