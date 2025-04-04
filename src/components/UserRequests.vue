// src/components/UserRequests.vue
<template>
  <div class="user-requests bg-white shadow rounded-lg p-4">
    <div v-if="loadingRequests" class="flex justify-center items-center py-6">
      <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="ml-2 text-gray-600">Loading...</span>
    </div>
    <div v-else-if="requests.length === 0 && !errorMessage" class="text-center text-gray-500 py-6">
      No pending requests
    </div>
    <transition name="fade">
      <div v-if="!loadingRequests && requests.length > 0" class="flow-root">
        <ul role="list" class="-my-3 divide-y divide-gray-200">
          <li v-for="request in requests" :key="request.id" class="py-3">
            <h5 class="text-md font-semibold text-gray-800 mb-0.5">{{ request.eventName }}</h5>
            <p class="text-sm text-gray-500 mb-0">
              Status: <span :class="getStatusClass(request.status)" class="font-medium">{{ request.status }}</span>
            </p>
          </li>
        </ul>
      </div>
    </transition>
    <div v-if="errorMessage" class="text-red-600 text-center py-4 font-medium">{{ errorMessage }}</div>
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
    'Pending': 'text-yellow-600',
    'Approved': 'text-green-600',
    'Rejected': 'text-red-600'
  };
  return classes[status] || 'text-gray-500';
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
