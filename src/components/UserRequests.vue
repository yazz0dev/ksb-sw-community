// src/components/UserRequests.vue
<template>
  <div class="bg-surface rounded-lg shadow-md p-5 border border-border">
    <div v-if="loadingRequests" class="flex justify-center py-6">
      <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="ml-2 text-text-secondary">Loading...</span>
    </div>
    <div v-else-if="requests.length === 0 && !errorMessage" class="bg-info-light border border-info-light text-info-dark p-6 rounded-lg text-center text-sm italic shadow-sm">
      <i class="fas fa-calendar-times block text-2xl mb-2 text-info-dark"></i> No pending requests
    </div>
    <transition name="fade">
      <div v-if="!loadingRequests && requests.length > 0" class="flow-root">
        <ul role="list" class="-my-3 divide-y divide-border">
          <li v-for="request in requests" :key="request.id" class="py-3">
            <h5 class="text-md font-semibold text-text-primary mb-0.5">{{ request.eventName }}</h5>
            <p class="text-sm text-text-secondary mb-0">
              Status: <span :class="getStatusClass(request.status)" class="font-medium">{{ request.status }}</span>
            </p>
          </li>
        </ul>
      </div>
    </transition>
    <div v-if="errorMessage" class="text-error text-center py-4 font-medium">{{ errorMessage }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from 'vuex';

const store = useStore();
const requests = ref([]);
const loadingRequests = ref(true);
const errorMessage = ref('');

const getStatusClass = (status) => {
  const classes = {
    'Pending': 'text-warning-dark bg-warning-light px-2 py-0.5 rounded-full text-xs',
    'Approved': 'text-success-dark bg-success-light px-2 py-0.5 rounded-full text-xs',
    'Rejected': 'text-error-dark bg-error-light px-2 py-0.5 rounded-full text-xs'
  };
  return classes[status] || 'text-neutral-dark bg-neutral-light px-2 py-0.5 rounded-full text-xs';
};

const fetchRequests = async () => {
  const user = store.getters['user/getUser'];
  if (!user?.uid) {
      errorMessage.value = 'User not logged in.';
      loadingRequests.value = false;
      return;
  }

  try {
    loadingRequests.value = true;
    errorMessage.value = '';
    const q = query(
      collection(db, 'userRequests'),
      where('userId', '==', user.uid)
    );
    const querySnapshot = await getDocs(q);
    requests.value = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching requests:', error);
    errorMessage.value = 'Unable to load requests at this time';
    requests.value = [];
  } finally {
    loadingRequests.value = false;
  }
};

onMounted(fetchRequests);

</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
