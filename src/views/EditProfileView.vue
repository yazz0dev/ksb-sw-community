// src/views/EditProfileView.vue
<template>
  <div class="py-3 py-md-5 profile-section bg-body min-vh-100-subtract-nav">
    <div class="container-lg">
      <!-- Back Button - Styled like ProfileView -->
      <div class="mb-4">
        <button
          class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center"
          @click="router.back()"
        >
          <i class="fas fa-arrow-left me-1"></i>
          <span>Back</span>
        </button>
      </div>

      <!-- Header -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-4 border-bottom">
        <div>
          <h2 class="h2 text-primary mb-2 d-inline-flex align-items-center">
            <i class="fas fa-edit me-2"></i>Edit Profile
          </h2>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-danger d-flex align-items-center mb-4">
        <i class="fas fa-exclamation-circle me-2"></i>
        {{ error }}
      </div>

      <!-- Edit Form -->
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="card shadow-sm">
            <div class="card-body p-3 p-md-4">
              <form @submit.prevent="saveProfileEdits" class="needs-validation" novalidate>
                <!-- Profile Image -->
                <div class="mb-4 text-center">
                  <ProfileImageUploader
                    :current-image-url="form.photoURL"
                    :disabled="loading"
                    @update:image="form.photoURL = $event"
                  />
                </div>

                <div class="mb-4">
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
                  <textarea v-model="form.bio" class="form-control" rows="3" maxlength="200" placeholder="Tell us about yourself" />
                </div>

                <div class="mb-3">
                  <label class="form-label">Primary Website/Social Link</label>
                  <input v-model="form.socialLink" type="url" class="form-control" placeholder="https://..." />
                  <div class="form-text">Your primary website, portfolio, or social media profile</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Instagram Username</label>
                  <div class="input-group">
                    <span class="input-group-text">@</span>
                    <input v-model="form.instagramLink" type="text" class="form-control" placeholder="username (without @)" />
                  </div>
                  <div class="form-text text-muted">Enter just your username, not the full URL</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Portfolio Link</label>
                  <input v-model="form.portfolio" type="url" class="form-control" placeholder="https://..." />
                  <div class="form-text">Link to your portfolio or project showcase</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Skills (comma separated)</label>
                  <input v-model="form.skills" type="text" class="form-control" placeholder="e.g. JavaScript, Python" />
                  <div class="form-text">List your technical skills, separated by commas</div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { StudentProfileData, EnrichedStudentData } from '@/types/student';
import ProfileImageUploader from '@/components/ui/ProfileImageUploader.vue';
import { serverTimestamp } from 'firebase/firestore';

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
  instagramLink: '', // Instagram username
  portfolio: '',     // Portfolio link (renamed from otherLink)
  skills: '',
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
  const userId = studentStore.studentId; // Get from store instead of route params
  if (!userId || !studentStore.isAuthenticated) {
    error.value = 'You must be logged in to edit your profile.';
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
      socialLink: userData.socialLinks?.primary || '', // Correctly map to 'primary'
      instagramLink: userData.socialLinks?.instagram || '', // Instagram username
      portfolio: userData.socialLinks?.portfolio || '', // Correctly map to 'portfolio'
      skills: Array.isArray(userData.skills) ? userData.skills.join(', ') : '',
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
    // Ensure user is authenticated
    if (!studentStore.studentId) {
      throw new Error('You must be logged in to update your profile');
    }

    // Strict validation for photoURL before sending to Firestore
    let photoURLForFirestore: string | null;
    const currentPhotoValueFromForm = form.value.photoURL;

    if (currentPhotoValueFromForm && currentPhotoValueFromForm.startsWith('blob:')) {
      // A blob URL indicates the upload process isn't complete or failed to yield a permanent URL.
      // Revert to the existing valid photoURL from the store, or null if not available/valid.
      console.warn('Attempting to save profile with a blob URL for photo. Reverting to stored photoURL or null.');
      const storedPhotoURL = studentStore.currentStudent?.photoURL;
      if (storedPhotoURL && storedPhotoURL.match(/^https?:\/\/.+/)) {
        photoURLForFirestore = storedPhotoURL;
      } else {
        photoURLForFirestore = null;
      }
      notificationStore.showNotification({ 
        message: 'New image was not saved as it was not finalized. Using previous image if available.', 
        type: 'warning' 
      });
    } else if (currentPhotoValueFromForm && currentPhotoValueFromForm.match(/^https?:\/\/.+/)) {
      // It's a valid http/https URL from the form (could be existing or newly uploaded and finalized)
      photoURLForFirestore = currentPhotoValueFromForm.trim();
    } else {
      // It's empty, null, or an invalid string format (e.g., relative path). Treat as null for Firestore.
      if (currentPhotoValueFromForm && currentPhotoValueFromForm.trim() !== '') {
         console.warn(`Invalid photoURL format in form ('${currentPhotoValueFromForm}'). Setting to null for Firestore update.`);
      }
      photoURLForFirestore = null;
    }

    // Prepare skills as arrays
    const skillsArray = form.value.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Prepare socialLinks object
    const newSocialLinks: EnrichedStudentData['socialLinks'] = {
      ...(studentStore.currentStudent?.socialLinks || {}), // Preserve other links
    };
    
    // Consistently map form fields to socialLinks properties, trimming whitespace.
    newSocialLinks.primary = form.value.socialLink.trim();
    newSocialLinks.instagram = form.value.instagramLink.trim().replace('@', '');
    newSocialLinks.portfolio = form.value.portfolio.trim();

    const payloadForUpdate = {
      name: form.value.name.trim(),
      photoURL: photoURLForFirestore, // Use the strictly validated/corrected URL
      bio: form.value.bio.trim(),
      skills: skillsArray,
      hasLaptop: form.value.hasLaptop,
      socialLinks: newSocialLinks,
      lastUpdatedAt: serverTimestamp()
    };

    const success = await studentStore.updateMyProfile(payloadForUpdate as Partial<StudentProfileData>);

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

<style scoped>
.profile-section {
  background-color: var(--bs-body-bg);
}

.required::after {
  content: "*";
  color: var(--bs-danger);
  margin-left: 0.2rem;
}

/* The .min-vh-100-subtract-nav class is now defined globally in main.scss */
/* This ensures consistency and uses the correct CSS variables for navbar heights. */

</style>