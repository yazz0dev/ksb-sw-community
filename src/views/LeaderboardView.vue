<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Main container -->
        <h2 class="text-2xl font-bold text-text-primary mb-5">Leaderboard</h2>
        
        <!-- Role Filter -->
        <div class="mb-6">
            <label class="block text-sm font-medium text-text-secondary mb-2">Filter by Role:</label>
            <div class="flex space-x-2 overflow-x-auto pb-2 -mx-1 px-1"> <!-- Added padding/margin for scrollbar visibility -->
                <button
                    v-for="role in availableRoles"
                    :key="role"
                    @click="selectRoleFilter(role)"
                    type="button"
                    class="inline-flex items-center px-3 py-1 border rounded text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    :class="selectedRole === role ? 
                               'bg-primary text-primary-text border-transparent shadow-sm' : 
                               'bg-surface text-text-secondary border-border hover:bg-surface-hover'"
                >
                    {{ formatRoleName(role) }}
                </button>
            </div>
        </div>
  
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-10">
             <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="filteredUsers.length === 0" class="bg-info-light text-info-dark p-4 rounded-md text-sm">
            No users found matching the criteria.
        </div>
        
        <!-- Leaderboard List -->
         <ul v-else class="bg-surface shadow overflow-hidden sm:rounded-md divide-y divide-border">
            <li v-for="(user, index) in filteredUsers" :key="user.uid" 
                class="px-4 py-4 sm:px-6 flex justify-between items-center"
                :class="getPositionClass(index)">
                <div class="flex items-center min-w-0"> <!-- Added min-w-0 for truncation -->
                    <span 
                      class="text-sm font-semibold w-8 text-right mr-4 flex-shrink-0"
                      :class="getPositionTextClass(index)">
                      {{ index + 1 }}.
                    </span>
                    
                    <router-link 
                        :to="{ name: 'PublicProfile', params: { userId: user.uid }}"
                        class="text-sm font-medium hover:text-primary-dark truncate"
                        :class="getNameClass(index)">
                         {{ user.name || 'Anonymous User' }}
                    </router-link>
                </div>
                
                <span class="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium"
                      :class="getBadgeClass(index)"> 
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
  import { formatRoleName } from '../utils/formatters'; // Import shared formatter
  
  // Function to convert display role name to xpByRole key
  const getRoleKey = (roleName) => {
    if (!roleName) return '';
    const lower = roleName.toLowerCase();
    if (lower === 'overall') return 'overall';
    if (lower === 'problem solver') return 'problemSolver';
    // Simple conversion (assumes single word roles or camelCase in xpByRole)
    return lower.charAt(0) + lower.slice(1).replace(/\s+/g, '');
  };
  
  const availableRoles = ref([ // Use keys from xpByRole + 'Overall'
      'Overall', 'fullstack', 'presenter', 'designer', 'organizer', 'problemSolver'
      // Add other roles based on your actual data structure in Firestore xpByRole field
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

  const getPositionClass = (index) => {
    return {
      'bg-primary/10 border-l-4 border-primary': index === 0,
      'bg-secondary/10 border-l-4 border-secondary': index === 1,
      'bg-neutral/10 border-l-4 border-neutral': index === 2
    };
  };

  const getPositionTextClass = (index) => {
    return {
      'text-primary': index === 0,
      'text-secondary': index === 1,
      'text-neutral': index === 2,
      'text-text-disabled': index > 2
    };
  };

  const getNameClass = (index) => {
    return {
      'text-primary font-bold': index === 0,
      'text-secondary font-semibold': index === 1,
      'text-neutral font-semibold': index === 2,
      'text-primary': index > 2
    };
  };

  const getBadgeClass = (index) => {
    return {
      'bg-primary text-primary-text': index === 0,
      'bg-secondary text-text-primary': index === 1,
      'bg-neutral text-text-primary': index === 2,
      'bg-primary-light text-primary-dark': index > 2
    };
  };
  
  </script>

