<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <!-- Header -->
        <div class="d-flex align-items-center mb-4">
          <button @click="router.back()" class="btn btn-link text-secondary text-decoration-none">
            <i class="fas fa-arrow-left me-2"></i> Back
          </button>
          <h1 class="h3 mb-0">Edit Profile</h1>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert alert-danger d-flex align-items-center mb-4">
          <i class="fas fa-exclamation-circle me-2"></i>
          {{ error }}
        </div>

        <!-- Edit Form -->
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <form @submit.prevent="saveProfileEdits" class="needs-validation" novalidate>
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
                <label class="form-label">Profile Image URL</label>
                <input v-model="form.photoURL" type="url" class="form-control" placeholder="https://..." />
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
import { useUserStore } from '@/store/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const loading = ref(false);
const error = ref('');
const form = ref({
  name: '',
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
  return form.value.name.trim().length > 0;
});

async function loadUserData() {
  const userId = route.params.id as string;
  if (!userId) {
    error.value = 'User ID not found';
    return;
  }
  loading.value = true;

  try {
    const userData = await userStore.fetchUserData(userId);

    if (!userData) {
      throw new Error('User not found');
    }

    form.value = {
      name: userData.name || '',
      photoURL: userData.photoURL || '',
      bio: userData.bio || '',
      socialLink: userData.socialLink || '',
      skills: Array.isArray(userData.skills) ? userData.skills.join(', ') : '',
      preferredRoles: Array.isArray(userData.preferredRoles) ? userData.preferredRoles.join(', ') : '',
      hasLaptop: userData.hasLaptop || false
    };
  } catch (err: any) {
    error.value = err?.message || 'Failed to load profile data';
    router.back();
  } finally {
    loading.value = false;
  }
}

async function saveProfileEdits() {
  if (!isFormValid.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const userId = route.params.id as string;
    
    const updatePayload = {
      name: form.value.name.trim(),
      photoURL: form.value.photoURL.trim(),
      bio: form.value.bio.trim(),
      socialLink: form.value.socialLink.trim(),
      skills: form.value.skills.split(',').map(s => s.trim()).filter(Boolean),
      preferredRoles: form.value.preferredRoles.split(',').map(r => r.trim()).filter(Boolean),
      hasLaptop: form.value.hasLaptop
    };

    await userStore.updateUserProfile({ userId, profileData: updatePayload });
    router.back();
  } catch (err: any) {
    error.value = err?.message || 'Failed to update profile';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadUserData();
});
</script>
