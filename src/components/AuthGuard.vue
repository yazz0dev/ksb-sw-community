<template>
  <div>
    <!-- Show content when authenticated -->
    <slot v-if="isAuthenticated"></slot>

    <!-- Auth required message -->
    <div v-else class="relative">
      <slot name="public" v-if="$slots.public"></slot>
      
      <div v-else class="bg-neutral-light border border-border rounded-lg p-4 text-center">
        <i class="fas fa-lock text-neutral-dark mb-2 text-xl"></i>
        <h3 class="text-sm font-medium text-text-primary mb-1">Authentication Required</h3>
        <p class="text-sm text-text-secondary mb-3">{{ message || 'Please log in to access this feature' }}</p>
        <router-link
          to="/login"
          class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark transition-colors"
        >
          <i class="fas fa-sign-in-alt mr-2"></i>
          Log In
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
  message: {
    type: String,
    default: ''
  }
});

const store = useStore();
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
</script>
