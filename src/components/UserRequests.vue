<template>
  <div class="box p-5" style="background-color: var(--color-surface); border: 1px solid var(--color-border);">
    <div v-if="loadingRequests" class="has-text-centered py-6">
      <div class="loader is-loading is-large mx-auto mb-2" style="border-color: var(--color-primary); border-left-color: transparent;"></div>
      <p class="has-text-grey ml-2">Loading...</p>
    </div>

    <div
      v-else-if="requests.length === 0 && !errorMessage"
      class="notification is-info is-light has-text-centered is-size-7"
      style="border-radius: 6px; font-style: italic;"
    >
      <span class="icon is-large mb-2 has-text-info-dark">
        <i class="fas fa-calendar-times fa-2x"></i>
      </span>
      <p>No pending requests</p>
    </div>

    <transition name="fade">
      <div v-if="!loadingRequests && requests.length > 0">
        <div v-for="(request, index) in requests" :key="request.id" class="py-3 request-item">
          <h3 class="title is-6 has-text-primary mb-1">
            {{ request.eventName }}
          </h3>
          <div class="is-flex is-align-items-center">
            <p class="is-size-7 has-text-grey mr-2">Status:</p>
            <span :class="['tag', 'is-light', getStatusClass(request.status)]">
              {{ request.status }}
            </span>
          </div>
        </div>
      </div>
    </transition>

    <div v-if="errorMessage" class="notification is-danger is-light mt-4">
       <button class="delete" @click="errorMessage = ''"></button>
      {{ errorMessage }}
    </div>
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
  switch (status) {
    case 'Pending': return 'is-warning';
    case 'Approved': return 'is-success';
    case 'Rejected': return 'is-danger';
    default: return 'is-light'; // Default greyish tag
  }
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
      collection(db, 'eventRequests'), // Corrected collection name
      where('requester', '==', user.uid),
      where('status', '==', 'Pending') // Only fetch pending requests
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

.request-item + .request-item {
    border-top: 1px solid #dbdbdb; /* Bulma default border color */
}

/* Loader Styles (copied from other views) */
.loader {
  border-radius: 50%;
  border-width: 2px;
  border-style: solid;
  width: 2.5em; /* Adjusted size */
  height: 2.5em;
  animation: spinAround 1s infinite linear;
}
@keyframes spinAround {
  from { transform: rotate(0deg); }
  to { transform: rotate(359deg); }
}
.mx-auto { margin-left: auto; margin-right: auto; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.ml-2 { margin-left: 0.5rem; }
.mr-2 { margin-right: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.p-5 { padding: 1.25rem; }
</style>
