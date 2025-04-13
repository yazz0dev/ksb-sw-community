<template>
  <CBox position="fixed" top="4" right="4" zIndex="overlay">
    <CStack spacing="2" w="80">
      <transition-group name="notification">
        <CFlex
          v-for="notification in notifications"
          :key="notification.id"
          direction="row"
          align="start"
          p="4"
          borderRadius="lg"
          boxShadow="lg"
          borderLeftWidth="4px"
          :borderColor="getTypeBorderColor(notification.type)"
          :bg="getTypeBgColor(notification.type)"
          transform="auto"
          transition="all 0.3s"
        >
          <CIcon
            :name="getTypeIcon(notification.type)"
            :color="getTypeIconColor(notification.type)"
            mr="3"
            flexShrink="0"
          />
          <CBox flex="1" mr="2">
            <CText v-if="notification.title" fontWeight="medium" fontSize="sm">
              {{ notification.title }}
            </CText>
            <CText fontSize="sm" :mt="notification.title ? '1' : '0'">
              {{ notification.message }}
            </CText>
          </CBox>
          <CIconButton
            size="sm"
            variant="ghost"
            icon={<CIcon name="fa-times" />}
            onClick={() => dismissNotification(notification.id)}
            aria-label="Dismiss notification"
            color="gray.400"
            _hover={{ color: 'gray.600' }}
          />
        </CFlex>
      </transition-group>
    </CStack>
  </CBox>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import {
  Box as CBox,
  Stack as CStack,
  Flex as CFlex,
  Text as CText,
  Icon as CIcon,
  IconButton as CIconButton
} from '@chakra-ui/vue-next'

const store = useStore();
const notifications = computed(() => store.state.app.notifications || []);

const dismissNotification = (id) => {
  store.dispatch('app/dismissNotification', id);
};

const getTypeBorderColor = (type) => {
  switch (type) {
    case 'success': return 'var(--color-success)';
    case 'error': return 'var(--color-error)';
    case 'warning': return 'var(--color-warning)';
    case 'info': default: return 'var(--color-info)';
  }
};

const getTypeBgColor = (type) => {
  switch (type) {
    case 'success': return 'var(--color-success-light)';
    case 'error': return 'var(--color-error-light)';
    case 'warning': return 'var(--color-warning-light)';
    case 'info': default: return 'var(--color-info-light)';
  }
};

const getTypeIconColor = (type) => {
  switch (type) {
    case 'success': return 'var(--color-success)';
    case 'error': return 'var(--color-error)';
    case 'warning': return 'var(--color-warning)';
    case 'info': default: return 'var(--color-info)';
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'error': return 'fa-exclamation-circle';
    case 'warning': return 'fa-exclamation-triangle';
    case 'info': default: return 'fa-info-circle';
  }
};
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}
.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
