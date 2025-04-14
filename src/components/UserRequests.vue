<template>
  <div class="user-requests-container bg-light p-4 rounded border shadow-sm">
    <div v-if="loadingRequests" class="text-center py-5">
      <div class="spinner-border text-primary mb-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-secondary">Loading requests...</p>
    </div>

    <div
      v-else-if="requests.length === 0 && !errorMessage"
      class="alert alert-info text-center small p-3"
      role="alert"
    >
      <div class="mb-2 text-info-emphasis">
        <i class="fas fa-calendar-times fa-2x"></i>
      </div>
      <p class="mb-0" style="font-style: italic;">No pending requests found.</p>
    </div>

    <transition name="fade">
      <div v-if="!loadingRequests && requests.length > 0">
        <div v-for="(request, index) in requests" :key="request.id" class="py-3 request-item">
          <h6 class="h6 text-primary mb-1">
            {{ request.eventName }}
          </h6>
          <div class="d-flex align-items-center">
            <small class="text-secondary me-2">Status:</small>
            <span :class="['badge rounded-pill', getStatusClass(request.status)]">
              {{ request.status }}
            </span>
          </div>
        </div>
      </div>
    </transition>

    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show mt-4" role="alert">
      {{ errorMessage }}
      <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from 'vuex';

interface Request {
    id: string;
    eventName: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    [key: string]: any;
}

const store = useStore();
const requests = ref<Request[]>([]);
const loadingRequests = ref<boolean>(true);
const errorMessage = ref<string>('');

const getStatusClass = (status: Request['status']): string => {
    switch (status) {
        case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
        case 'Approved': return 'bg-success-subtle text-success-emphasis';
        case 'Rejected': return 'bg-danger-subtle text-danger-emphasis';
        default: return 'bg-secondary-subtle text-secondary-emphasis';
    }
};

const fetchRequests = async (): Promise<void> => {
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
            collection(db, 'eventRequests'),
            where('requester', '==', user.uid),
            where('status', '==', 'Pending')
        );
        const querySnapshot = await getDocs(q);
        requests.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Request));
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

.request-item + .request-item {
    border-top: 1px solid var(--bs-border-color); /* Use Bootstrap border color */
}

</style>
