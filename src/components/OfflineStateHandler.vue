<template>
  <div v-if="!isOnline" class="fixed inset-x-0 top-0 z-50">
    <div class="bg-error-light text-error-dark p-4 shadow-md border-b border-error flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas fa-wifi-slash mr-2"></i>
        <span>You are currently offline. Some features may be limited.</span>
      </div>
      <button @click="checkConnection" class="text-sm underline hover:text-error-dark focus:outline-none">
        Retry
      </button>
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
  store.dispatch('app/syncOfflineChanges');
};

const handleOffline = () => {
  isOnline.value = false;
  store.commit('app/SET_ONLINE_STATUS', false);
};

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  checkConnection();
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});
</script>
