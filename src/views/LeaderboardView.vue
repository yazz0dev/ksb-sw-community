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

      <!-- Leaderboard Content -->
      <div v-else>
         <div v-if="filteredUsers.length === 0" class="empty-state">
            <i class="bi bi-emoji-neutral fs-1 mb-3"></i>
            <p>No users found for this role.</p>
        </div>
        <div v-else class="leaderboard-table">
          <table class="table">
            <thead>
              <tr>
                <th class="text-center">Rank</th>
                <th>Name</th>
                <th class="text-end">Experience Points</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(user, index) in filteredUsers" :key="user.uid">
                <td class="text-center">
                  <div v-if="index < 3" :class="['rank-badge', `rank-${index + 1}`]">
                    {{ index + 1 }}
                  </div>
                  <span v-else class="rank-number">{{ index + 1 }}</span>
                </td>
                <td>
                  <router-link :to="`/user/${user.uid}`" class="user-link">
                     {{ user.name }}
                  </router-link>
                </td>
                <td class="text-end">
                  <span class="xp-value">{{ user.displayXp }}</span>
                  <small class="text-secondary ms-1">XP</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { collection, getDocs, query, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { formatRoleName } from '../utils/formatters';

interface User {
    uid: string;
    name: string;
    role: string;
    xpByRole?: Record<string, number>;
}

// Function to convert display role name to xpByRole key
const getRoleKey = (roleName: string): string => {
  if (!roleName) return '';
  const lower = roleName.toLowerCase();
  if (lower === 'overall') return 'overall';
  const roleMap: Record<string, string> = {
    'fullstack': 'fullstack',
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
  'fullstack',
  'presenter',
  'designer',
  'organizer',
  'problemSolver'
]);

const selectedRole = ref<string>('Overall');
const users = ref<User[]>([]);
const loading = ref<boolean>(true);

onMounted(async () => {
    loading.value = true;
    try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        users.value = querySnapshot.docs
            .map((doc: QueryDocumentSnapshot) => ({
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

const selectRoleFilter = (role: string): void => {
  selectedRole.value = role;
};
</script>

<style scoped>
.leaderboard-section {
  background-color: #f8f9fa;
  background-image: radial-gradient(#e9ecef 1px, transparent 1px);
  background-size: 20px 20px;
  min-height: 100vh;
}

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
  background: white;
  border-radius: 1rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
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
  background: linear-gradient(135deg, #ffd700, #ffa500);
  box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a9a9a9);
  box-shadow: 0 2px 4px rgba(192, 192, 192, 0.3);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #8b4513);
  box-shadow: 0 2px 4px rgba(205, 127, 50, 0.3);
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

.user-link:hover {
  color: var(--bs-primary-dark);
}

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
  background: white;
  border-radius: 1rem;
  color: var(--bs-secondary);
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

