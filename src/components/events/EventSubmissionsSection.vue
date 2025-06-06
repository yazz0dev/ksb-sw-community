<!-- src/components/events/EventSubmissionsSection.vue -->
<template>
  <div class="card submissions-card shadow-sm animate-fade-in">
    <div class="card-header bg-info-subtle border-0">
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <i class="fas fa-code-branch text-info me-2 fs-5"></i>
          <h5 class="mb-0 fw-semibold text-info-emphasis">Project Submissions</h5>
        </div>
        <button v-if="canSubmitProject" class="btn btn-info btn-sm" @click="openSubmissionModal">
          <i class="fas fa-plus me-1"></i>Submit
        </button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="loading" class="loading-state">
        <div class="spinner-border spinner-border-sm text-info me-2" role="status" aria-hidden="true"></div>
        <span class="text-secondary">Loading submissions...</span>
      </div>
      <template v-else>
        <!-- If no submissions at all for the event -->
        <div v-if="!event.submissions || event.submissions.length === 0" class="empty-state">
          <i class="fas fa-code-branch text-muted fs-1 mb-3"></i>
          <h6 class="text-secondary mb-2">No Submissions Yet</h6>
          <p class="text-muted small mb-0">Be the first to submit your project for this event!</p>
        </div>

        <!-- Team Event: Group submissions by team -->
        <template v-else-if="event.details.format === 'Team'">
          <div v-for="team in teams" :key="team.id || team.teamName" class="team-section">
            <div class="team-header">
              <h6 class="team-name">
                <i class="fas fa-users text-primary me-2"></i>
                {{ team.teamName }}
              </h6>
            </div>
            <!-- Filter submissions for the current team -->
            <div v-if="getTeamSubmissions(team.teamName).length > 0" class="submissions-list">
              <div v-for="submission in getTeamSubmissions(team.teamName)" 
                   :key="submission.submittedBy + '-' + submission.projectName" 
                   class="submission-item">
                <div class="submission-content">
                  <div class="submission-header">
                    <a :href="submission.link" target="_blank" rel="noopener noreferrer" 
                       class="submission-link">
                      <i class="fas fa-external-link-alt me-2 text-info"></i>
                      {{ submission.projectName }}
                    </a>
                    <span class="submission-author">by {{ getUserName(submission.submittedBy) }}</span>
                  </div>
                  <p v-if="submission.description" class="submission-description">
                    {{ submission.description }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="no-submissions">
              <i class="fas fa-info-circle text-muted me-1"></i>
              <span class="text-muted fst-italic">No submissions from this team yet.</span>
            </div>
          </div>
        </template>

        <!-- Individual/Competition Event: List all submissions directly -->
        <template v-else>
          <div class="submissions-list">
            <div v-for="submission in event.submissions" 
                 :key="submission.submittedBy + '-' + submission.projectName" 
                 class="submission-item">
              <div class="submission-content">
                <div class="submission-header">
                  <a :href="submission.link" target="_blank" rel="noopener noreferrer" 
                     class="submission-link">
                    <i class="fas fa-external-link-alt me-2 text-info"></i>
                    {{ submission.projectName }}
                  </a>
                  <span class="submission-author">by {{ getUserName(submission.submittedBy) }}</span>
                </div>
                <p v-if="submission.description" class="submission-description">
                  {{ submission.description }}
                </p>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Submission Modal -->
    <div
      class="modal fade"
      id="submissionModal"
      tabindex="-1"
      aria-labelledby="submissionModalLabel"
      aria-hidden="true"
      ref="submissionModalRef"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content rounded-4 shadow-lg border-0">
          <div class="modal-header border-0 pb-2">
            <h5 class="modal-title h5 fw-semibold text-dark" id="submissionModalLabel">
              <i class="fas fa-code-branch text-info me-2"></i>Submit Your Project
            </h5>
            <button type="button" class="btn-close btn-close-lg" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body py-3">
            <form @submit.prevent="handleSubmitProject">
              <div class="mb-4">
                <label for="projectName" class="form-label fw-medium">
                  <i class="fas fa-tag text-primary me-1"></i>
                  Project Name 
                  <span class="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  id="projectName" 
                  v-model="submissionForm.projectName" 
                  required 
                  class="form-control"
                  placeholder="Enter your project name"
                >
              </div>
              <div class="mb-4">
                <label for="projectLink" class="form-label fw-medium">
                  <i class="fas fa-link text-primary me-1"></i>
                  Project Link 
                  <span class="text-danger">*</span>
                </label>
                <input 
                  type="url" 
                  id="projectLink" 
                  v-model="submissionForm.link" 
                  required 
                  placeholder="https://github.com/username/project or https://demo.example.com" 
                  class="form-control"
                >
                <div class="form-text">
                  <i class="fas fa-info-circle text-info me-1"></i>
                  Provide a link to your GitHub repository, demo, or project documentation.
                </div>
              </div>
              <div class="mb-4">
                <label for="projectDescription" class="form-label fw-medium">
                  <i class="fas fa-file-alt text-primary me-1"></i>
                  Brief Description
                </label>
                <textarea 
                  id="projectDescription" 
                  v-model="submissionForm.description" 
                  rows="4" 
                  class="form-control"
                  placeholder="Describe what your project does, technologies used, and any key features..."
                ></textarea>
              </div>
              <div v-if="submissionError" class="alert alert-danger d-flex align-items-start">
                <i class="fas fa-exclamation-triangle text-danger me-2 mt-1 flex-shrink-0"></i>
                <div>{{ submissionError }}</div>
              </div>
            </form>
          </div>
          <div class="modal-footer border-0 pt-2 gap-2">
            <button type="button" class="btn btn-secondary btn-modal" data-bs-dismiss="modal">
              Cancel
            </button>
            <button
              type="button"
              @click="handleSubmitProject"
              :disabled="isSubmittingProject"
              class="btn btn-info btn-modal"
            >
              <span v-if="isSubmittingProject" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <i v-else class="fas fa-paper-plane me-2"></i>
              {{ isSubmittingProject ? 'Submitting...' : 'Submit Project' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Event, Team, Submission } from '@/types/event';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useEvents } from '@/composables/useEvents';

// Add submission form interfaces and types
interface SubmissionFormData {
  projectName: string;
  link: string;
  description: string;
}

interface BootstrapModal {
  show(): void;
  hide(): void;
  dispose(): void;
}

const props = defineProps<{
  event: Event;
  teams: Team[]; 
  loading: boolean;
  getUserName: (uid: string) => string;
  canSubmitProject: boolean;
}>();

const emit = defineEmits(['submission-success']);

// Composables
const { submitProject } = useEvents();

// Submission modal state
const submissionModalRef = ref<HTMLElement | null>(null);
let submissionModalInstance: BootstrapModal | null = null;
const submissionForm = ref<SubmissionFormData>({ projectName: '', link: '', description: '' });
const submissionError = ref<string>('');
const isSubmittingProject = ref<boolean>(false);

// Helper to get submissions for a specific team
const getTeamSubmissions = (teamName: string): Submission[] => {
  if (!props.event.submissions || !Array.isArray(props.event.submissions)) {
    return [];
  }
  return props.event.submissions.filter(sub => sub.teamName === teamName);
};

// Modal management
const getOrCreateModalInstance = (): BootstrapModal | null => {
  if (!submissionModalRef.value || !window.bootstrap?.Modal) return null;
  if (!submissionModalInstance) {
    submissionModalInstance = new window.bootstrap.Modal(submissionModalRef.value);
  }
  return submissionModalInstance;
};

const openSubmissionModal = (): void => {
  submissionForm.value = { projectName: '', link: '', description: '' };
  submissionError.value = '';
  getOrCreateModalInstance()?.show();
};

const handleSubmitProject = async (): Promise<void> => {
  if (!submissionForm.value.projectName || !submissionForm.value.link) {
    submissionError.value = 'Project Name and Link are required.';
    return;
  }
  
  try { 
    new URL(submissionForm.value.link); 
  } catch (_) {
    submissionError.value = 'Please enter a valid URL (e.g., https://github.com/...).'; 
    return;
  }

  submissionError.value = '';
  isSubmittingProject.value = true;

  try {
    await submitProject(props.event.id, {
      projectName: submissionForm.value.projectName.trim(),
      link: submissionForm.value.link.trim(),
      description: submissionForm.value.description.trim() || undefined,
    });
    
    getOrCreateModalInstance()?.hide();
    emit('submission-success');
  } catch (error: any) {
    console.error("Project submission error:", error);
    submissionError.value = error.message || 'Failed to submit project.';
  } finally {
    isSubmittingProject.value = false;
  }
};

const modalHiddenHandler = () => {
  submissionForm.value = { projectName: '', link: '', description: '' };
  submissionError.value = '';
};

onMounted(() => {
  if (submissionModalRef.value) {
    submissionModalRef.value.addEventListener('hidden.bs.modal', modalHiddenHandler);
  }
});

onBeforeUnmount(() => {
  if (submissionModalRef.value) {
    submissionModalRef.value.removeEventListener('hidden.bs.modal', modalHiddenHandler);
  }
  submissionModalInstance?.dispose();
  submissionModalInstance = null;
});
</script>

<style scoped>
.submissions-card {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  overflow: hidden;
}

.card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(var(--bs-info-rgb), 0.2);
}

