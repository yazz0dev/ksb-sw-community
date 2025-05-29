// src/views/EditProfileView.vue
<template>
  <div class="container py-4 py-md-5 px-3 px-md-4">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <!-- Header -->
        <div class="d-flex align-items-center mb-3 mb-md-4">
          <button @click="router.back()" class="btn btn-link text-secondary text-decoration-none p-1 p-md-2">
            <i class="fas fa-arrow-left me-2"></i> Back
          </button>
          <h1 class="h3 h2-md mb-0">Edit Profile</h1>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert alert-danger d-flex align-items-center mb-3 mb-md-4">
          <i class="fas fa-exclamation-circle me-2"></i>
          {{ error }}
        </div>

        <!-- Edit Form -->
        <div class="card shadow-sm">
          <div class="card-body p-3 p-md-4">
            <form @submit.prevent="saveProfileEdits" class="needs-validation" novalidate>
              <!-- Profile Image -->
              <div class="mb-3 mb-md-4 text-center">
                <ProfileImageUploader
                  :current-image-url="form.photoURL"
                  :disabled="loading"
                  @update:image="form.photoURL = $event"
                />
              </div>

              <div class="mb-3 mb-md-4">
                <label class="form-label required">Name</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-control"
                  :class="{ 'is-invalid': formErrors.name }"
                  maxlength="50"
                  required
                  :disabled="loading"
                />
                <div class="invalid-feedback">Name is required</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Bio</label>
                <textarea v-model="form.bio" class="form-control" rows="3" maxlength="200" />
              </div>

              <div class="mb-3">
                <label class="form-label">Social Link</label>
                <input v-model="form.socialLink" type="url" class="form-control" placeholder="https://..." />
              </div>

              <div class="mb-3">
                <label class="form-label">Skills (comma separated)</label>
                <input v-model="form.skills" type="text" class="form-control" placeholder="e.g. JavaScript, Python" />
              </div>

              <div class="mb-4">
                <label class="form-label">Preferred Roles (comma separated)</label>
                <input v-model="form.preferredRoles" type="text" class="form-control" placeholder="e.g. developer, designer" />
              </div>

              <div class="mb-4 form-check">
                <input v-model="form.hasLaptop" type="checkbox" class="form-check-input" id="hasLaptopCheck" :disabled="loading">
                <label class="form-check-label" for="hasLaptopCheck">Has Laptop</label>
              </div>

              <div class="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  class="btn btn-light"
                  @click="router.back()"
                  :disabled="loading"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="loading || !isFormValid"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ loading ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { StudentProfileData, EnrichedStudentData } from '@/types/student';
import ProfileImageUploader from '@/components/common/ProfileImageUploader.vue';

const router = useRouter();
const route = useRoute();
const studentStore = useProfileStore();
const notificationStore = useNotificationStore();

const loading = ref(false);
const error = ref('');
const form = ref({
  name: '', // Will be string, not null, due to required validation
  photoURL: '',
  bio: '',
  socialLink: '',
  skills: '',
  preferredRoles: '',
  hasLaptop: false
});

const formErrors = ref({
  name: false
});

const isFormValid = computed(() => {
  formErrors.value.name = form.value.name.trim().length === 0;
  return !formErrors.value.name;
});

async function loadUserData() {
  const userId = route.params.id as string;
  if (!userId || !studentStore.isAuthenticated || userId !== studentStore.studentId) {
    error.value = 'You are not authorized to edit this profile or user ID is missing.';
    notificationStore.showNotification({ message: error.value, type: 'error' });
    router.push({ name: 'Home' });
    return;
  }
  loading.value = true;

  try {
    const userData: EnrichedStudentData | null = studentStore.currentStudent ?
        JSON.parse(JSON.stringify(studentStore.currentStudent))
        : await studentStore.fetchProfileForView(userId);

    if (!userData) {
      throw new Error('User profile not found.');
    }

    form.value = {
      name: userData.name || '', // Fallback to empty string if name is null
      photoURL: userData.photoURL || '',
      bio: userData.bio || '',
      socialLink: userData.socialLinks?.portfolio || '', // Correctly access portfolio from socialLinks
      skills: Array.isArray(userData.skills) ? userData.skills.join(', ') : '',
      preferredRoles: Array.isArray(userData.preferredRoles) ? userData.preferredRoles.join(', ') : '',
      hasLaptop: userData.hasLaptop || false
    };
     if (!form.value.name) { // If name becomes empty string after fallback, set error
        formErrors.value.name = true;
     }

  } catch (err: any) {
    error.value = err?.message || 'Failed to load profile data';
    notificationStore.showNotification({ message: error.value, type: 'error' });
    router.back();
  } finally {
    loading.value = false;
  }
}

async function saveProfileEdits() {
  if (!isFormValid.value) {
    notificationStore.showNotification({ message: "Please correct the form errors.", type: "warning" });
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // Ensure `name` is not null, as the store expects string | undefined
    const payloadForUpdate = {
      ...form.value,
      name: form.value.name === null ? undefined : form.value.name,
    };

    // Cast to any to work around issues with StudentProfileData's external definition
    const success = await studentStore.updateMyProfile(payloadForUpdate as any);

    if (success) {
        notificationStore.showNotification({ message: 'Profile updated successfully', type: 'success' });
        router.push({ name: 'Profile' });
    } else {
        throw new Error(studentStore.actionError || 'Failed to update profile.');
    }
  } catch (err: any) {
    error.value = err?.message || 'Failed to update profile';
    notificationStore.showNotification({ message: error.value, type: 'error' });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadUserData();
});
</script>