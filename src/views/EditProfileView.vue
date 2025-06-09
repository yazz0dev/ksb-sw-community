// src/views/EditProfileView.vue
<template>
  <div class="section-spacing profile-section bg-body min-vh-100-subtract-nav">
    <div class="container-lg">
      <!-- Back Button - Styled like ProfileView -->
      <div class="mb-4">
        <button
          class="btn btn-outline-secondary btn-sm btn-icon"
          @click="router.back()"
        >
          <i class="fas fa-arrow-left me-1"></i>
          <span>Back</span>
        </button>
      </div>

      <!-- Header -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-4 border-bottom">
        <div>
          <h2 class="h2 text-gradient-primary mb-2 d-inline-flex align-items-center">
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
                    :class="{ 'is-invalid': formErrors.name && touched.name }"
                    maxlength="50"
                    required
                    :disabled="loading"
                    @blur="touched.name = true"
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
                    :class="{ 'btn-loading': loading }"
                    :disabled="loading || !isFormValid"
                  >
                    <span class="btn-text">Save Changes</span>
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
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import type { StudentProfileData, EnrichedStudentData } from '@/types/student';
import ProfileImageUploader from '@/components/ui/ProfileImageUploader.vue';
import { serverTimestamp } from 'firebase/firestore';

const router = useRouter();
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

const touched = ref({
  name: false
});

const isFormValid = computed(() => {
  formErrors.value.name = form.value.name.trim().length === 0;
  return !formErrors.value.name;
});

async function loadUserData() {
  const userId = studentStore.studentId; // Get from store instead of route params
  if (!userId || !studentStore.isAuthenticated) {
    notificationStore.showNotification({ message: "User not authenticated. Cannot load profile.", type: "error" });
    router.push({ name: 'Login' }); // Redirect to login if not authenticated
    return;
  }
  loading.value = true;
  error.value = ''; // Clear previous errors

  try {
    // Attempt to get profile from store first
    let userProfile = studentStore.currentStudent;
    if (!userProfile || userProfile.uid !== userId) {
      // If not in store or wrong user, fetch it
      userProfile = await studentStore.fetchMyProfile();
    }

    if (userProfile) {
      form.value.name = userProfile.name || '';
      form.value.photoURL = userProfile.photoURL || '';
      form.value.bio = userProfile.bio || '';
      form.value.skills = (userProfile.skills || []).join(', ');
      form.value.hasLaptop = userProfile.hasLaptop || false;
      
      // Populate social links from the enriched structure
      form.value.socialLink = userProfile.socialLinks?.primary || '';
      form.value.instagramLink = userProfile.socialLinks?.instagram || '';
      form.value.portfolio = userProfile.socialLinks?.portfolio || '';

    } else {
      throw new Error('Profile data not found.');
    }
  } catch (err: any) {
    const message = err.message || 'Failed to load user data.';
    error.value = message;
    // Consider if router.back() is still appropriate or if showing error on page is better
    // router.back(); 
  } finally {
    loading.value = false;
  }
}

