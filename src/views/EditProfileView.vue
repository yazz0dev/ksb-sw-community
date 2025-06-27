// src/views/EditProfileView.vue
<template>
  <div class="section-spacing profile-section bg-body min-vh-100-subtract-nav">
    <div class="container-lg">
      <!-- Back Button - Updated with new styling -->
      <div class="mb-4">
        <button
          class="btn btn-back btn-sm btn-icon"
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
         <!-- Offline Draft Indicator -->
        <div v-if="hasOfflineDraft && !isSyncingDraft" class="text-info small d-inline-flex align-items-center">
            <i class="fas fa-cloud-upload-alt me-2 fs-5"></i>
            <span>Changes saved locally. Will sync when online.</span>
        </div>
        <div v-if="isSyncingDraft" class="text-primary small d-inline-flex align-items-center">
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <span>Syncing profile changes...</span>
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
              <form @submit.prevent="handleFormSubmit" class="needs-validation" novalidate>
                <!-- Profile Image with Enhanced Cloudinary Integration -->
                <div class="mb-4 text-center">
                  <ProfileImageUploader
                    :current-image-url="form.photoURL || null"
                    :optimized-image-url="getOptimizedImageUrl(form.photoURL)"
                    :disabled="pageLoading || isImageUploading || isSavingOnline || isSyncingDraft"
                    :upload-progress="imageUploadProgress"
                    :upload-error="imageUploadError"
                    @image-selected="handleImageSelected"
                    @image-uploaded="handleImageUploaded"
                    @upload-error="handleUploadError"
                  />
                  
                  <div v-if="isImageUploading" class="mt-2">
                    <div class="progress" style="height: 4px;">
                      <div 
                        class="progress-bar progress-bar-striped progress-bar-animated" 
                        :style="{ width: imageUploadProgress + '%' }"
                      ></div>
                    </div>
                    <small class="text-muted">Uploading... {{ imageUploadProgress }}%</small>
                  </div>
                  <div v-if="imageUploadError" class="mt-2 text-danger small">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    {{ imageUploadError }}
                  </div>
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
                    :disabled="pageLoading || isSavingOnline || isSyncingDraft"
                    @blur="touched.name = true"
                  />
                  <div class="invalid-feedback">Name is required</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Bio</label>
                  <textarea v-model="form.bio" class="form-control" rows="3" maxlength="200" placeholder="Tell us about yourself" :disabled="pageLoading || isSavingOnline || isSyncingDraft"/>
                </div>

                <div class="mb-3">
                  <label class="form-label">Primary Website/Social Link</label>
                  <input v-model="form.socialLink" type="url" class="form-control" placeholder="https://..." :disabled="pageLoading || isSavingOnline || isSyncingDraft"/>
                  <div class="form-text">Your primary website, portfolio, or social media profile</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Instagram Username</label>
                  <div class="input-group">
                    <span class="input-group-text">@</span>
                    <input v-model="form.instagramLink" type="text" class="form-control" placeholder="username (without @)" :disabled="pageLoading || isSavingOnline || isSyncingDraft"/>
                  </div>
                  <div class="form-text text-muted">Enter just your username, not the full URL</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Portfolio Link</label>
                  <input v-model="form.portfolio" type="url" class="form-control" placeholder="https://..." :disabled="pageLoading || isSavingOnline || isSyncingDraft"/>
                  <div class="form-text">Link to your portfolio or project showcase</div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Skills (comma separated)</label>
                  <input v-model="form.skills" type="text" class="form-control" placeholder="e.g. JavaScript, Python" :disabled="pageLoading || isSavingOnline || isSyncingDraft"/>
                  <div class="form-text">List your technical skills, separated by commas</div>
                </div>

                <div class="mb-4 form-check">
                  <input v-model="form.hasLaptop" type="checkbox" class="form-check-input" id="hasLaptopCheck" :disabled="pageLoading || isSavingOnline || isSyncingDraft">
                  <label class="form-check-label" for="hasLaptopCheck">Has Laptop</label>
                </div>

                <div class="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    class="btn btn-light"
                    @click="router.back()"
                    :disabled="pageLoading || isImageUploading || isSavingOnline || isSyncingDraft"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary"
                    :class="{ 'btn-loading': isSavingOnline || isSyncingDraft }"
                    :disabled="pageLoading || !isFormValid || isImageUploading || isSavingOnline || isSyncingDraft"
                  >
                    <span v-if="isSavingOnline || isSyncingDraft" class="spinner-border spinner-border-sm me-2"></span>
                    <span class="btn-text">{{ (isSavingOnline || isSyncingDraft) ? 'Saving...' : 'Save Changes' }}</span>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useProfileStore } from '@/stores/profileStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAppStore } from '@/stores/appStore';
