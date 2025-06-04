<!-- src/components/events/EventSubmissionsSection.vue -->
<template>
  <div class="card submissions-box shadow-sm mb-4 animate-fade-in">
    <div class="card-header d-flex justify-content-between align-items-center bg-light">
      <span class="h6 mb-0"><i class="fas fa-upload text-primary me-2"></i>Project Submissions</span>
      <button v-if="canSubmitProject" class="btn btn-sm btn-primary" @click="openSubmissionModal">
        <i class="fas fa-plus me-1"></i>Submit
      </button>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-center py-3">
        <span class="spinner-border spinner-border-sm"></span> Loading submissions...
      </div>
      <template v-else>
        <!-- If no submissions at all for the event -->
        <div v-if="!event.submissions || event.submissions.length === 0" class="text-center text-muted py-3">
          No project submissions yet for this event.
        </div>

        <!-- Team Event: Group submissions by team -->
        <template v-else-if="event.details.format === 'Team'">
          <div v-for="team in teams" :key="team.id || team.teamName" class="mb-3">
            <h6 class="fw-semibold">{{ team.teamName }}</h6>
            <!-- Filter submissions for the current team -->
            <ul v-if="getTeamSubmissions(team.teamName).length > 0" class="list-unstyled mb-0 ps-2">
              <li v-for="submission in getTeamSubmissions(team.teamName)" :key="submission.submittedBy + '-' + submission.projectName" class="small py-1">
                <i class="fas fa-code-branch fa-fw text-secondary me-1"></i>
                <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                  {{ submission.projectName }}
                </a>
                <span class="text-muted ms-2">by {{ getUserName(submission.submittedBy) }}</span>
                <p v-if="submission.description" class="text-muted small mt-1 mb-0 ps-3">{{ submission.description }}</p>
              </li>
            </ul>
            <p v-else class="small text-muted fst-italic ps-2">No submissions from this team yet.</p>
          </div>
        </template>

        <!-- Individual/Competition Event: List all submissions directly -->
        <template v-else>
          <ul class="list-unstyled mb-0">
            <li v-for="submission in event.submissions" :key="submission.submittedBy + '-' + submission.projectName" class="mb-2 small py-1">
              <i class="fas fa-code-branch fa-fw text-secondary me-1"></i>
              <a :href="submission.link" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                {{ submission.projectName }}
              </a>
              <span class="text-muted ms-2">by {{ getUserName(submission.submittedBy) }}</span>
              <p v-if="submission.description" class="text-muted small mt-1 mb-0 ps-3">{{ submission.description }}</p>
            </li>
          </ul>
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
        <div class="modal-content rounded-4 shadow-lg">
          <div class="modal-header border-0 pb-2">
            <h5 class="modal-title h5" id="submissionModalLabel">
              <i class="fas fa-upload me-2 text-primary"></i>Submit Your Project
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="handleSubmitProject">
              <div class="mb-3">
                <label for="projectName" class="form-label">Project Name <span class="text-danger">*</span></label>
                <input 
                  type="text" 
                  id="projectName" 
                  v-model="submissionForm.projectName" 
                  required 
                  class="form-control"
                  placeholder="Enter your project name"
                >
              </div>
              <div class="mb-3">
                <label for="projectLink" class="form-label">Project Link <span class="text-danger">*</span></label>
                <input 
                  type="url" 
                  id="projectLink" 
                  v-model="submissionForm.link" 
                  required 
                  placeholder="https://github.com/username/project or https://demo.example.com" 
                  class="form-control"
                >
                <div class="form-text">Provide a link to your GitHub repository, demo, or project documentation.</div>
              </div>
              <div class="mb-3">
                <label for="projectDescription" class="form-label">Brief Description</label>
                <textarea 
                  id="projectDescription" 
                  v-model="submissionForm.description" 
                  rows="4" 
                  class="form-control"
                  placeholder="Describe what your project does, technologies used, and any key features..."
                ></textarea>
              </div>
              <div v-if="submissionError" class="alert alert-danger d-flex align-items-center">
                <i class="fas fa-exclamation-circle me-2"></i> 
                {{ submissionError }}
              </div>
            </form>
          </div>
          <div class="modal-footer border-0 pt-2">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              Cancel
            </button>
            <button
              type="button"
              @click="handleSubmitProject"
              :disabled="isSubmittingProject"
              class="btn btn-primary"
            >
              <span v-if="isSubmittingProject" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useEvents } from '@/composables/useEvents';
import { useProfileStore } from '@/stores/profileStore';

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
const studentStore = useProfileStore();

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
/* Styles are fine, no changes needed here for this modification */
</style>