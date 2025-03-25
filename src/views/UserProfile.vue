// /src/views/UserProfile.vue (Bootstrap styling, error handling, cancel button)
<template>
    <div class="container">
      <h2>User Profile</h2>
      <div v-if="loading">Loading...</div>
      <div v-else-if="user">
        <p>Name: {{ user.name }}</p>
        <p>Register Number: {{ user.registerNumber }}</p>
        <p>Role: {{ user.role }}</p>
        <p>XP: {{ user.xp }}</p>

        <h3>Projects</h3>
        <div v-if="user.projects && user.projects.length > 0">
          <ul class="list-group">
            <li v-for="(project, index) in user.projects" :key="index"  class="list-group-item">
              {{ project.projectName }} -
              <a :href="project.githubLink" target="_blank">{{ project.githubLink }}</a>
              <p>{{ project.description }}</p>
              <button @click="editProject(index)" class="btn btn-warning btn-sm">Edit</button>
              <button @click="deleteProject(index)" class="btn btn-danger btn-sm">Delete</button>
            </li>
          </ul>
        </div>
        <div v-else>
          <p>No projects added yet.</p>
        </div>

        <!-- Add Project Form -->
         <h4>{{ editingIndex === null ? 'Add Project' : 'Edit Project' }}</h4>
         <div v-if="showProjectForm">
          <form @submit.prevent="editingIndex === null ? submitProject() : updateProject()">
            <div class="mb-3">
              <label for="projectName" class="form-label">Project Name:</label>
              <input type="text" id="projectName" v-model="currentProject.projectName" required  class="form-control"/>
            </div>
            <div class="mb-3">
              <label for="githubLink" class="form-label">GitHub Link:</label>
              <input type="url" id="githubLink" v-model="currentProject.githubLink" required  class="form-control"/>
            </div>
            <div class="mb-3">
              <label for="projectDescription" class="form-label">Description:</label>
              <textarea id="projectDescription" v-model="currentProject.description"  class="form-control"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">{{ editingIndex === null ? 'Add' : 'Update' }}</button>
             <button type="button" @click="cancelEdit" class="btn btn-secondary">Cancel</button>
          </form>
           <div v-if="projectMessage" :class="{'alert alert-success': !projectError, 'alert alert-danger': projectError }">
               {{projectMessage}}
           </div>
         </div>
           <button v-if="!showProjectForm" @click="addProject" class="btn btn-info">Add project</button>
      </div>
      <div v-else>
        <p>User not found.</p>
      </div>
    </div>
  </template>

  <script>
  import { computed, onMounted, ref } from 'vue';
  import { useStore } from 'vuex';
   import {doc, updateDoc} from 'firebase/firestore';
   import {db} from '../firebase';

  export default {
    setup() {
      const store = useStore();
      const loading = ref(true);
      const user = computed(()=> store.getters.getUser); // Access user data via getter
       const showProjectForm = ref(false);
       const currentProject = ref({ projectName: '', githubLink: '', description: '' });
       const editingIndex = ref(null); // null means adding, number is index of editing project
       const projectMessage = ref('');
       const projectError = ref(false);


      onMounted(async () => {
        // Data is already available in the Vuex store, so no need to fetch here.
        loading.value = false; // Data is loaded
      });

       const addProject = () => {
           showProjectForm.value = true;
           //Clear the form
           currentProject.value = { projectName: '', githubLink: '', description: '' };
           editingIndex.value = null; // Set to null for adding
       }

       const editProject = (index) => {
           showProjectForm.value = true;
           currentProject.value = { ...user.value.projects[index]}; //copy data
           editingIndex.value = index;
       }

       const cancelEdit = () => {
           showProjectForm.value = false;
           currentProject.value = { projectName: '', githubLink: '', description: '' };
           editingIndex.value = null;
           projectMessage.value = ''; // Clear any previous message
       }
       const updateProject = async () => {
           projectMessage.value = '';
           projectError.value = false;

           if(!currentProject.value.projectName || !currentProject.value.githubLink){
               projectMessage.value = 'Project Name and GitHub Link are required.';
               projectError.value = true;
               return;
           }

           const updatedProjects = [...user.value.projects]; // Copy
           updatedProjects[editingIndex.value] = { ...currentProject.value }; //update

           try{
               const userRef = doc(db, 'users', user.value.registerNumber);
               await updateDoc(userRef, {projects: updatedProjects});

               //Update store
               await store.dispatch('refreshUserData'); //refresh from firebase.
               showProjectForm.value = false;
               editingIndex.value = null;
                projectMessage.value = 'Project updated successfully!';
           }catch(error){
                projectMessage.value = `Error updating project: ${error.message}`;
               projectError.value = true;
               console.error("Error on updating projects", error);
           }
       }

       const deleteProject = async (index) => {
           projectMessage.value = '';
           projectError.value = false;
         if (confirm('Are you sure you want to delete this project?')) {
           const updatedProjects = [...user.value.projects];
           updatedProjects.splice(index, 1); // Remove the project at the given index

            try{
               const userRef = doc(db, 'users', user.value.registerNumber);
               await updateDoc(userRef, {projects: updatedProjects});

               //Update store
               await store.dispatch('refreshUserData'); //refresh from firebase.

               projectMessage.value = "Project deleted successfully!";

            }catch(error)
            {
               projectMessage.value = `Error deleting project: ${error.message}`;
               projectError.value = true;
               console.error("Error on deleting project: ", error);
            }
         }
       };


       //Submit
       const submitProject = async () => {
           projectMessage.value = ''; // Clear previous messages
           projectError.value = false;

            if(!currentProject.value.projectName || !currentProject.value.githubLink){
               projectMessage.value = 'Project Name and GitHub Link are required.';
               projectError.value = true;
               return;
           }

           const newProjects = user.value.projects ? [...user.value.projects] : []; // Handle null/undefined
             newProjects.push(currentProject.value);

           try{
               const userRef = doc(db, 'users', user.value.registerNumber);
               await updateDoc(userRef, { projects: newProjects});

               //Update store
               await store.dispatch('refreshUserData'); //refresh from firebase.

               showProjectForm.value = false; // Hide form after successful update
               projectMessage.value = "Project Added successfully!"

           }catch(error){
               projectMessage.value = `Error adding project: ${error.message}`;
               projectError.value = true;
               console.error('Error updating user projects:', error);
           }

       }

      return {
        user,
        loading,
        addProject,
        editProject,
        deleteProject,
        currentProject,
        editingIndex,
        submitProject,
        showProjectForm,
        updateProject,
        cancelEdit,
        projectMessage,
        projectError
      };
    },
  };
  </script>