import type { EnrichedStudentData } from '@/types/student';
import ProfileImageUploader from '@/components/ui/ProfileImageUploader.vue';
import { serverTimestamp } from 'firebase/firestore';
import { UploadStatus } from '@/types/student';
import { saveProfileDraft, loadProfileDraft, clearProfileDraft, type ProfileDraftData } from '@/utils/localDrafts';
import { debounce } from 'lodash-es';

const router = useRouter();
const studentStore = useProfileStore();
const notificationStore = useNotificationStore();
const appStore = useAppStore();

const pageLoading = ref(true); // Renamed loading to pageLoading for clarity
const isSavingOnline = ref(false);
const error = ref('');

const form = ref<ProfileDraftData>({
  name: '',
  photoURL: '',
  bio: '',
  socialLink: '',
  instagramLink: '',
  portfolio: '',
  skills: '',
  hasLaptop: false
});

const formErrors = ref({ name: false });
const touched = ref({ name: false });

const hasOfflineDraft = ref(false);
const isOfflineDraftLoaded = ref(false);
const isSyncingDraft = ref(false);
let formInitialized = false;


const isFormValid = computed(() => {
  formErrors.value.name = form.value.name.trim().length === 0;
  return !formErrors.value.name;
});

const imageUploadProgress = ref(0);
const imageUploadError = ref<string | null>(null);
const isImageUploading = computed(() => studentStore.imageUploadState.status === UploadStatus.Uploading);

function getOptimizedImageUrl(imageUrl?: string): string {
  if (!imageUrl) return '';
  return studentStore.getOptimizedProfileImageUrl(imageUrl, 400, 85);
}

async function handleImageSelected(file: File) {
  imageUploadError.value = null;
  imageUploadProgress.value = 0;
  try {
    const downloadURL = await studentStore.uploadProfileImage(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1200,
      quality: 0.85
    });
    form.value.photoURL = downloadURL;
    notificationStore.showNotification({ message: 'Image uploaded successfully!', type: 'success' });
    // Save draft if offline after successful upload
    if (!appStore.isOnline && formInitialized) {
      await debouncedSaveDraft();
    }
  } catch (err: any) {
    imageUploadError.value = err.message || 'Upload failed';
    notificationStore.showNotification({ message: `Image upload failed: ${err.message}`, type: 'error' });
  }
}

function handleImageUploaded(imageUrl: string) {
  form.value.photoURL = imageUrl;
  imageUploadError.value = null;
  // Save draft if offline and form is initialized
  if (!appStore.isOnline && formInitialized) {
    debouncedSaveDraft();
  }
}

function handleUploadError(err: string) {
  imageUploadError.value = err;
  notificationStore.showNotification({ message: `Image upload failed: ${err}`, type: 'error' });
}

watch(() => studentStore.imageUploadState, (newState) => {
  imageUploadProgress.value = newState.progress;
  if (newState.status === UploadStatus.Error) {
    imageUploadError.value = newState.error;
  } else if (newState.status === UploadStatus.Success && newState.downloadURL) {
    form.value.photoURL = newState.downloadURL;
    imageUploadError.value = null;
    // Save draft if offline and form is initialized
    if (!appStore.isOnline && formInitialized) {
      debouncedSaveDraft();
    }
  }
}, { deep: true });


