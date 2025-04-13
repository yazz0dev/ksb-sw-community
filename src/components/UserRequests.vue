<template>
  <CBox bg="surface" borderRadius="lg" shadow="md" p="5" borderWidth="1px" borderColor="border">
    <CFlex v-if="loadingRequests" justify="center" py="6" align="center">
      <CSpinner size="lg" color="primary" thickness="4px" />
      <CText ml="2" color="text-secondary">Loading...</CText>
    </CFlex>

    <CAlert
      v-else-if="requests.length === 0 && !errorMessage"
      status="info"
      variant="subtle"
      borderRadius="lg"
      textAlign="center"
      fontSize="sm"
      fontStyle="italic"
    >
      <CIcon name="fa-calendar-times" fontSize="2xl" mb="2" color="info.700" />
      <CAlertDescription>No pending requests</CAlertDescription>
    </CAlert>

    <transition name="fade">
      <CBox v-if="!loadingRequests && requests.length > 0">
        <CStack divider={<CDivider />} spacing="3">
          <CBox v-for="request in requests" :key="request.id" py="3">
            <CHeading size="sm" color="text-primary" mb="0.5">
              {{ request.eventName }}
            </CHeading>
            <CFlex align="center">
              <CText fontSize="sm" color="text-secondary" mr="2">Status:</CText>
              <CBadge :colorScheme="getStatusColor(request.status)" variant="subtle">
                {{ request.status }}
              </CBadge>
            </CFlex>
          </CBox>
        </CStack>
      </CBox>
    </transition>

    <CAlert v-if="errorMessage" status="error" mt="4">
      <CAlertDescription>{{ errorMessage }}</CAlertDescription>
    </CAlert>
  </CBox>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from 'vuex';
import {
  Box as CBox,
  Flex as CFlex,
  Stack as CStack,
  Heading as CHeading,
  Text as CText,
  Badge as CBadge,
  Alert as CAlert,
  AlertDescription as CAlertDescription,
  Spinner as CSpinner,
  Icon as CIcon,
  Divider as CDivider
} from '@chakra-ui/vue-next';

const store = useStore();
const requests = ref([]);
const loadingRequests = ref(true);
const errorMessage = ref('');

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending': return 'yellow';
    case 'Approved': return 'green';
    case 'Rejected': return 'red';
    default: return 'gray';
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
