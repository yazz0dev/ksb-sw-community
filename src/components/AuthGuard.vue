<template>
  <div>
    <!-- Show a loading indicator or nothing while initial auth is being fetched -->
    <div v-if="isLoading">
      <div class="text-center p-3">
        <div class="spinner-border spinner-border-sm text-secondary" role="status">
          <span class="visually-hidden">Loading authentication...</span>
        </div>
      </div>
    </div>
    <!-- Show content when authenticated -->
    <slot v-else-if="isAuthenticated"></slot>

    <!-- Auth required message, only after initial auth attempt -->
    <div 
      v-else-if="initialAuthAttempted && !isAuthenticated"
    >
      <slot name="public" v-if="$slots.public"></slot>
      
      <div 
        v-else 
        class="alert alert-warning text-center p-4 border-warning-subtle"
        role="alert"
        style="background-color: var(--bs-warning-bg-subtle); border-radius: var(--bs-border-radius);"
      >
        <div class="mb-2">
           <i class="fas fa-lock fa-2x text-warning-emphasis"></i>
        </div>
        <h5 class="h5 fw-medium mb-1 text-body">Authentication Required</h5>
        <p class="small mb-3 text-secondary">{{ message || 'Please log in to access this feature' }}</p>
        <router-link 
          :to="{ path: '/login', query: { redirect: $route.fullPath } }"
          class="btn btn-primary btn-sm d-inline-flex align-items-center"
        >
          <i class="fas fa-sign-in-alt me-1"></i>
          <span>Log In</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProfileStore } from '../stores/profileStore';
import { useAppStore } from '../stores/appStore';
import { auth as firebaseAuth } from '@/firebase';
import { useAuth } from '@/composables/useAuth';

// Add this to define the message prop for template usage
const { message = '' } = defineProps<{ message?: string }>();

const studentStore = useProfileStore();
const appStore = useAppStore();
const auth = useAuth();

// isLoading is now a computed property based on the app store's initial auth fetch status
const isLoading = computed<boolean>(() => !appStore.hasFetchedInitialAuth);

// Use both the auth composable and a direct check of Firebase Auth
const isAuthenticated = computed<boolean>(() => {
  // Check Firebase auth directly as a fallback
  const firebaseUser = firebaseAuth.currentUser;
  
  // Return true if either the auth composable says we're authenticated,
  // the store says we're authenticated, or Firebase has a user
  return auth.isAuthenticated.value || studentStore.isAuthenticated || !!firebaseUser;
});

const initialAuthAttempted = computed<boolean>(() => appStore.hasFetchedInitialAuth);
</script>


