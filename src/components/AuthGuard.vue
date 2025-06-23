<template>
  <div>
    <!-- Show a loading indicator while the initial auth check is in progress -->
    <div v-if="isLoading" class="text-center p-3">
      <div class="spinner-border spinner-border-sm text-secondary" role="status">
        <span class="visually-hidden">Loading authentication...</span>
      </div>
    </div>

    <!-- Show the protected content when authenticated -->
    <slot v-else-if="isAuthenticated"></slot>

    <!-- Show the public/fallback content when not authenticated -->
    <div v-else>
      <slot name="public">
        <!-- Default fallback UI if no #public slot is provided -->
        <div
          class="alert alert-warning text-center p-4 border-warning-subtle"
          role="alert"
          style="background-color: var(--bs-warning-bg-subtle); border-radius: var(--bs-border-radius);"
        >
          <div class="mb-2">
             <i class="fas fa-lock fa-2x text-warning-emphasis"></i>
          </div>
          <h5 class="h5 fw-medium mb-1 text-body">Authentication Required</h5>
          <p class="small mb-3 text-secondary">{{ message || 'Please log in to access this feature.' }}</p>
          <router-link
            :to="{ path: '/login', query: { redirect: $route.fullPath } }"
            class="btn btn-primary btn-sm d-inline-flex align-items-center"
          >
            <i class="fas fa-sign-in-alt me-1"></i>
            <span>Log In</span>
          </router-link>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useAppStore } from '@/stores/appStore';

defineProps<{ message?: string }>();

const { isAuthenticated, isInitialized } = useAuth();
const appStore = useAppStore();

// Loading is true only until the initial auth check is complete.
const isLoading = computed(() => !isInitialized.value && !appStore.hasFetchedInitialAuth);
</script>