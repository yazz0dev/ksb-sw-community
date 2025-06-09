<template>
  <div class="profile-image-uploader">
    <div class="image-preview position-relative mb-3">
      <img
        :src="previewUrl || defaultImage"
        class="rounded-circle profile-image"
        :class="{ 'uploading': isUploading }"
        alt="Profile image"
        @error="handleImageError"
      />
      
      <div v-if="isUploading" class="upload-overlay d-flex align-items-center justify-content-center">
        <div class="text-center">
          <div class="spinner-border text-light spinner-border-sm mb-2" role="status">
            <span class="visually-hidden">Uploading...</span>
          </div>
          <div class="progress" style="height: 6px; width: 80px;">
            <div 
              class="progress-bar" 
              role="progressbar" 
              :style="{ width: `${uploadProgress}%` }" 
              :aria-valuenow="uploadProgress" 
              aria-valuemin="0" 
              aria-valuemax="100"
            ></div>
          </div>
        </div>
      </div>

      <button 
        type="button" 
        class="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle"
        @click="triggerFileInput"
        :disabled="!!(isUploading || disabled)"
        aria-label="Change profile picture"
        title="Change profile picture"
      >
        <i class="fas fa-camera"></i>
      </button>
    </div>

    <div v-if="error" class="alert alert-danger py-2 small">
      <i class="fas fa-exclamation-circle me-1"></i>
      {{ error }}
      <button 
        type="button" 
        class="btn-close btn-close-sm ms-2" 
        aria-label="Close" 
        @click="error = null"
      ></button>
    </div>

    <div class="text-center text-muted small">
      <span v-if="!isUploading">Click the camera button to change your profile picture</span>
      <span v-else>Uploading... {{ uploadProgress }}%</span>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="d-none"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useProfileStore } from '@/stores/profileStore';
import { UploadStatus } from '@/types/student';
import type { ImageUploadOptions } from '@/types/student';

const props = defineProps<{
  currentImageUrl?: string | null;
  defaultImage?: string;
  disabled?: boolean;
  options?: ImageUploadOptions;
}>();

// Fix the emits to be properly typed
const emit = defineEmits<{
  (e: 'update:image', url: string): void;
  (e: 'upload-start'): void;
  (e: 'upload-complete', url: string): void;
  (e: 'upload-error', error: string): void;
}>();

const profileStore = useProfileStore();
const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(props.currentImageUrl || null);
const error = ref<string | null>(null);

// Reactive computed properties based on store state
const uploadStatus = computed(() => profileStore.imageUploadState.status);
const uploadProgress = computed(() => profileStore.imageUploadState.progress);
const isUploading = computed(() => uploadStatus.value === UploadStatus.Uploading);

// Default image if none provided
const defaultImage = computed(() => props.defaultImage || '/default-avatar.png');

function triggerFileInput() {
  if (fileInput.value && !isUploading.value && !props.disabled) {
    fileInput.value.click();
  }
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (!files || files.length === 0) {
    return;
  }
  
  const file = files[0];
  // Additional check to ensure file is defined
  if (!file) {
    error.value = "Invalid file selected";
    return;
  }

  error.value = null;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = "Please select an image file (JPEG, PNG, etc.)";
    target.value = '';
    return;
  }
  
  // Validate file size (5MB default)
  const maxSizeMB = props.options?.maxSizeMB || 5;
  if (file.size > maxSizeMB * 1024 * 1024) {
    error.value = `File is too large. Maximum size is ${maxSizeMB}MB.`;
    target.value = '';
    return;
  }
  
  try {
    emit('upload-start');
    
    // Create a local preview URL
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = URL.createObjectURL(file);
    
    // Upload to Firebase Storage and update profile
    const success = await profileStore.updateProfileImage(file, props.options);
    
    if (success && profileStore.imageUploadState.downloadURL) {
      previewUrl.value = profileStore.imageUploadState.downloadURL;
      emit('update:image', profileStore.imageUploadState.downloadURL);
      emit('upload-complete', profileStore.imageUploadState.downloadURL);
    } else {
      throw new Error(profileStore.actionError || 'Upload failed');
    }
  } catch (err: any) {
    const errorMessage = err?.message || 'Failed to upload image';
    error.value = errorMessage;
    // Fix the emit call to ensure error is always a string
    emit('upload-error', errorMessage);
  } finally {
    // Reset file input
    if (target) target.value = '';
  }
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement;
  img.src = defaultImage.value;
}

// Watch for external changes to currentImageUrl
watch(() => props.currentImageUrl, (newUrl) => {
  if (newUrl !== undefined) {
    previewUrl.value = newUrl;
  }
});

// Watch for store state changes
watch(() => profileStore.imageUploadState, (state) => {
  if (state.status === UploadStatus.Error && state.error) {
    error.value = state.error;
  }
}, { deep: true });

// Clean up on unmount
onMounted(() => {
  // Initialize with current image URL if available
  if (props.currentImageUrl) {
    previewUrl.value = props.currentImageUrl;
  }
});

onBeforeUnmount(() => {
  profileStore.resetImageUploadState();
  // Revoke any object URLs to prevent memory leaks
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<style scoped>
.profile-image-uploader {
  display: inline-block;
}

.profile-image {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 3px solid var(--bs-light);
  box-shadow: var(--bs-box-shadow-sm);
  transition: all 0.3s ease;
}

.profile-image:hover {
  border-color: var(--bs-primary);
  transform: scale(1.02);
}

.profile-image.uploading {
  filter: brightness(0.7);
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  color: var(--bs-white);
}

.image-preview {
  display: inline-block;
}

.btn-close-sm {
  font-size: 0.65rem;
}

/* Ensure the button is prominently visible */
.btn-primary.rounded-circle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  transform: translate(5px, 5px);
}

.btn-primary.rounded-circle:hover {
  transform: translate(5px, 5px) scale(1.1);
}

/* Animation for the alert */
.alert-danger {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
