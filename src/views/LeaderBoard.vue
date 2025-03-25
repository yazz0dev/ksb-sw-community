<template>
    <div>
      <h2>Leaderboard</h2>
      <div>
        <label for="roleFilter">Filter by Role:</label>
        <select id="roleFilter" v-model="selectedRole">
          <option value="Overall">Overall</option>
          <option value="Fullstack">Fullstack</option>
          <option value="Presenter">Presenter</option>
          <option value="Designer">Designer</option>
          <option value="Organizer">Organizer</option>
        </select>
      </div>
  
      <ul>
        <li v-for="(user, index) in filteredUsers" :key="user.registerNumber">
          {{ index + 1 }}. {{ user.name }} - XP: {{ user.xp }}
        </li>
      </ul>
    </div>
  </template>
  
  <script>
  import { ref, computed, onMounted } from 'vue';
  import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
  import { db } from '../firebase';
  
  export default {
    setup() {
      const selectedRole = ref('Overall');
      const users = ref([]);
  
      onMounted(async () => {
        // Fetch users with role 'Student', ordered by XP
        const q = query(collection(db, 'users'), where('role', '==', 'Student'), orderBy('xp', 'desc'));
        const querySnapshot = await getDocs(q);
        users.value = querySnapshot.docs.map(doc => ({
          registerNumber: doc.id,
          ...doc.data(),
        }));
      });
  
      const filteredUsers = computed(() => {
        if (selectedRole.value === 'Overall') {
          return users.value;
        } else {
            // Filter by selected role (case-insensitive).
            return users.value.filter((user) =>
              user.preferredRoles?.map(role => role.toLowerCase()).includes(selectedRole.value.toLowerCase())
            );
        }
      });
  
      return {
        selectedRole,
        filteredUsers,
      };
    },
  };
  </script>