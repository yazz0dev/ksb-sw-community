// /src/components/UserCard.vue
<template>
  <!-- Simplified User Card - Removed Rating Display -->
  <div class="d-flex align-items-center p-3 user-card-simple">
    <!-- Display User Name -->
    <p class="fs-7 fw-medium text-primary mb-0 username-text">
      <i class="fas fa-user me-1 text-secondary fa-xs"></i> 
      {{ name || `User (${userId.substring(0, 5)}...)` }}
    </p>
    <!-- Potential future addition: Display total XP -->
    <!-- <span v-if="totalXp !== null" class="ms-2 badge bg-light text-dark border">
      {{ totalXp }} XP
    </span> -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/studentProfileStore';

interface Props {
  userId: string;
}

const props = defineProps<Props>();

const userStore = useUserStore();
const name = ref<string | null>(null);
// const totalXp = ref<number | null>(null); // Optional: If you want to display total XP

const fetchUserData = async (): Promise<void> => {
  // Fetch name from cache or store
  const cachedName = userStore.getCachedUserName(props.userId);
  if (cachedName) {
    name.value = cachedName;
  } else {
    // Optionally fetch if not in cache (might be less efficient if called many times)
    // const names = await userStore.fetchUserNamesBatch([props.userId]);
    // name.value = names[props.userId] || `User (${props.userId.substring(0, 5)}...)`;
    name.value = `User (${props.userId.substring(0, 5)}...)`; // Fallback if not fetching here
  }

  // Optional: Fetch total XP if needed
  // This requires ensuring the user's full data (including xpByRole) is loaded
  // const userProfile = await userStore.fetchUserProfileData(props.userId); // This might be too heavy here
  // const userProfile = userStore.getUserById(props.userId) // If you have such a getter
  // if (userProfile?.xpByRole) {
  //   totalXp.value = Object.values(userProfile.xpByRole).reduce((sum, val) => sum + (Number(val) || 0), 0);
  // }
};

onMounted(fetchUserData);

</script>

<style scoped>
/* Define fs-7 if not already defined globally */
.fs-7 {
    font-size: 0.875rem !important; /* Adjust size as needed */
}
.user-card-simple {
    background-color: var(--bs-light);
    border-bottom: 1px solid var(--bs-border-color-translucent);
    transition: background-color 0.2s ease-in-out;
}
.user-card-simple:hover {
    background-color: var(--bs-tertiary-bg);
}
.username-text {
    /* Prevent long names from breaking layout */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.fa-xs {
  font-size: 0.75em; /* Smaller icon */
  vertical-align: baseline; /* Align icon nicely with text */
}
</style>