async function loadUserData() {
  const userId = studentStore.studentId;
  if (!userId || !studentStore.isAuthenticated) {
    notificationStore.showNotification({ message: "User not authenticated.", type: "error" });
    router.push({ name: 'Login' });
    return;
  }
  pageLoading.value = true;
  error.value = '';
  isOfflineDraftLoaded.value = false;
  hasOfflineDraft.value = false;

  let profileDataToLoad: ProfileDraftData | null = null;
  let draftTimestamp: number | undefined = undefined;

  const draft = await loadProfileDraft();
  if (draft) {
    profileDataToLoad = draft;
    draftTimestamp = draft.savedAt;
    hasOfflineDraft.value = true;
    isOfflineDraftLoaded.value = true;
  }

  if (appStore.isOnline) {
    try {
      let userProfile = studentStore.currentStudent;
      if (!userProfile || userProfile.uid !== userId || !studentStore.hasFetched) {
        userProfile = await studentStore.fetchMyProfile();
      }

      if (userProfile) {
        const serverTimestamp = (userProfile as any).lastUpdatedAt?.toMillis();

        if (!profileDataToLoad || (serverTimestamp && draftTimestamp && serverTimestamp > draftTimestamp)) {
          profileDataToLoad = {
            name: userProfile.name || '', photoURL: userProfile.photoURL || '',
            bio: userProfile.bio || '', skills: (userProfile.skills || []).join(', '),
            hasLaptop: userProfile.hasLaptop || false,
            socialLink: userProfile.socialLinks?.primary || '',
            instagramLink: userProfile.socialLinks?.instagram || '',
            portfolio: userProfile.socialLinks?.portfolio || '',
          };
          if (draft && serverTimestamp && draftTimestamp && serverTimestamp > draftTimestamp) {
            await clearProfileDraft();
            hasOfflineDraft.value = false;
            notificationStore.showNotification({ message: "Server data is newer. Local draft discarded.", type: "info", duration: 4000 });
          }
          isOfflineDraftLoaded.value = false;
        } else if (draft) {
             notificationStore.showNotification({ message: "Loaded local draft. It's newer or server data is unavailable.", type: "info", duration: 4000 });
        }
      } else if (!profileDataToLoad) {
        throw new Error('Profile data not found on server and no local draft.');
      }
    } catch (err: any) {
      console.warn("Failed to load server profile, using draft if available:", err);
      if (!profileDataToLoad) error.value = err.message || 'Failed to load user data.';
    }
  } else if (!profileDataToLoad) {
     error.value = "You are offline and no local profile draft is available.";
  }

  if (profileDataToLoad) {
    form.value = { ...profileDataToLoad };
  }
  pageLoading.value = false;
  await nextTick(); // Ensure form is populated before setting formInitialized
  formInitialized = true;
}

const handleFormSubmit = async () => {
    await saveProfileEdits(false); // false indicates it's a manual submission attempt
};

const debouncedSaveDraft = debounce(async () => {
  if (!appStore.isOnline && isFormValid.value && formInitialized && !isSyncingDraft.value && !pageLoading.value) {
    const draftData: ProfileDraftData = { ...form.value };
    await saveProfileDraft(draftData);
    hasOfflineDraft.value = true;
    // Subtle indication, main one is cloud icon.
    // notificationStore.showNotification({ message: "Changes saved as draft.", type: "info", duration: 2000 });
  }
}, 1000);

watch(form, () => {
  if (formInitialized && !pageLoading.value) { // Only save draft if form has been initialized and not currently loading
      debouncedSaveDraft();
  }
}, { deep: true });

watch(() => appStore.isOnline, async (newIsOnline, oldIsOnline) => {
  if (newIsOnline && !oldIsOnline && hasOfflineDraft.value && !isSyncingDraft.value) {
    notificationStore.showNotification({ message: "Back online! Attempting to sync profile changes...", type: "info" });
    isSyncingDraft.value = true;
    await saveProfileEdits(true); // true indicates it's an auto-sync attempt
    isSyncingDraft.value = false;
  }
});

