// src/components/UserRequests.vue
<template>
  <div class="user-requests">
    <div v-if="loadingRequests" class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary"></div>
    </div>
    <div v-else-if="requests.length === 0" class="text-center text-muted py-3">
      No pending requests
    </div>
    <div v-else class="list-group list-group-flush">
      <div v-for="request in requests" :key="request.id" class="list-group-item px-0">
        <h5 class="mb-1">{{ request.eventName }}</h5>
        <p class="mb-1 small text-muted">
          Status: <span :class="getStatusClass(request.status)">{{ request.status }}</span>
        </p>
      </div>
    </div>
    <div v-if="errorMessage" class="text-danger text-center py-3">{{ errorMessage }}</div>
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

const getStatusClass = (status) => {
  const classes = {
    'Pending': 'text-warning',
    'Approved': 'text-success',
    'Rejected': 'text-danger'
  };
  return classes[status] || 'text-muted';
};

const fetchRequests = async () => {
  const user = store.getters['user/getUser'];
  if (!user?.uid) return;

  try {
    loadingRequests.value = true;
    const q = query(
      collection(db, 'userRequests'),  // Changed from eventRequests to userRequests
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
  } finally {
    loadingRequests.value = false;
  }
};

onMounted(fetchRequests);

// Add error message ref
const errorMessage = ref('');
</script>
