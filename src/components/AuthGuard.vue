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
import { computed, ref, watch, onMounted } from 'vue';
import { useProfileStore } from '../stores/profileStore';
import { useAppStore } from '../stores/appStore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/composables/useAuth';

interface Props {
  message?: string;
  retryCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  retryCount: 3
});

const studentStore = useProfileStore();
const appStore = useAppStore();
const auth = useAuth();

const isLoading = ref(true);
const authAttempts = ref(0);
const maxAttempts = props.retryCount;

// Use both the auth composable and a direct check of Firebase Auth
const isAuthenticated = computed<boolean>(() => {
  // Check Firebase auth directly as a fallback
  const firebaseAuth = getAuth();
  const firebaseUser = firebaseAuth.currentUser;
  
  // Return true if either the auth composable says we're authenticated,
  // the store says we're authenticated, or Firebase has a user
  return auth.isAuthenticated.value || studentStore.isAuthenticated || !!firebaseUser;
});

const initialAuthAttempted = computed<boolean>(() => appStore.hasFetchedInitialAuth);

// Watch for changes in authentication state
watch([isAuthenticated, initialAuthAttempted], ([, newInitialAuth]) => {
  if (newInitialAuth) {
    isLoading.value = false;
  }
});

// Set up a direct Firebase auth listener to ensure we catch auth state changes
onMounted(() => {
  // If already initialized, skip loading state
  if (initialAuthAttempted.value) {
    isLoading.value = false;
    return;
  }
  
  // Maximum wait time for auth initialization
  const maxWaitTime = 3000; // 3 seconds
  
  // Simple timeout fallback
  const timeout = setTimeout(() => {
    isLoading.value = false;
    // Force refresh auth state
    auth.refreshAuthState().then(() => {
      if (!appStore.hasFetchedInitialAuth) {
        appStore.setHasFetchedInitialAuth(true);
      }
    });
  }, maxWaitTime);
  
  // Watch for initialization completion
  const unwatch = watch(initialAuthAttempted, (attempted) => {
    if (attempted) {
      isLoading.value = false;
      clearTimeout(timeout);
      unwatch();
    }
  });
  
  // Also set up a direct Firebase auth listener as a backup
  const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
    if (user && !isAuthenticated.value) {
      // We have a user but isAuthenticated is false - this indicates a sync issue
      // Force refresh the auth state
      auth.refreshAuthState();
    }
    
    if (!initialAuthAttempted.value && (authAttempts.value >= maxAttempts)) {
      // If we've tried enough times and still haven't marked auth as initialized,
      // force it to be initialized
      appStore.setHasFetchedInitialAuth(true);
    }
    
    authAttempts.value++;
    
    // Cleanup this listener after we've resolved auth state
    if (initialAuthAttempted.value) {
      unsubscribe();
    }
  });
});
</script>


