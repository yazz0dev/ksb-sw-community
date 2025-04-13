<template>
  <div v-if="!isOnline" class="notification is-danger is-light is-radiusless is-fixed-top is-fullwidth p-0" style="z-index: 1000;"> 
    <div class="level mx-4 my-2">
      <!-- Left side -->
      <div class="level-left">
        <div class="level-item">
          <span class="icon mr-2">
            <i class="fas fa-wifi"></i> <!-- Changed to fa-wifi, will add slash via CSS -->
          </span>
          <span>You are currently offline. Some features may be limited.</span>
        </div>
      </div>

      <!-- Right side -->
      <div class="level-right">
        <div class="level-item">
          <button class="button is-danger is-small is-inverted is-underlined" @click="checkConnection">
            Retry
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
// Removed Chakra UI imports

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

</style>
