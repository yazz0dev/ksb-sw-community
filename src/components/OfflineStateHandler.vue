<template>
  <CBox v-if="!isOnline" position="fixed" insetX="0" top="0" zIndex="banner">
    <CFlex
      bg="error.50"
      color="error.700"
      p="4"
      boxShadow="md"
      borderBottomWidth="1px"
      borderColor="error.200"
      justify="space-between"
      align="center"
    >
      <CFlex align="center">
        <CIcon name="fa-wifi-slash" mr="2" />
        <CText>You are currently offline. Some features may be limited.</CText>
      </CFlex>
      <CButton
        variant="link"
        size="sm"
        color="error.700"
        textDecoration="underline"
        :_hover="{ color: 'error.800' }"
        @click="checkConnection"
      >
        Retry
      </CButton>
    </CFlex>
  </CBox>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import {
  Box as CBox,
  Flex as CFlex,
  Text as CText,
  Button as CButton,
  Icon as CIcon
} from '@chakra-ui/vue-next';

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
