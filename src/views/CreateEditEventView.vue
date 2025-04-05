<template>
    <!-- ... -->
</template>

<script setup lang="ts">
    // ... 

    // --- Event Statuses ---
    const availableEventStatuses = [
        'Approved', 'Rejected', 'Pending', 'InProgress', 'Completed', 'Cancelled'
    ] as const; // Use 'as const' for stricter typing if needed, or just string[]

    // ... 
</script>

<style scoped>
    /* ... */
</style>
