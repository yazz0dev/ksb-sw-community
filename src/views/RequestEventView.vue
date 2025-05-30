// src/views/RequestEventView.vue
<template>
  <section class="py-5 create-event-section">
    <div class="container-lg">

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-2">Loading initial data...</p>
      </div>

      <div v-else-if="editError" class="alert alert-danger p-4 shadow-sm border-danger-subtle mb-5">
        <div class="d-flex align-items-start">
          <i class="fas fa-exclamation-circle text-danger me-3 fs-4 mt-1"></i>
          <div>
            <h5 class="alert-heading mb-2">Cannot Edit Event</h5>
            <p>{{ editError }}</p>
            <div class="mt-3">
              <button type="button" class="btn btn-primary me-2" @click="$router.push({ name: 'Home' })">
                <i class="fas fa-home me-1"></i> Go to Home
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="$router.back()">
                <i class="fas fa-arrow-left me-1"></i> Go Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <AuthGuard v-else :key="'auth-guard'" message="You must be logged in to request or edit events.">

        <div v-if="!isEditing && hasActiveRequest" :key="'active-request-warning'" class="alert alert-warning d-flex align-items-start mb-5 shadow-sm border-warning-subtle" role="alert" style="background-color: var(--bs-warning-bg-subtle);">
          <i class="fas fa-exclamation-triangle text-warning me-3 fs-4 mt-1"></i>
          <div>
            <h6 class="alert-heading mb-1 fw-medium">Pending Request Active</h6>
            <small class="text-body">You already have a pending event request. Please wait for it to be reviewed before submitting a new one, or <router-link :to="{ name: 'Profile' }" class="alert-link">view your requests</router-link>.</small>
          </div>
        </div>

        <div v-else :key="'event-form-content'">
          <div class="d-flex justify-content-between align-items-center mb-5 pb-4 border-bottom">
            <div>
              <h2 class="h3 text-primary mb-0">{{ isEditing ? 'Edit Event' : 'Request New Event' }}</h2>
              <p class="small text-muted mt-1">{{ isEditing ? 'Update the details of the existing event.' : 'Submit a request for a new community event.' }}</p>
            </div>
            <div>
              <button
                class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
                @click="$router.back()"
              >
                <i class="fas fa-arrow-left me-1"></i>
                <span>Back</span>
              </button>
            </div>
          </div>

          <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
            <i class="fas fa-times-circle me-2"></i>
            <div>{{ errorMessage }}</div>
            <button type="button" class="btn-close btn-sm" @click="errorMessage = ''" aria-label="Close"></button>
          </div>

          <form @submit.prevent="handleSubmitForm" class="mb-5 needs-validation" novalidate>
            <div class="card shadow-sm mb-4" key="event-details-card">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">1. Event Details</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                <EventBasicDetailsForm
                  v-model:details="formData.details"
                  :isSubmitting="isSubmitting"
                />
              </div>
            </div>

            <div v-if="formData.details.format === EventFormat.Team" class="card shadow-sm mb-4" :key="`team-config-card-${2}`">
              <div class="card-header bg-light">
                <h4 class="h5 mb-0 text-dark">2. Team Configuration</h4>
              </div>
              <div class="card-body p-4 p-lg-5">
                 <ManageTeamsComponent
                  :initial-teams="formData.teams ?? []"
                  :students="allUsers"
                  :is-submitting="isSubmitting"
                  :can-auto-generate="true"
                  :event-id="eventId || ''"
                  @update:teams="handleTeamUpdate"
                  @error="handleFormError"
                />
              </div>
            </div>

             <div class="card shadow-sm mb-4" :key="`schedule-card-${scheduleCardNumber}`">
               <div class="card-header bg-light">
                 <h4 class="h5 mb-0 text-dark">{{ scheduleCardNumber }}. Event Schedule</h4>
               </div>
               <div class="card-body p-4 p-lg-5">
                 <EventScheduleForm
                   v-model:dates="formData.details.date"
                   :isSubmitting="isSubmitting"
                   :eventId="eventId"
                   @error="handleFormError"
                   @availability-change="handleAvailabilityChange"
                 />
               </div>
             </div>

             <!-- Submit Button -->
             <div class="d-flex justify-content-end gap-2 mt-4">
               <button type="button" class="btn btn-outline-secondary" @click="$router.back()">
                 Cancel
               </button>
               <button 
                 type="submit" 
                 class="btn btn-primary"
                 :disabled="isSubmitting || !isFormValid"
               >
                 <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1"></span>
                 {{ isEditing ? 'Update Event' : 'Submit Request' }}
               </button>
             </div>
          </form>
        </div>
      </AuthGuard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EventBasicDetailsForm from '@/components/forms/EventBasicDetailsForm.vue';
import EventScheduleForm from '@/components/forms/EventScheduleForm.vue';
import ManageTeamsComponent from '@/components/forms/ManageTeamsComponent.vue';
import AuthGuard from '@/components/AuthGuard.vue';
import { EventFormat } from '@/types/event';

const route = useRoute();
const router = useRouter();

// Reactive state
const loading = ref(true);
const editError = ref('');
const isEditing = ref(false);
const hasActiveRequest = ref(false);
const errorMessage = ref('');
const isSubmitting = ref(false);
const eventId = ref(route.params.eventId as string || '');
const allUsers = ref([]);

// Form data structure
const formData = ref({
  details: {
    eventName: '',
    type: '',
    format: EventFormat.Individual,
    description: '',
    rules: '',
    prize: '',
    allowProjectSubmission: false,
    organizers: [],
    date: {
      start: null,
      end: null
    }
  },
  teams: []
});

const isFormValid = ref(true);

const scheduleCardNumber = computed(() => {
  return formData.value.details.format === EventFormat.Team ? 3 : 2;
});

const handleSubmitForm = async () => {
  console.log('Form submitted', formData.value);
  // Implementation will be added later
};

const handleTeamUpdate = (teams: any[]) => {
  formData.value.teams = teams;
};

const handleFormError = (error: string) => {
  errorMessage.value = error;
};

const handleAvailabilityChange = (isAvailable: boolean) => {
  // Handle availability change
};

onMounted(async () => {
  loading.value = false;
});
</script>

<style scoped>
.create-event-section {
  background: var(--bs-body-bg);
  min-height: 100vh;
}
</style>