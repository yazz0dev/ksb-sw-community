// /src/views/UserProfile.vue
<template>
    <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2>User Profile</h2>
           <PortfolioGeneratorButton v-if="user" :user="user" />
        </div>

      <div v-if="loading">Loading...</div>
      <div v-else-if="user">
          <div class="profile-section profile-info card card-body mb-4">
              <p><strong>Name:</strong> {{ user.name }}</p>
              <p><strong>UID:</strong> {{ user.uid }}</p>
              <p><strong>Role:</strong> {{ user.role }}</p>
              <p><strong>XP:</strong> {{ user.xp }}</p>
              <p v-if="user.skills?.length"><strong>Skills:</strong> {{ user.skills.join(', ') }}</p>
              <p v-if="user.preferredRoles?.length"><strong>Preferred Roles:</strong> {{ user.preferredRoles.join(', ') }}</p>
          </div>


          <div class="profile-section projects-section card mb-4">
              <div class="card-header d-flex justify-content-between align-items-center">
                 <h3>Projects</h3>
                 <button v-if="!showProjectForm" @click="addProject" class="btn btn-outline-primary btn-sm">Add Project</button>
              </div>
              <div class="card-body">
                 <div v-if="editingIndex !== null || showProjectForm">
                    <h4>{{ editingIndex === null ? 'Add Project' : 'Edit Project' }}</h4>
                    <form @submit.prevent="editingIndex === null ? submitProject() : updateProject()" class="mb-3 p-3 border rounded bg-light">
                      <div class="mb-3">
                        <label for="projectName" class="form-label">Project Name:</label>
                        <input type="text" id="projectName" v-model="currentProject.projectName" required class="form-control"/>
                      </div>
                      <div class="mb-3">
                        <label for="githubLink" class="form-label">GitHub Link:</label>
                        <input type="url" id="githubLink" v-model="currentProject.githubLink" required class="form-control"/>
                      </div>
                      <div class="mb-3">
                        <label for="projectDescription" class="form-label">Description:</label>
                        <textarea id="projectDescription" v-model="currentProject.description" class="form-control" rows="3"></textarea>
                      </div>
                      <button type="submit" class="btn btn-success btn-sm">{{ editingIndex === null ? 'Add' : 'Update' }}</button>
                      <button type="button" @click="cancelEdit" class="btn btn-secondary btn-sm ms-2">Cancel</button>
                    </form>
                     <div v-if="projectMessage" :class="['alert', projectError ? 'alert-danger' : 'alert-success', 'mt-3']">
                         {{ projectMessage }}
                     </div>
                 </div>

                  <div v-if="user.projects && user.projects.length > 0">
                    <ul class="list-group list-group-flush">
                      <li v-for="(project, index) in user.projects" :key="index" class="list-group-item d-flex justify-content-between align-items-start project-item">
                         <div class="flex-grow-1 me-3">
                            <strong>{{ project.projectName }}</strong>
                            <p class="mb-1 text-muted" v-if="project.description">{{ project.description }}</p>
                            <a :href="project.githubLink" target="_blank" rel="noopener noreferrer" class="small-link" v-if="project.githubLink">
                                <i class="fab fa-github"></i> GitHub Link
                            </a>
                          </div>
                          <div class="btn-group" role="group">
                            <button @click="editProject(index)" class="btn btn-outline-warning btn-sm">Edit</button>
                            <button @click="deleteProject(index)" class="btn btn-outline-danger btn-sm">Delete</button>
                          </div>
                      </li>
                    </ul>
                  </div>
                  <div v-else-if="!showProjectForm">
                    <p>No projects added yet.</p>
                  </div>
              </div>
          </div>


            <div class="profile-section requests-section card mb-4">
                 <div class="card-header">
                     <h3>My Event Requests</h3>
                 </div>
                 <div class="card-body">
                    <UserRequests />
                 </div>
            </div>
      </div>
      <div v-else>
        <p>User not found.</p>
      </div>
    </div>
  </template>

  <script setup>
  import { computed, onMounted, ref } from 'vue';
  import { useStore } from 'vuex';
  import { doc, updateDoc } from 'firebase/firestore';
  import { db } from '../firebase';
  import UserRequests from '../components/UserRequests.vue';
  import PortfolioGeneratorButton from '../components/PortfolioGeneratorButton.vue'; // Import the new component

  const store = useStore();
  const loading = ref(true);
  const user = computed(() => store.getters['user/getUser']);
  const showProjectForm = ref(false);
  const currentProject = ref({ projectName: '', githubLink: '', description: '' });
  const editingIndex = ref(null);
  const projectMessage = ref('');
  const projectError = ref(false);

  onMounted(() => {
      // Data is reactive via computed 'user', loading depends on store readiness
       if (user.value && user.value.uid) {
          loading.value = false;
       } else {
           // Optional: Wait a bit longer or handle case where user data isn't immediately available
           setTimeout(() => {
               if (user.value && user.value.uid) {
                   loading.value = false;
               } else {
                    // Still no user, might need error handling or redirect
                    console.warn("User data not available after delay.");
                    loading.value = false; // Stop loading state anyway
               }
           }, 1000);
       }
  });

  const addProject = () => {
      showProjectForm.value = true;
      currentProject.value = { projectName: '', githubLink: '', description: '' };
      editingIndex.value = null;
      projectMessage.value = '';
      projectError.value = false;
  };

  const editProject = (index) => {
      showProjectForm.value = true;
      currentProject.value = { ...user.value.projects[index] };
      editingIndex.value = index;
       projectMessage.value = '';
      projectError.value = false;
  };

  const cancelEdit = () => {
      showProjectForm.value = false;
      currentProject.value = { projectName: '', githubLink: '', description: '' };
      editingIndex.value = null;
      projectMessage.value = '';
  };

  const updateProject = async () => {
      projectMessage.value = '';
      projectError.value = false;

      if (!currentProject.value.projectName || !currentProject.value.githubLink) {
          projectMessage.value = 'Project Name and GitHub Link are required.';
          projectError.value = true;
          return;
      }

      // Ensure user and projects exist before proceeding
      if (!user.value?.uid || !Array.isArray(user.value.projects)) {
           projectMessage.value = 'User data is not available.';
           projectError.value = true;
           return;
      }

      const updatedProjects = [...user.value.projects];
      if (editingIndex.value === null || editingIndex.value >= updatedProjects.length) {
           projectMessage.value = 'Invalid project index for updating.';
           projectError.value = true;
           return;
      }
      updatedProjects[editingIndex.value] = { ...currentProject.value };

      try {
          const userRef = doc(db, 'users', user.value.uid);
          await updateDoc(userRef, { projects: updatedProjects });
          await store.dispatch('user/refreshUserData'); // Refresh store
          cancelEdit(); // Hide form and reset state
          projectMessage.value = 'Project updated successfully!';
      } catch (error) {
          projectMessage.value = `Error updating project: ${error.message}`;
          projectError.value = true;
          console.error("Error updating projects", error);
      }
  };

  const deleteProject = async (index) => {
      projectMessage.value = '';
      projectError.value = false;

      // Ensure user and projects exist
      if (!user.value?.uid || !Array.isArray(user.value.projects) || index >= user.value.projects.length) {
           projectMessage.value = 'Cannot delete project: Invalid data or index.';
           projectError.value = true;
           return;
      }

      if (confirm('Are you sure you want to delete this project?')) {
          const updatedProjects = [...user.value.projects];
          updatedProjects.splice(index, 1);

          try {
              const userRef = doc(db, 'users', user.value.uid);
              await updateDoc(userRef, { projects: updatedProjects });
              await store.dispatch('user/refreshUserData');
              projectMessage.value = "Project deleted successfully!";
              // If the deleted project was being edited, cancel edit mode
              if (editingIndex.value === index) {
                  cancelEdit();
              }
          } catch (error) {
              projectMessage.value = `Error deleting project: ${error.message}`;
              projectError.value = true;
              console.error("Error deleting project: ", error);
          }
      }
  };

  const submitProject = async () => {
      projectMessage.value = '';
      projectError.value = false;

      if (!currentProject.value.projectName || !currentProject.value.githubLink) {
          projectMessage.value = 'Project Name and GitHub Link are required.';
          projectError.value = true;
          return;
      }

       if (!user.value?.uid) {
           projectMessage.value = 'User data is not available.';
           projectError.value = true;
           return;
       }

      const newProjects = user.value.projects ? [...user.value.projects] : [];
      newProjects.push({ ...currentProject.value });

      try {
          const userRef = doc(db, 'users', user.value.uid);
          await updateDoc(userRef, { projects: newProjects });
          await store.dispatch('user/refreshUserData');
          cancelEdit(); // Hide form and reset
          projectMessage.value = "Project added successfully!";
      } catch (error) {
          projectMessage.value = `Error adding project: ${error.message}`;
          projectError.value = true;
          console.error('Error updating user projects:', error);
      }
  };
  </script>

  <style scoped>
    .profile-section {
        margin-bottom: var(--space-8);
        /* border-bottom: var(--border-width) solid var(--color-border); */ /* Use card border */
        /* padding-bottom: var(--space-6); */ /* Use card padding */
    }
     /* Removed last-child border rule as cards handle separation */

    .profile-info p {
        margin-bottom: var(--space-3);
        font-size: var(--font-size-base);
    }
    .profile-info p strong {
        color: var(--color-text);
        margin-right: var(--space-2);
        min-width: 120px; /* Align keys */
        display: inline-block;
    }

    .project-item {
        padding-top: var(--space-4);
        padding-bottom: var(--space-4);
    }

    .small-link {
        font-size: var(--font-size-sm);
        color: var(--color-primary);
        text-decoration: none;
    }
    .small-link:hover {
        text-decoration: underline;
    }
    .small-link i {
        margin-right: var(--space-1);
    }

    .requests-section .list-group-item {
        padding-left: 0;
        padding-right: 0;
    }
  </style>