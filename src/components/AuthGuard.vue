<template>
  <CBox>
    <!-- Show content when authenticated -->
    <slot v-if="isAuthenticated"></slot>

    <!-- Auth required message -->
    <CBox v-else position="relative">
      <slot name="public" v-if="$slots.public"></slot>
      
      <CBox 
        v-else 
        bg="var(--color-neutral-light)" 
        borderWidth="1px" 
        borderColor="var(--color-border)" 
        borderRadius="lg" 
        p="4" 
        textAlign="center"
      >
        <CIcon name="fa-lock" color="var(--color-neutral-dark)" mb="2" fontSize="xl" />
        <CHeading as="h3" size="sm" fontWeight="medium" color="var(--color-text-primary)" mb="1">Authentication Required</CHeading>
        <CText fontSize="sm" color="var(--color-text-secondary)" mb="3">{{ message || 'Please log in to access this feature' }}</CText>
        <CButton 
          as="router-link" 
          to="/login" 
          colorScheme="primary" 
          size="sm" 
          color="var(--color-primary-text)" 
          bg="var(--color-primary)"
          :_hover="{ bg: 'var(--color-primary-dark)' }"
          transition="background-color 0.2s"
        >
          <CIcon name="fa-sign-in-alt" mr="2" />
          Log In
        </CButton>
      </CBox>
    </CBox>
  </CBox>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { CBox, CButton, CIcon, CText, CHeading } from '@chakra-ui/vue-next';

const props = defineProps({
  message: {
    type: String,
    default: ''
  }
});

const store = useStore();
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
</script>