async function saveProfileEdits(isAutoSync: boolean) {
  touched.value.name = true; // Mark as touched to show validation errors if any
  if (!isFormValid.value) {
    if (!isAutoSync) notificationStore.showNotification({ message: "Please correct the form errors.", type: "warning" });
    return;
  }
  if (isImageUploading.value) {
    if (!isAutoSync) notificationStore.showNotification({ message: "Please wait for image upload to complete.", type: "warning" });
    return;
  }

  isSavingOnline.value = true;
  error.value = '';

  if (!appStore.isOnline && !isAutoSync) { // If manually submitted while offline
    const draftData: ProfileDraftData = { ...form.value };
    await saveProfileDraft(draftData);
    hasOfflineDraft.value = true;
    notificationStore.showNotification({ message: "You are offline. Profile changes saved as a local draft.", type: "info" });
    isSavingOnline.value = false;
    return;
  }

  try {
    if (!studentStore.studentId) throw new Error('You must be logged in to update your profile');

    let photoURLForFirestore: string | null = form.value.photoURL?.trim() || null;
    if (photoURLForFirestore && (photoURLForFirestore.startsWith('blob:') || photoURLForFirestore.startsWith('data:'))) {
        photoURLForFirestore = studentStore.currentStudent?.photoURL || null;
    }

    const skillsArray = form.value.skills?.split(',').map(s => s.trim()).filter(s => s.length > 0) || [];
    const newSocialLinks: EnrichedStudentData['socialLinks'] = {
      primary: form.value.socialLink?.trim() || '',
      instagram: form.value.instagramLink?.trim().replace('@', '') || '',
      portfolio: form.value.portfolio?.trim() || '',
    };

    const updates = {
      name: form.value.name?.trim() || '',
      bio: form.value.bio?.trim() || '',
      skills: skillsArray,
      hasLaptop: form.value.hasLaptop || false,
      socialLinks: newSocialLinks,
      lastUpdatedAt: serverTimestamp() as any,
    };

    const success = await studentStore.updateMyProfile(updates);

    if (success) {
      studentStore.resetImageUploadState();
      imageUploadError.value = null; imageUploadProgress.value = 0;
      await clearProfileDraft();
      hasOfflineDraft.value = false; isOfflineDraftLoaded.value = false;
      notificationStore.showNotification({ message: 'Profile updated successfully!', type: 'success' });
      if (!isAutoSync) router.push({ name: 'Profile' }); // Only navigate if it's a manual save
    } else {
      error.value = studentStore.actionError || 'Failed to update profile online.';
      if (appStore.isOnline) { // If online and failed, save draft
          const draftData: ProfileDraftData = { ...form.value };
          await saveProfileDraft(draftData);
          hasOfflineDraft.value = true;
          if (!isAutoSync) notificationStore.showNotification({ message: `Online save failed: ${error.value}. Changes saved as draft.`, type: "warning" });
          else notificationStore.showNotification({ message: `Auto-sync failed: ${error.value}. Changes remain as draft.`, type: "warning" });
      }
    }
  } catch (err: any) {
    error.value = err?.message || 'Failed to update profile';
    const draftData: ProfileDraftData = { ...form.value };
    await saveProfileDraft(draftData); // Save draft on any catch during submission
    hasOfflineDraft.value = true;
    if (appStore.isOnline && !isAutoSync) {
         notificationStore.showNotification({ message: `${error.value}. Changes saved as a local draft.`, type: 'error' });
    } else if (appStore.isOnline && isAutoSync) {
         notificationStore.showNotification({ message: `Auto-sync failed: ${error.value}. Changes remain as draft.`, type: 'error' });
    } else if (!isAutoSync) { // Offline and manual submit
         notificationStore.showNotification({ message: "You are offline. Changes saved as a local draft.", type: "info" });
    }
  } finally {
    isSavingOnline.value = false;
  }
}

onMounted(() => {
  formInitialized = false; // Reset flag on mount
  loadUserData().finally(() => {
      // formInitialized = true; // Moved to end of loadUserData after nextTick
  });
  studentStore.resetImageUploadState();
  imageUploadError.value = null;
  imageUploadProgress.value = 0;
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
  animation: slideInDown20 0.5s ease-out; /* Use global slideInDown20 */
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
  animation: pulseOpacity 2s infinite; /* Use global pulseOpacity */
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
/* Local slideInLeft is specific to .border-bottom::after width animation - KEPT */
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

/* Other local keyframes (slideInDown, slideInUp, pulse, shake) removed. */
/* They will use global versions now. */

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
  
  .border-bottom::after,
  .alert-danger,
  .card,
  .is-invalid,
  .invalid-feedback,
  .required::after {
    animation: none !important; /* Disable animations */
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
  
  /* Animations already disabled by 768px media query, re-stating for emphasis or if specific overrides were intended */
  .border-bottom::after,
  .alert-danger,
  .card,
  .is-invalid,
  .invalid-feedback,
  .required::after {
    animation: none !important;
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
  
  .border-bottom::after,
  .alert-danger,
  .card, /* main card animation */
  .is-invalid, /* shake */
  .invalid-feedback, /* slideInUp */
  .required::after { /* pulse */
    animation: none !important;
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