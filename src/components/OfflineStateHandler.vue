<template>
  <div v-if="!isOnline" class="alert alert-danger rounded-0 fixed-top p-0" style="z-index: 1040;" role="alert"> 
    <div class="d-flex justify-content-between align-items-center mx-4 my-2">
      <!-- Left side -->
      <div class="d-flex align-items-center">
        <span class="me-2">
          <i class="fas fa-wifi"></i> <!-- Slash added via CSS -->
        </span>
        <span>You are currently offline. Some features may be limited.</span>
      </div>

      <!-- Right side -->
      <div>
        <button class="btn btn-link text-danger text-decoration-underline btn-sm p-0" @click="checkConnection">
          Retry
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const isOnline = ref(navigator.onLine);

const checkConnection = () => {
  isOnline.value = navigator.onLine;
  store.commit('app/SET_ONLINE_STATUS', isOnline.value);
};

const handleOnline = () => {
  isOnline.value = true;
  store.commit('app/SET_ONLINE_STATUS', true);
  // Optionally sync changes when back online
  // store.dispatch('app/syncOfflineChanges');
};

const handleOffline = () => {
  isOnline.value = false;
  store.commit('app/SET_ONLINE_STATUS', false);
};

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  // Initial check
  checkConnection();
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});
</script>

<style scoped>
/* Add the slash through the wifi icon */
.fa-wifi {
  position: relative; /* Needed for absolute positioning of pseudo-element */
  display: inline-block; /* Ensure it takes space */
}
.fa-wifi::after {
  content: "/";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) rotate(20deg);
  font-weight: bold;
  font-size: 1.2em; /* Adjust size as needed */
  color: currentColor; /* Inherit icon color */
}

/* Ensure link button retains danger color */
.btn-link.text-danger {
  color: var(--bs-danger) !important;
}
.btn-link.text-danger:hover,
.btn-link.text-danger:focus {
  color: var(--bs-danger) !important; /* Keep color on hover/focus */
}
</style>
