<template>
  <div v-if="projects.length > 0" class="section-card shadow-sm rounded-4 animate-fade-in">
    <!-- Header -->
    <div class="section-header bg-info-subtle text-info-emphasis rounded-top-4 p-4 border-bottom">
      <div class="d-flex align-items-center justify-content-between">
        <div class="header-content d-flex align-items-center">
          <div class="header-icon me-3">
            <i class="fas fa-folder-open fa-lg"></i>
          </div>
          <div>
            <h5 class="section-title mb-1 fw-semibold">My Projects</h5>
            <p class="section-subtitle text-muted small mb-0">{{ projects.length }} project{{ projects.length === 1 ? '' : 's' }} submitted</p>
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
    <div v-if="loading" class="loading-section p-4 text-center">
      <div class="d-flex align-items-center justify-content-center">
        <div class="spinner-border spinner-border-sm text-info me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-secondary">Loading project details...</span>
      </div>
    </div>

    <!-- Projects List -->
    <div v-else class="projects-list">
      <div 
        v-for="(project, index) in projects" 
        :key="project.id" 
        class="project-item"
        :class="{ 'border-bottom': index < projects.length - 1 }"
      >
        <div class="project-content">
          <!-- Project Header -->
          <div class="project-header d-flex align-items-start justify-content-between mb-3">
            <div class="project-info flex-grow-1">
              <div class="d-flex align-items-center mb-2">
                <div class="project-icon me-3">
                  <i class="fas fa-code-branch text-info"></i>
                </div>
                <h6 class="project-title mb-0 fw-semibold text-dark">
                  {{ project.projectName || 'Unnamed Project' }}
                </h6>
              </div>
              
              <!-- Event Association -->
              <div v-if="project.eventId" class="event-association mb-2">
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
          <div v-if="project.description" class="project-description">
            <div class="description-container">
              <p class="description-text text-secondary mb-0">{{ project.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else-if="!loading && initialDataLoaded" class="section-card shadow-sm rounded-4 animate-fade-in">
    <div class="empty-state text-center p-5">
      <div class="empty-icon mb-4">
        <i class="fas fa-folder-plus fa-3x text-muted opacity-50"></i>
      </div>
      <h6 class="empty-title text-secondary fw-semibold mb-2">No Projects Yet</h6>
      <p class="empty-description text-muted mb-0">No projects have been submitted yet. Participate in events to showcase your work!</p>
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

<style scoped>
/* Section Header */
.section-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.header-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgba(var(--bs-info-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 1.25rem;
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
  padding: 1.5rem;
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
.project-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--bs-info-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.project-title {
  font-size: 1.1rem;
  line-height: 1.4;
  color: var(--bs-dark);
}

/* Event Association */
.event-association {
  margin-left: 3.5rem;
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
  margin-left: 3.5rem;
}

.description-container {
  background: var(--bs-light);
  border-radius: var(--bs-border-radius);
  padding: 0.875rem 1rem;
  border-left: 3px solid var(--bs-info);
}

.description-text {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--bs-secondary);
}

/* Empty State */
.empty-state {
  background: linear-gradient(135deg, var(--bs-light), rgba(var(--bs-info-rgb), 0.05));
}

.empty-icon {
  opacity: 0.6;
}

.empty-title {
  font-size: 1.1rem;
}

.empty-description {
  font-size: 0.95rem;
  line-height: 1.5;
  max-width: 400px;
  margin: 0 auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .section-header {
    padding: 1rem !important;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .header-icon {
    width: 2.5rem;
    height: 2.5rem;
    margin-right: 0.75rem !important;
  }
  
  .section-title {
    font-size: 1.1rem;
  }
  
  .project-item {
    padding: 1rem;
  }
  
  .project-header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 1rem;
  }
  
  .project-icon {
    width: 2rem;
    height: 2rem;
    margin-right: 0.75rem !important;
  }
  
  .project-title {
    font-size: 1rem;
  }
  
  .event-association {
    margin-left: 2.75rem;
  }
  
  .project-description {
    margin-left: 2.75rem;
  }
  
  .project-actions {
    width: 100%;
  }
  
  .project-link-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .section-header .d-flex {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 1rem;
  }
  
  .header-badge {
    align-self: flex-end;
  }
  
  .project-item {
    padding: 0.75rem;
  }
  
  .project-header .d-flex {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .project-icon {
    margin-right: 0 !important;
  }
  
  .event-association,
  .project-description {
    margin-left: 0;
    width: 100%;
  }
  
  .description-container {
    padding: 0.75rem;
  }
  
  .empty-state {
    padding: 2rem !important;
  }
  
  .empty-icon .fa-3x {
    font-size: 2rem !important;
  }
  
  .empty-description {
    font-size: 0.9rem;
  }
}
</style>
