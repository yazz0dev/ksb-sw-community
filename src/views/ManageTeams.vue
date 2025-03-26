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
            :id="student.uid"          
            :value="student.uid"        
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

<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const route = useRoute();
const router = useRouter();
const store = useStore();

// Get eventId from route params
const eventId = route.params.id;

const teamName = ref('');
const selectedStudents = ref([]);
const students = ref([]);
const errorMessage = ref('');

onMounted(async () => {
  try {
    const q = query(collection(db, 'users'));
    const querySnapshot = await getDocs(q);
    students.value = querySnapshot.docs
      .map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }))
      .filter(user => !user.role || user.role === 'Student');
  } catch (error) {
    console.error('Error fetching students:', error);
    errorMessage.value = 'Failed to load students';
  }
});

const addTeam = async () => {
  errorMessage.value = '';
  try {
    if (!teamName.value.trim() || selectedStudents.value.length === 0) {
      errorMessage.value = 'Please enter a team name and select at least one student.';
      return;
    }

    await store.dispatch('events/addTeamToEvent', {
      eventId,
      teamName: teamName.value,
      members: selectedStudents.value,
    });
    router.back();
  } catch (error) {
    errorMessage.value = error.message || "Error occurred while adding team";
  }
};
</script>