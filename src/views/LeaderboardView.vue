<template>
  <CBox maxW="4xl" mx="auto" p="6">
    <CHeading size="xl" color="text-primary" mb="5">Leaderboard</CHeading>
    
    <!-- Role Filter -->
    <CBox mb="6">
      <CText fontSize="sm" fontWeight="medium" color="text-secondary" mb="2">
        Filter by Role:
      </CText>
      <CButtonGroup spacing="2" overflowX="auto" pb="2">
        <CButton
          v-for="role in availableRoles"
          :key="role"
          onClick={() => selectRoleFilter(role)}
          size="sm"
          :variant="selectedRole === role ? 'solid' : 'outline'"
          :colorScheme="selectedRole === role ? 'primary' : 'gray'"
        >
          {{ formatRoleName(role) }}
        </CButton>
      </CButtonGroup>
    </CBox>
  
    <!-- Loading State -->
    <CFlex v-if="loading" justify="center" py="10">
      <CSpinner 
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="primary"
        size="xl"
      />
    </CFlex>

    <!-- Leaderboard Content -->
    <CBox v-else>
      <!-- Add your leaderboard content here using Chakra components -->
    </CBox>
  </CBox>
</template>

<script setup>
import {
  Box as CBox,
  Heading as CHeading,
  Text as CText,
  Button as CButton,
  ButtonGroup as CButtonGroup,
  Flex as CFlex,
  Spinner as CSpinner
} from '@chakra-ui/vue-next'

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
</script>

