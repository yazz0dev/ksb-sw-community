// /src/views/LeaderBoard.vue (Bootstrap styling)
<template>
    <div class="container">
      <h2>Leaderboard</h2>
      <div class="mb-3">
        <label for="roleFilter" class="form-label">Filter by Role:</label>
        <select id="roleFilter" v-model="selectedRole" class="form-select">
          <option value="Overall">Overall</option>
          <option value="Fullstack">Fullstack</option>
          <option value="Presenter">Presenter</option>
          <option value="Designer">Designer</option>
          <option value="Organizer">Organizer</option>
        </select>
      </div>
  
      <ul class="list-group">
        <li v-for="(user, index) in filteredUsers" :key="user.uid" class="list-group-item"> <!-- Use UID -->
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
        // Fetch users, ordered by XP
        const q = query(collection(db, 'users'), orderBy('xp', 'desc')); //order by xp
        const querySnapshot = await getDocs(q);
        users.value = querySnapshot.docs.map(doc => ({
          uid: doc.id, // Use UID
          ...doc.data(),
        })).filter(user => !user.role || user.role === 'Student'); //filter for students
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