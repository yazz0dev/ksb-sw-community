<template>
  <div>
    <!-- Show content when authenticated -->
    <slot v-if="isAuthenticated"></slot>

    <!-- Auth required message -->
    <div v-else>
      <slot name="public" v-if="$slots.public"></slot>
      
      <div 
        v-else 
        class="message is-warning"
        style="background-color: var(--color-neutral-light); border: 1px solid var(--color-border);"
      >
        <div class="message-body has-text-centered">
          <p class="mb-2">
             <span class="icon is-large" style="color: var(--color-neutral-dark);">
               <i class="fas fa-lock fa-2x"></i>
             </span>
          </p>
          <h3 class="title is-5 has-text-weight-medium mb-1" style="color: var(--color-text-primary);">Authentication Required</h3>
          <p class="is-size-7 mb-3" style="color: var(--color-text-secondary);">{{ message || 'Please log in to access this feature' }}</p>
          <router-link 
            to="/login" 
            class="button is-primary is-small"
            style="color: var(--color-primary-text); background-color: var(--color-primary); transition: background-color 0.2s;"
            @mouseover="$event.target.style.backgroundColor = 'var(--color-primary-dark)'"
            @mouseout="$event.target.style.backgroundColor = 'var(--color-primary)'"
          >
            <span class="icon is-small">
              <i class="fas fa-sign-in-alt"></i>
            </span>
            <span>Log In</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
// Removed Chakra UI imports
// import { CBox, CButton, CIcon, CText, CHeading } from '@chakra-ui/vue-next';

const props = defineProps({
  message: {
    type: String,
    default: ''
  }
});

const store = useStore();
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
</script>

<style scoped>
/* Optional: Add custom styles if needed */
.message.is-warning {
    border-radius: 6px; /* Match Chakra's borderRadius='lg' */
}
</style>
