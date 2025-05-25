<template>
  <div>
    <!-- Show content when authenticated -->
    <slot v-if="isAuthenticated"></slot>

    <!-- Auth required message -->
    <div v-else>
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
          to="/login" 
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
import { useStudentProfileStore } from '../stores/studentProfileStore';

interface Props {
  message?: string;
}

const props = withDefaults(defineProps<Props>(), {
  message: ''
});

const userStore = useStudentProfileStore();
const isAuthenticated = computed<boolean>(() => userStore.isAuthenticated);
</script>


