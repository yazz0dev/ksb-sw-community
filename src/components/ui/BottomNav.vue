<template>
  <nav class="bottom-nav fixed-bottom bg-white shadow-lg d-flex d-lg-none">
    <div class="container-fluid d-flex justify-content-between align-items-stretch px-0">
      <router-link
        to="/"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center flex-fill"
        active-class="active"
        aria-label="Home"
      >
        <span class="nav-icon mb-1 h5"><i class="fas fa-home"></i></span>
        <span class="nav-text text-caption">Home</span>
      </router-link>

      <!-- Event Request Link  -->
      <router-link
        v-if="isAuthenticated"
        to="/request-event"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center flex-fill"
        active-class="active"
        aria-label="Request Event"
      >
        <span class="nav-icon mb-1 h5"><i class="fas fa-calendar-plus"></i></span>
        <span class="nav-text text-caption">Request</span>
      </router-link>

      <!-- Leaderboard -->
      <router-link
        to="/leaderboard"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center flex-fill"
        active-class="active"
        aria-label="Leaderboard"
      >
        <span class="nav-icon mb-1 h5"><i class="fas fa-trophy"></i></span>
        <span class="nav-text text-caption">Leaderboard</span>
      </router-link>

      <!-- Profile (User Only) -->
      <router-link
        v-if="typeof isAuthenticated === 'boolean'"
        to="/profile"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center flex-fill"
        active-class="active"
        aria-label="Profile"
      >
        <!-- Profile Pic or Icon -->
        <div class="nav-icon mb-1 h5">
          <img
            v-if="userProfilePicUrl && !imgError"
            class="profile-pic rounded-circle"
            :src="userProfilePicUrl"
            :alt="userName || 'Profile'"
            @error="handleImageError"
          />
          <i v-else class="fas fa-user-circle"></i>
        </div>
        <span class="nav-text text-caption">Profile</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProfileStore } from '@/stores/profileStore';

const studentStore = useProfileStore();
const imgError = ref<boolean>(false);

// Computed properties with type annotations
const isAuthenticated = computed<boolean>(() => studentStore.isAuthenticated);
const userProfilePicUrl = computed<string | null>(() => studentStore.currentStudent?.photoURL ?? null);
const userName = computed<string | null>(() => studentStore.currentStudent?.name ?? null);

const handleImageError = (): void => {
  imgError.value = true;
};
</script>

<style scoped>
.bottom-nav {
  height: var(--bottom-nav-height-mobile);
  z-index: 1040;
  border-top: 1px solid var(--bs-border-color);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: var(--bs-white) !important;
}

/* Ensure BottomNav is completely hidden on desktop */
@media (min-width: 992px) {
  .bottom-nav {
    display: none !important;
  }
}

.nav-link {
  color: var(--bs-secondary);
  text-decoration: none;
  padding: 0.5rem 0.25rem;
  border-top: 3px solid transparent; /* keeping transparent border for consistent spacing */
  transition: color 0.2s ease, border-color 0.2s ease;
  position: relative;
  min-height: var(--bottom-nav-height-mobile);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.nav-link:hover,
.nav-link:focus {
  color: var(--bs-primary);
  text-decoration: none;
  outline: none;
}

.nav-link.active {
  color: var(--bs-primary);
  font-weight: 600;
}

.nav-icon {
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  width: 28px;
  transition: transform 0.2s ease;
}

.nav-link.active .nav-icon {
  transform: translateY(-2px);
}

.nav-text {
  line-height: 1.2;
  font-weight: 500;
}

.nav-link.active .nav-text {
  font-weight: 600;
}

.profile-pic {
  width: 26px;
  height: 26px;
  object-fit: cover;
  border: 2px solid var(--bs-border-color);
  transition: border-color 0.2s ease;
}

.nav-link.active .profile-pic {
  border-color: var(--bs-primary);
}

/* iOS safe area support - only on mobile */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  @media (max-width: 991.98px) {
    .bottom-nav {
      height: calc(var(--bottom-nav-height-mobile) + env(safe-area-inset-bottom));
    }
  }
}

/* Responsive adjustments for very small screens */
@media (max-width: 360px) {
  .nav-link {
    padding: 0.4rem 0.1rem;
  }
}
</style>