async function saveProfileEdits() {
  touched.value.name = true;
  if (!isFormValid.value) {
    notificationStore.showNotification({ message: "Please correct the form errors.", type: "warning" });
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    if (!studentStore.studentId) {
      throw new Error('You must be logged in to update your profile');
    }

    // Handle ImageKit URLs and blob URLs
    let photoURLForFirestore: string | null;
    const currentPhotoValueFromForm = form.value.photoURL;

    if (currentPhotoValueFromForm && currentPhotoValueFromForm.startsWith('blob:')) {
      console.warn('Attempting to save profile with a blob URL for photo. Reverting to stored photoURL or null.');
      const storedPhotoURL = studentStore.currentStudent?.photoURL;
      if (storedPhotoURL && (storedPhotoURL.match(/^https?:\/\/.+/) || storedPhotoURL.includes('imagekit.io'))) {
        photoURLForFirestore = storedPhotoURL;
      } else {
        photoURLForFirestore = null;
      }
      notificationStore.showNotification({ 
        message: 'New image was not saved as it was not finalized. Using previous image if available.', 
        type: 'warning' 
      });
    } else if (currentPhotoValueFromForm && (currentPhotoValueFromForm.match(/^https?:\/\/.+/) || currentPhotoValueFromForm.includes('imagekit.io'))) {
      // Valid HTTP/HTTPS URL or ImageKit URL
      photoURLForFirestore = currentPhotoValueFromForm.trim();
    } else {
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
        // The store handles error notifications, so we just set the local error for display
        error.value = studentStore.actionError || 'Failed to update profile.';
    }
  } catch (err: any) {
    // This catch block handles unexpected errors
    error.value = err?.message || 'Failed to update profile';
    // Only show notification if it's a different error than what the store might have handled
    if (!studentStore.actionError) {
      notificationStore.showNotification({ message: error.value, type: 'error' });
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadUserData();
});
</script>

<style scoped>
/* Main Container */
.profile-section {
  background: linear-gradient(135deg, 
    var(--bs-body-tertiary-bg) 0%, 
    rgba(var(--bs-primary-rgb), 0.02) 50%,
    var(--bs-body-bg) 100%);
  position: relative;
  overflow: hidden;
}

.profile-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(var(--bs-primary-rgb), 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(var(--bs-success-rgb), 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.container-lg {
  position: relative;
  z-index: 1;
}

/* Header Section */
.border-bottom {
  border-color: rgba(var(--bs-border-color-translucent), 0.6) !important;
  position: relative;
}

.border-bottom::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--bs-primary), var(--bs-success));
  border-radius: 2px;
  animation: slideInLeft 0.6s ease-out;
}

.h2 {
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--bs-primary), var(--bs-success));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
}

/* Error Alert */
.alert-danger {
  background: linear-gradient(135deg, 
    rgba(var(--bs-danger-rgb), 0.08) 0%, 
    rgba(var(--bs-danger-rgb), 0.04) 100%);
  border: none;
  border-left: 4px solid var(--bs-danger);
  border-radius: var(--bs-border-radius-lg);
  box-shadow: 0 4px 15px rgba(var(--bs-danger-rgb), 0.1);
  animation: slideInDown 0.5s ease-out;
}

/* Card Styling */
.card {
  background: linear-gradient(145deg, 
    var(--bs-white) 0%, 
    rgba(var(--bs-light-rgb), 0.3) 100%);
  border: 1px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-radius: var(--bs-border-radius-xl);
  box-shadow: 
    0 10px 30px rgba(var(--bs-dark-rgb), 0.08),
    0 4px 8px rgba(var(--bs-dark-rgb), 0.04);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  animation: slideInUp 0.6s ease-out;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, 
    var(--bs-primary) 0%, 
    var(--bs-success) 50%, 
    var(--bs-info) 100%);
  opacity: 0.8;
}

.card-body {
  background: rgba(var(--bs-white-rgb), 0.9);
  backdrop-filter: blur(20px);
}

/* Form Elements */
.form-label {
  font-weight: 600;
  color: var(--bs-dark);
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  position: relative;
  transition: color 0.3s ease;
}

.required::after {
  content: "*";
  color: var(--bs-danger);
  margin-left: 0.25rem;
  font-weight: 700;
  animation: pulse 2s infinite;
}

