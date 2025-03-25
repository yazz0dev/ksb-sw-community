<template>
    <div>
      <h2>Manage Teams for Event: {{ eventId }}</h2>
        <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
      <form @submit.prevent="addTeam">
        <label for="teamName">Team Name:</label>
        <input type="text" id="teamName" v-model="teamName" required />

        <label>Select Students:</label>
        <div v-for="student in students" :key="student.registerNumber">
          <input
            type="checkbox"
            :id="student.registerNumber"
            :value="student.registerNumber"
            v-model="selectedStudents"
          />
          <label :for="student.registerNumber">{{ student.name }} ({{ student.registerNumber }})</label>
        </div>

        <button type="submit">Add Team</button>
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
      const selectedStudents = ref([]);
      const students = ref([]);
      const errorMessage = ref('');
      const store = useStore();
      const router = useRouter(); // Use useRouter

      onMounted(async () => {
        // Fetch all students
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'Student'));
          const querySnapshot = await getDocs(q);
          students.value = querySnapshot.docs.map((doc) => ({
            registerNumber: doc.id,
            ...doc.data(),
          }));
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
          //Add team
          await store.dispatch('addTeamToEvent', {
            eventId: props.eventId,
            teamName: teamName.value,
            members: selectedStudents.value,
          });
          router.back(); // Navigate back after adding the team
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
<style scoped>
    .error{
        color:red;
    }
</style>