/* Loading and Empty States */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--bs-secondary);
}

/* Team Sections */
.team-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.team-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.team-header {
  margin-bottom: 1rem;
}

.team-name {
  font-weight: 600;
  color: var(--bs-dark);
  margin: 0;
}

/* Submissions */
.submissions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.submission-item {
  background: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.submission-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow);
}

.submission-content {
  padding: 1rem;
}

.submission-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.submission-link {
  font-weight: 600;
  color: var(--bs-info);
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: color 0.2s ease;
}

.submission-link:hover {
  color: var(--bs-info);
  text-decoration: underline;
}

.submission-author {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  font-style: italic;
}

.submission-description {
  color: var(--bs-body-color);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bs-border-color-translucent);
}

.no-submissions {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: var(--bs-light);
  border-radius: var(--bs-border-radius);
  font-size: 0.9rem;
}

/* Modal Styling */
.modal-content {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
}

.btn-close-lg {
  font-size: 1.1rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.btn-close-lg:hover {
  opacity: 1;
}

.btn-modal {
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  border-radius: var(--bs-border-radius);
}

.form-control {
  border: 1px solid var(--bs-input-border-color);
  border-radius: var(--bs-border-radius);
  padding: 0.75rem;
  font-size: 0.95rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

.form-label {
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.form-text {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  margin-top: 0.25rem;
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .card-header {
    padding: 0.875rem 1rem;
  }
  
  .card-body {
    padding: 1rem;
  }
  
  .submission-content {
    padding: 0.75rem;
  }
  
  .submission-header {
    gap: 0.375rem;
  }
  
  .submission-link {
    font-size: 0.9rem;
  }
  
  .submission-author {
    font-size: 0.8rem;
  }
  
  .submission-description {
    font-size: 0.85rem;
  }
  
  .empty-state {
    padding: 2rem 1rem;
  }
  
  .team-section {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .btn-modal {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
  }
  
  .modal-footer {
    flex-direction: column-reverse;
    gap: 0.5rem !important;
  }
  
  .modal-footer .btn {
    width: 100%;
  }
  
  .submission-header {
    align-items: flex-start;
  }
  
  .submission-link {
    word-break: break-word;
  }
}
</style>