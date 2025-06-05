<template>
  <div v-if="projects.length > 0" class="card shadow-sm">
    <div class="card-header">
      <h5 class="card-title mb-0"><i class="fas fa-folder-open text-primary me-2"></i>My Projects</h5>
    </div>
    <ul class="list-group list-group-flush">
      <li v-for="project in projects" :key="project.id" class="list-group-item px-3 py-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1">{{ project.projectName || 'Unnamed Project' }}</h6>
            <small v-if="project.eventId" class="text-muted d-block mb-1">
              <i class="fas fa-calendar-alt me-1"></i> Event: 
              <router-link :to="{ name: 'EventDetails', params: { id: project.eventId } }" class="text-decoration-none">
                {{ project.eventName || `View Event (ID: ${project.eventId.substring(0,6)}...)` }}
              </router-link>
            </small>
          </div>
          <a :href="project.link" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary mt-1" v-if="project.link">
            <i class="fas fa-external-link-alt me-1"></i> View Project
          </a>
        </div>
        <p v-if="project.description" class="small text-muted mt-2 mb-0">{{ project.description }}</p>
      </li>
    </ul>
    <div v-if="loading" class="card-footer text-center text-muted small">
      Loading project details...
    </div>
  </div>
  <div v-else-if="!loading && initialDataLoaded" class="card shadow-sm">
    <div class="card-body text-center text-muted">
      No projects submitted yet.
    </div>
  </div>
</template>

<script setup lang="ts">
interface UserProjectDisplay {
  id: string;
  projectName: string;
  link: string;
  description?: string | null;
  eventId?: string;
  eventName?: string;
  submittedAt?: any;
}

interface Props {
  projects: UserProjectDisplay[];
  loading: boolean;
  initialDataLoaded: boolean;
}

const props = defineProps<Props>();
</script>
