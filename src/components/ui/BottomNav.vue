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

      <router-link
        to="/leaderboard"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center flex-fill"
        active-class="active"
        aria-label="Leaderboard"
      >
        <span class="nav-icon mb-1 h5"><i class="fas fa-trophy"></i></span>
        <span class="nav-text text-caption">Leaderboard</span>
      </router-link>

      <router-link
        v-if="isAuthenticated"
        to="/profile"
        class="nav-link d-flex flex-column align-items-center justify-content-center text-center flex-fill"
        active-class="active"
        aria-label="Profile"
      >
        <div class="nav-icon mb-1 h5 profile-icon-container">
          <LetterAvatar
            :username="userName"
            :photo-url="userProfilePicUrl || ''"
            :size="26"
          />
        </div>
        <span class="nav-text text-caption">Profile</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'; // Removed ref
import { useAuth } from '@/composables/useAuth'; // Use the centralized auth composable
import LetterAvatar from '@/components/ui/LetterAvatar.vue'; // Import LetterAvatar

const { isAuthenticated, authUser } = useAuth();
// const imgError = ref(false); // Removed

const userProfilePicUrl = computed(() => authUser.value?.photoURL ?? null);
const userName = computed(() => authUser.value?.name ?? 'User'); // Provide default for username

// const handleImageError = () => { // Removed
//   imgError.value = true;
// };
</script>

<style scoped>
.bottom-nav {
  height: var(--bottom-nav-height-mobile);
  z-index: 1040;
  border-top: 1px solid var(--bs-border-color);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: var(--bs-white) !important;
}

@media (min-width: 992px) {
  .bottom-nav {
    display: none !important;
  }
}

.nav-link {
  color: var(--bs-secondary);
  text-decoration: none;
  padding: 0.5rem 0.25rem;
  border-top: 3px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
  min-height: var(--bottom-nav-height-mobile);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.nav-link:hover,
.nav-link:focus {
  color: var(--bs-primary);
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

/* Styles for LetterAvatar integration if needed, .profile-pic removed */
.profile-icon-container :deep(.letter-avatar) {
  border: 2px solid var(--bs-border-color);
  transition: border-color 0.2s ease;
}
.nav-link.active .profile-icon-container :deep(.letter-avatar) {
  border-color: var(--bs-primary);
}

</style>