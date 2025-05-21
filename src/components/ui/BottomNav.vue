<template>
  <nav class="bottom-nav navbar fixed-bottom navbar-light bg-white shadow-lg d-flex d-lg-none">
    <div class="container-fluid d-flex justify-content-between align-items-center px-0">
      <router-link
        to="/"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill text-secondary nav-link-transition"
        active-class="active"
      >
        <span class="fs-4 mb-1"><i class="fas fa-home"></i></span>
        <span class="fs-7">Home</span>
      </router-link>

      <!-- Event Request Link  -->
      <router-link
        v-if="isAuthenticated"
        to="/request-event"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill text-secondary nav-link-transition"
        active-class="active"
      >
        <span class="fs-4 mb-1"><i class="fas fa-calendar-plus"></i></span>
        <span class="fs-7">Request</span>
      </router-link>

      <!-- Leaderboard -->
      <router-link
        to="/leaderboard"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill text-secondary nav-link-transition"
        active-class="active"
      >
        <span class="fs-4 mb-1"><i class="fas fa-trophy"></i></span>
        <span class="fs-7">Leaderboard</span>
      </router-link>

      <!-- Profile (User Only) -->
      <router-link
        v-if="typeof isAuthenticated === 'boolean'"
        to="/profile"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill text-secondary nav-link-transition"
        active-class="active"
      >
        <!-- Profile Pic or Icon -->
        <figure v-if="userProfilePicUrl && !imgError" class="mb-1 profile-pic-figure">
          <img
            class="rounded-circle border"
            :src="userProfilePicUrl"
            :alt="userName || 'Profile'"
            width="28"
            height="28"
            @error="handleImageError"
          />
        </figure>
        <span v-else class="fs-4 mb-1"><i class="fas fa-user-circle"></i></span>
        <span class="fs-7">Profile</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUserStore } from '@/store/studentProfileStore';

const userStore = useUserStore();
const imgError = ref<boolean>(false);

// Computed properties with type annotations
const isAuthenticated = computed<boolean>(() => userStore.isAuthenticated);
const userProfilePicUrl = computed<string | null>(() => userStore.currentUser?.photoURL ?? null);
const userName = computed<string | null>(() => userStore.currentUser?.name ?? null);

const handleImageError = (): void => {
  imgError.value = true;
};

</script>

<style scoped>
.bottom-navbar {
  position: fixed !important;
  bottom: 0 !important;
  left: 0;
  right: 0;
  width: 100%;
  height: 64px;
  z-index: 1040;
  background-color: var(--bs-body-bg);
  border-top: 1px solid var(--bs-border-color);
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  padding: 0;
  margin: 0;
  transform: translateY(0);
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}

.nav-link-transition {
  transition: color 0.2s ease-in-out;
}

img.rounded-circle {
  object-fit: cover;
}

.navbar {
  position: fixed !important; /* Override any other position values */
  bottom: 0 !important;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 1040; /* Higher than other elements */
  background-color: var(--bs-body-bg);
  border-top: 1px solid var(--bs-border-color);
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  margin: 0; /* Reset any margins */
  padding: 0; /* Reset padding and handle it in the nav items */
}

/* Ensure content doesn't get hidden behind the nav */
.nav-link {
  border-top: 3px solid transparent; /* Reserve space for active indicator */
  /* padding adjusted via flex properties */
  height: 100%; /* Ensure links fill height */
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
}

.nav-link:hover,
.nav-link:focus {
    color: var(--bs-primary) !important; /* Bootstrap primary color on hover/focus */
    background-color: transparent !important; /* Prevent background */
    border-top-color: transparent;
    outline: none;
}

.nav-link.active {
  border-top-color: var(--bs-primary);
  color: var(--bs-primary) !important;
  font-weight: 500; /* Bootstrap medium weight */
  background-color: transparent !important;
}

/* Icon and text color for active state */
.nav-link.active .fas,
.nav-link.active span {
    color: var(--bs-primary) !important; /* Ensure icons/text also use primary color */
}

/* Ensure secondary color is used for non-active icons/text */
.nav-link:not(.active) .fas,
.nav-link:not(.active) span {
    color: var(--bs-secondary);
}
.nav-link:hover .fas,
.nav-link:hover span {
    color: var(--bs-primary);
}

/* Specific style for profile image container */
.profile-pic-figure {
  width: 28px;
  height: 28px;
  display: flex; /* Use flex to center the image if it's smaller */
  align-items: center;
  justify-content: center;
}

.fs-7 {
    font-size: 0.75rem !important; /* Define fs-7 if not globally available */
}

/* Add transition for scroll hiding */
.bottom-nav {
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}

.nav-hidden {
  transform: translateY(100%) !important;
}

/* Add iOS safe area support */
@supports (padding: max(0px)) {
  .bottom-navbar {
    height: calc(64px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>