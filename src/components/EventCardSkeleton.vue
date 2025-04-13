<!-- src/components/EventCardSkeleton.vue -->
<template>
  <CBox 
    bg="var(--color-surface)" 
    borderRadius="lg" 
    boxShadow="sm" 
    borderWidth="1px" 
    borderColor="var(--color-border)" 
    overflow="hidden"
  >
    <CStack p="4" spacing="3">
      <!-- Placeholder for title -->
      <CSkeleton height="20px" width="75%" borderRadius="md" />
      <!-- Placeholder for date -->
      <CSkeleton height="16px" width="50%" borderRadius="md" />
      <!-- Placeholder for type/status -->
      <CSkeleton height="16px" width="33%" borderRadius="md" />
      <!-- Placeholder for participants/teams & icon -->
      <CFlex justify="space-between" align="center" pt="2">
        <CSkeleton height="16px" width="25%" borderRadius="md" />
        <CSkeletonCircle size="6" />
      </CFlex>
    </CStack>
  </CBox>
</template>

<script setup>
import { CBox, CStack, CSkeleton, CFlex, CSkeletonCircle } from '@chakra-ui/vue-next';
// No script logic needed for a simple skeleton
</script>
