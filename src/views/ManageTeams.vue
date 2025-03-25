// /src/views/ManageTeams.vue (Bootstrap styling, error handling)
<template>
    <div class="container">
      <h2>Manage Teams for Event: {{ eventId }}</h2>
        <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
      <form @submit.prevent="addTeam">
       <div class="mb-3">
        <label for="teamName" class="form-label">Team Name:</label>
        <input type="text" id="teamName" v-model="teamName" required class="form-control" />
       </div>

       <div class="mb-3">
        <label class="form-label">Select Students:</label>
        <div v-for="student in students" :key="student.uid" class="form-check">  <!-- Use UID -->
          <input
            type="checkbox"
            :id="student.uid"          <!-- Use UID -->
            :value="student.uid"        <!-- Use UID -->
            v-model="selectedStudents"
            class="form-check-input"
          />
          <label :for="student.uid" class="form-check-label">{{ student.name }} ({{ student.uid }})</label> <!-- Display UID -->
        </div>
       </div>


        <button type="submit" class="btn btn-primary">Add Team</button>
      </form>
    </div>
  </template>

  <script>
  import { ref, onMounted } from 'vue';
  import { useStore } from 'vuex';
  import { useRouter } from 'vue-router'; // Import useRouter
  import { collection, getDocs, query, where } from 'firebase/firestore';
  import { db } from '../firebase';

  export default {
    props: {
      eventId: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      const teamName = ref('');
      const selectedStudents = ref([]); // Store UIDs of selected students
      const students = ref([]);
      const errorMessage = ref('');
      const store = useStore();
      const router = useRouter(); // Use useRouter

      onMounted(async () => {
        // Fetch all students (users without a 'role' or with 'role' === 'Student')
        try {
          const q = query(collection(db, 'users')); // Query all users
          const querySnapshot = await getDocs(q);
          students.value = querySnapshot.docs.map((doc) => ({
            uid: doc.id, // Use UID as the key
            ...doc.data(),
          })).filter(user => !user.role || user.role === 'Student'); // Filter for students
        } catch (error) {
          console.error('Error fetching students:', error);
        }
      });

      const addTeam = async () => {
          errorMessage.value = '';
        try {
          if (!teamName.value.trim() || selectedStudents.value.length === 0) {
            errorMessage.value = 'Please enter a team name and select at least one student.';
            return;
          }

          await store.dispatch('events/addTeamToEvent', { //namespaced
            eventId: props.eventId,
            teamName: teamName.value,
            members: selectedStudents.value, // Array of UIDs
          });
          router.back(); // Navigate back
        } catch (error) {
            errorMessage.value = error.message || "Error occured on adding team";

        }
      };

      return {
        teamName,
        selectedStudents,
        students,
        addTeam,
        errorMessage
      };
    },
  };
  </script>