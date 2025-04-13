<template>
    <nav
        class="navbar is-fixed-bottom is-flex is-justify-content-space-around is-align-items-center has-shadow is-hidden-desktop" 
        role="navigation" 
        aria-label="bottom navigation"
        style="height: 4rem; background-color: var(--color-surface); border-top: 1px solid var(--color-border); z-index: 30;"
    >
        <!-- Home -->
        <router-link
            to="/home"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/home' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="is-active-nav-item"
        >
            <span class="icon is-medium"><i class="fas fa-home fa-xl"></i></span>
            <span class="is-size-7">Home</span>
        </router-link>

        <!-- Event Request Link (Non-Admin Only) -->
        <router-link
            v-if="isAuthenticated && !isAdmin"
            to="/create-event"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/create-event' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="is-active-nav-item"
        >
            <span class="icon is-medium"><i class="fas fa-calendar-plus fa-xl"></i></span>
            <span class="is-size-7">Request</span>
        </router-link>

        <!-- Leaderboard -->
        <router-link
            to="/leaderboard"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/leaderboard' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="is-active-nav-item"
        >
            <span class="icon is-medium"><i class="fas fa-trophy fa-xl"></i></span>
            <span class="is-size-7">Leaderboard</span>
        </router-link>

        <!-- Manage Requests (Admin Only) -->
        <router-link
            v-if="isAdmin != null && isAdmin"
            to="/manage-requests"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/manage-requests' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="is-active-nav-item"
        >
            <span class="icon is-medium"><i class="fas fa-tasks fa-xl"></i></span>
            <span class="is-size-7">Manage</span>
        </router-link>

        <!-- Profile (User Only) -->
        <router-link
            v-if="typeof isAuthenticated === 'boolean' && typeof isAdmin === 'boolean' && isAuthenticated && !isAdmin"
            to="/profile"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/profile' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="is-active-nav-item"
        >
            <!-- Profile Pic or Icon -->
            <figure v-if="userProfilePicUrl && !imgError" class="image is-28x28 mb-1" ref="profileImageRef">
                <img 
                    class="is-rounded" 
                    :src="userProfilePicUrl" 
                    :alt="userName || 'Profile'" 
                    style="border: 1px solid var(--color-border); object-fit: cover;" 
                    @error="handleImageError" 
                />
            </figure>
            <span v-else class="icon is-medium"><i class="fas fa-user-circle fa-xl"></i></span>
            <span class="is-size-7">Profile</span>
        </router-link>
    </nav>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
// REMOVED Chakra UI Imports
// import { 
//   CFlex, 
//   CLink, 
//   CIcon, 
//   CText,
//   Avatar as CAvatar 
// } from '@chakra-ui/vue-next';

const store = useStore();
const profileImageRef = ref(null); // Ref for the figure element
const imgError = ref(false); // Track image loading error

// Computed properties for user state
const isAdmin = computed(() => store.getters['user/isAdmin']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const userProfilePicUrl = computed(() => store.getters['user/profilePictureUrl']);
const userName = computed(() => store.getters['user/getUser']?.name); // Get user name for Avatar fallback

const handleImageError = () => {
    imgError.value = true; // Set error flag to true, v-else will show the icon
    console.warn('Failed to load profile image:', userProfilePicUrl.value);
};

</script>

<style scoped>
.navbar-item {
  border-top: 3px solid transparent; /* Reserve space for active border */
  padding-top: calc(0.5rem - 3px); /* Adjust padding */
  padding-bottom: 0.5rem;
}

.navbar-item:hover,
.navbar-item:focus,
.navbar-item:active {
    color: var(--color-primary) !important; /* Ensure hover/focus/active color overrides default */
    background-color: transparent !important; /* Prevent default background */
    border-top-color: transparent; /* Keep hover/focus/active border transparent */
    outline: none; /* Remove default focus outline if desired */
}

.navbar-item.is-active-nav-item {
  border-top-color: var(--color-primary);
  color: var(--color-primary) !important;
  font-weight: 600; /* Semibold */
  background-color: transparent !important; /* Explicitly ensure no background for active */
}

.navbar-item.is-active-nav-item .icon i,
.navbar-item.is-active-nav-item span {
    color: var(--color-primary);
}

/* Specific style for profile image */
.image.is-28x28 {
  height: 28px;
  width: 28px;
}
</style>