.form-control, 
.form-select {
  border: 2px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-radius: var(--bs-border-radius-lg);
  padding: 0.875rem 1rem;
  font-size: 0.95rem;
  background: rgba(var(--bs-white-rgb), 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.form-control:focus, 
.form-select:focus {
  border-color: var(--bs-primary);
  box-shadow: 
    0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.15),
    0 4px 12px rgba(var(--bs-primary-rgb), 0.1);
  background: var(--bs-white);
  transform: translateY(-2px);
}

.form-control:hover:not(:focus):not(:disabled),
.form-select:hover:not(:focus):not(:disabled) {
  border-color: rgba(var(--bs-primary-rgb), 0.6);
  transform: translateY(-1px);
}

.form-control::placeholder {
  color: var(--bs-secondary);
  font-style: italic;
  transition: opacity 0.3s ease;
}

.form-control:focus::placeholder {
  opacity: 0.7;
}

/* Input Group Styling */
.input-group-text {
  background: linear-gradient(135deg, 
    var(--bs-light) 0%, 
    rgba(var(--bs-primary-rgb), 0.05) 100%);
  border: 2px solid rgba(var(--bs-border-color-translucent), 0.6);
  border-right: none;
  color: var(--bs-primary);
  font-weight: 600;
  border-radius: var(--bs-border-radius-lg) 0 0 var(--bs-border-radius-lg);
}

.input-group .form-control {
  border-left: none;
  border-radius: 0 var(--bs-border-radius-lg) var(--bs-border-radius-lg) 0;
}

.input-group:focus-within .input-group-text {
  border-color: var(--bs-primary);
  background: linear-gradient(135deg, 
    rgba(var(--bs-primary-rgb), 0.1) 0%, 
    rgba(var(--bs-primary-rgb), 0.05) 100%);
}

/* Form Text */
.form-text {
  font-size: 0.85rem;
  color: var(--bs-secondary);
  margin-top: 0.5rem;
  font-style: italic;
  transition: color 0.3s ease;
}

.form-control:focus + .form-text,
.input-group:focus-within + .form-text {
  color: var(--bs-primary);
}

/* Checkbox Styling */
.form-check {
  padding: 1rem;
  background: rgba(var(--bs-light-rgb), 0.4);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid rgba(var(--bs-border-color-translucent), 0.3);
  transition: all 0.3s ease;
  position: relative;
}

.form-check:hover {
  background: rgba(var(--bs-primary-rgb), 0.05);
  border-color: rgba(var(--bs-primary-rgb), 0.3);
}

.form-check-input {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--bs-border-color);
  transition: all 0.3s ease;
}

.form-check-input:checked {
  background-color: var(--bs-primary);
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

.form-check-label {
  font-weight: 500;
  margin-left: 0.5rem;
  color: var(--bs-dark);
  cursor: pointer;
  transition: color 0.3s ease;
}

.form-check:hover .form-check-label {
  color: var(--bs-primary);
}

/* Spinner */
.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}

/* Validation States */
.is-invalid {
  border-color: var(--bs-danger) !important;
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-danger-rgb), 0.15) !important;
  animation: shake 0.5s ease-in-out;
}

.invalid-feedback {
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.5rem;
  animation: slideInUp 0.3s ease-out;
  display: none; /* Hide by default */
}

.is-invalid ~ .invalid-feedback {
  display: block; /* Show when sibling is invalid */
}

/* Animations */
@keyframes slideInLeft {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 60px;
    opacity: 1;
  }
}

@keyframes slideInDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .card-body {
    padding: 1.5rem !important;
  }
  
  .form-control, 
  .form-select {
    padding: 0.75rem 0.875rem;
    font-size: 0.9rem;
  }
  
  .h2 {
    font-size: 1.75rem;
  }
  
  .form-control:hover {
    transform: none;
  }
  
  @keyframes slideInLeft {
    0%, 100% { transform: none; }
  }
  @keyframes slideInDown {
    0%, 100% { transform: none; }
  }
  @keyframes slideInUp {
    0%, 100% { transform: none; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
  }
  @keyframes shake {
    0%, 100% { transform: none; }
  }
}

@media (max-width: 576px) {
  .profile-section {
    padding: 1rem 0 3rem 0 !important;
  }
  
  .card-body {
    padding: 1rem !important;
  }
  
  .d-flex.justify-content-end {
    flex-direction: column;
  }
  
  .form-check {
    transition: none;
  }
  
  .form-control:focus,
  .form-control:hover {
    transform: none;
  }
  
  @keyframes slideInLeft {
    0%, 100% { transform: none; }
  }
  @keyframes slideInDown {
    0%, 100% { transform: none; }
  }
  @keyframes slideInUp {
    0%, 100% { transform: none; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
  }
  @keyframes shake {
    0%, 100% { transform: none; }
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .card,
  .form-control,
  .form-select,
  .form-check {
    transition: none;
  }
  
  .form-control:focus,
  .form-control:hover {
    transform: none;
  }
  
  @keyframes slideInLeft {
    0%, 100% { transform: none; }
  }
  @keyframes slideInDown {
    0%, 100% { transform: none; }
  }
  @keyframes slideInUp {
    0%, 100% { transform: none; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
  }
  @keyframes shake {
    0%, 100% { transform: none; }
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .card {
    border: 2px solid var(--bs-dark);
  }
  
  .form-control,
  .form-select {
    border: 2px solid var(--bs-dark);
  }
}
</style>