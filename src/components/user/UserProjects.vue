<template>
  <div v-if="projects.length > 0" class="section-card shadow-sm rounded-4 animate-fade-in">
    <!-- Header -->
    <div class="section-header bg-info-subtle text-info-emphasis rounded-top-4 p-3 border-bottom">
      <div class="d-flex align-items-center justify-content-between">
        <div class="header-content">
          <div class="header-icon bg-info-subtle">
            <i class="fas fa-folder-open"></i>
          </div>
          <div>
            <h5 class="section-title mb-0 text-info-emphasis">Projects</h5>
            <p class="d-none d-sm-block section-subtitle small mb-0">{{ projects.length }} project{{ projects.length === 1 ? '' : 's' }} submitted</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="badge bg-info text-white rounded-pill px-3 py-2">
            {{ projects.length }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-section">
      <div class="d-flex align-items-center justify-content-center">
        <div class="spinner-border spinner-border-sm text-info me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-secondary">Loading project details...</span>
      </div>
    </div>

    <!-- Projects List -->
    <div v-else class="item-list">
      <div 
        v-for="(project, index) in displayedProjects" 
        :key="project.id" 
        class="project-item"
        :class="{ 'border-bottom': index < displayedProjects.length - 1 }"
      >
        <div class="project-content">
          <!-- Project Header -->
          <div class="project-header d-flex align-items-start justify-content-between mb-2">
            <div class="project-info flex-grow-1">
              <div class="d-flex align-items-center mb-2">
                <div class="item-icon bg-info-subtle me-3">
                  <i class="fas fa-code-branch text-info"></i>
                </div>
                <h6 class="project-title mb-0 fw-semibold text-dark">
                  {{ project.projectName || 'Unnamed Project' }}
                </h6>
              </div>
              
              <!-- Event Association -->
              <div v-if="project.eventId" class="event-association mb-2 ms-sm-5">
                <div class="d-flex align-items-center text-muted small">
                  <i class="fas fa-calendar-alt me-2"></i>
                  <span class="me-1">Event:</span>
                  <router-link 
                    :to="{ name: 'EventDetails', params: { id: project.eventId } }" 
                    class="text-decoration-none event-link"
                  >
                    {{ project.eventName || `View Event (ID: ${project.eventId.substring(0,6)}...)` }}
                  </router-link>
                </div>
              </div>
            </div>
            
            <!-- Project Link Button -->
            <div v-if="project.link" class="project-actions">
              <a 
                :href="project.link" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="btn btn-sm btn-outline-info d-inline-flex align-items-center project-link-btn"
              >
                <i class="fas fa-external-link-alt me-2"></i>View Project
              </a>
            </div>
          </div>
          
          <!-- Project Description -->
          <div v-if="project.description" class="project-description ms-sm-5">
            <div class="description-container">
              <p class="description-text text-secondary mb-0">{{ project.description }}</p>
            </div>
          </div>
        </div>
      </div>
       <!-- Show More/Less Button -->
      <div v-if="hasMoreProjects" class="show-more-section text-center p-3 border-top">
        <button @click="toggleShowAll" class="btn btn-sm btn-outline-secondary">
          <span v-if="!showAll">
            Show all {{ projects.length }} projects <i class="fas fa-chevron-down ms-1"></i>
          </span>
          <span v-else>
            Show less <i class="fas fa-chevron-up ms-1"></i>
          </span>
        </button>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else-if="!loading && initialDataLoaded" class="section-card shadow-sm rounded-4 animate-fade-in">
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-folder-plus fa-3x text-muted opacity-50"></i>
      </div>
      <h6 class="empty-title">No Projects Yet</h6>
      <p class="empty-description">No projects have been submitted yet. Participate in events to showcase your work!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

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
const initialVisibleCount = 3;
const showAll = ref(false);

const displayedProjects = computed(() => {
    if (showAll.value || props.projects.length <= initialVisibleCount) {
        return props.projects;
    }
    return props.projects.slice(0, initialVisibleCount);
});

const hasMoreProjects = computed(() => props.projects.length > initialVisibleCount);

const toggleShowAll = () => {
  showAll.value = !showAll.value;
};
</script>

<style scoped>
/* Section Header */
.section-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.header-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(var(--bs-info-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--bs-info-emphasis);
}

.section-subtitle {
  color: var(--bs-secondary);
}

.header-badge .badge {
  font-size: 0.875rem;
  font-weight: 600;
}

/* Loading Section */
.loading-section {
  background: var(--bs-light);
  border-radius: 0 0 var(--bs-border-radius-lg) var(--bs-border-radius-lg);
}

/* Projects List */
.projects-list {
  padding: 0;
}

.project-item {
  padding: 1rem;
  transition: background-color 0.3s ease;
  position: relative;
}

.project-item:hover {
  background-color: var(--bs-light);
}

.project-item:last-child {
  border-radius: 0 0 var(--bs-border-radius-lg) var(--bs-border-radius-lg);
}

/* Project Content */
.item-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--bs-info-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.project-title {
  font-size: 1rem;
  line-height: 1.4;
  color: var(--bs-dark);
}

/* Event Association */
.event-association {
  margin-top: 1rem;
}

.event-link {
  color: var(--bs-info);
  font-weight: 500;
  transition: color 0.3s ease;
}

.event-link:hover {
  color: var(--bs-info-emphasis);
  text-decoration: underline !important;
}

/* Project Actions */
.project-link-btn {
  transition: all 0.3s ease;
  border-width: 1.5px;
  font-weight: 500;
}

.project-link-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow-sm);
}

/* Project Description */
.project-description {
  margin-top: 1rem;
}

.description-container {
  background: var(--bs-light);
  border-radius: var(--bs-border-radius);
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--bs-info);
}

.description-text {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--bs-secondary);
}

@media (max-width: 768px) {
  .project-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 1rem;
  }
  
  .project-actions {
    width: 100%;
  }
  
  .project-link-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
