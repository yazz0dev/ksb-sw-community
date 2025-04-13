<template>
    <nav
        class="navbar is-fixed-bottom is-flex is-justify-content-space-around is-align-items-center has-shadow is-hidden-desktop" 
        role="navigation" 
        aria-label="bottom navigation"
        style="height: 3.5rem; background-color: var(--color-surface); border-top: 1px solid var(--color-border); z-index: 30;"
    >
        <!-- Home -->
        <router-link
            to="/home"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/home' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="has-text-primary has-text-weight-medium"
        >
            <span class="icon is-medium"><i class="fas fa-home fa-lg"></i></span>
            <span class="is-size-7">Home</span>
        </router-link>

        <!-- Event Request Link (Non-Admin Only) -->
        <router-link
            v-if="isAuthenticated && !isAdmin"
            to="/create-event"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/create-event' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="has-text-primary has-text-weight-medium"
        >
            <span class="icon is-medium"><i class="fas fa-calendar-plus fa-lg"></i></span>
            <span class="is-size-7">Request</span>
        </router-link>

        <!-- Leaderboard -->
        <router-link
            to="/leaderboard"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/leaderboard' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="has-text-primary has-text-weight-medium"
        >
            <span class="icon is-medium"><i class="fas fa-trophy fa-lg"></i></span>
            <span class="is-size-7">Leaderboard</span>
        </router-link>

        <!-- Manage Requests (Admin Only) -->
        <router-link
            v-if="isAdmin != null && isAdmin"
            to="/manage-requests"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/manage-requests' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="has-text-primary has-text-weight-medium"
        >
            <span class="icon is-medium"><i class="fas fa-tasks fa-lg"></i></span>
            <span class="is-size-7">Manage</span>
        </router-link>

        <!-- Profile (User Only) -->
        <router-link
            v-if="typeof isAuthenticated === 'boolean' && typeof isAdmin === 'boolean' && isAuthenticated && !isAdmin"
            to="/profile"
            class="navbar-item is-flex is-flex-direction-column is-align-items-center is-justify-content-center has-text-centered px-1 py-1"
            :class="{ 'has-text-primary has-text-weight-medium': $route.path === '/profile' }"
            style="flex: 1; height: 100%; color: var(--color-text-secondary); transition: color 0.2s ease-in-out;"
            active-class="has-text-primary has-text-weight-medium"
        >
            <!-- Profile Pic or Icon -->
            <figure v-if="userProfilePicUrl && !imgError" class="image is-24x24 mb-1" ref="profileImageRef">
                <img 
                    class="is-rounded" 
                    :src="userProfilePicUrl" 
                    :alt="userName || 'Profile'" 
                    style="border: 1px solid var(--color-border); object-fit: cover;" 
                    @error="handleImageError" 
                />
            </figure>
            <span v-else class="icon is-medium"><i class="fas fa-user-circle fa-lg"></i></span>
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
/* Custom styles for bottom nav if needed */
.navbar-item:hover {
    color: var(--color-primary) !important; /* Ensure hover color overrides default */
    background-color: transparent; /* Prevent default hover background */
}

.navbar-item.has-text-primary .icon i,
.navbar-item.has-text-primary span {
    color: var(--color-primary);
}

/* Adjust icon sizes if needed */
.icon.is-medium {
  font-size: 1.5rem; /* Adjust as necessary */
}

.image.is-24x24 {
  height: 24px;
  width: 24px;
}

</style>
