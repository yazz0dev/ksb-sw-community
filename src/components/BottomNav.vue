<template>
    <nav
        class="navbar fixed-bottom d-flex justify-content-around align-items-center shadow-sm d-lg-none bg-light"
        role="navigation" 
        aria-label="bottom navigation"
        style="height: 4rem; border-top: 1px solid var(--bs-border-color); z-index: 1030;"
    >
        <!-- Using a simple div container for flex items -->
        <div class="d-flex justify-content-around align-items-stretch w-100 h-100">
            <!-- Home -->
            <router-link
                to="/home"
                class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill"
                active-class="active"
                style="color: var(--bs-secondary); transition: color 0.2s ease-in-out;"
            >
                <span class="fs-4 mb-1"><i class="fas fa-home"></i></span>
                <span class="fs-7">Home</span>
            </router-link>

            <!-- Event Request Link (Non-Admin Only) -->
            <router-link
                v-if="isAuthenticated && !isAdmin"
                to="/create-event"
                class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill"
                active-class="active"
                style="color: var(--bs-secondary); transition: color 0.2s ease-in-out;"
            >
                <span class="fs-4 mb-1"><i class="fas fa-calendar-plus"></i></span>
                <span class="fs-7">Request</span>
            </router-link>

            <!-- Leaderboard -->
            <router-link
                to="/leaderboard"
                class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill"
                active-class="active"
                style="color: var(--bs-secondary); transition: color 0.2s ease-in-out;"
            >
                <span class="fs-4 mb-1"><i class="fas fa-trophy"></i></span>
                <span class="fs-7">Leaderboard</span>
            </router-link>

            <!-- Manage Requests (Admin Only) -->
            <router-link
                v-if="isAdmin != null && isAdmin"
                to="/manage-requests"
                class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill"
                active-class="active"
                style="color: var(--bs-secondary); transition: color 0.2s ease-in-out;"
            >
                <span class="fs-4 mb-1"><i class="fas fa-tasks"></i></span>
                <span class="fs-7">Manage</span>
            </router-link>

            <!-- Profile (User Only) -->
            <router-link
                v-if="typeof isAuthenticated === 'boolean' && typeof isAdmin === 'boolean' && isAuthenticated && !isAdmin"
                to="/profile"
                class="nav-link d-flex flex-column align-items-center justify-content-center text-center px-1 py-1 flex-fill"
                active-class="active"
                style="color: var(--bs-secondary); transition: color 0.2s ease-in-out;"
            >
                <!-- Profile Pic or Icon -->
                <figure v-if="userProfilePicUrl && !imgError" class="mb-1 profile-pic-figure">
                    <img 
                        class="rounded-circle" 
                        :src="userProfilePicUrl" 
                        :alt="userName || 'Profile'" 
                        style="border: 1px solid var(--bs-border-color); object-fit: cover; width: 28px; height: 28px;" 
                        @error="handleImageError" 
                    />
                </figure>
                <span v-else class="fs-4 mb-1"><i class="fas fa-user-circle"></i></span>
                <span class="fs-7">Profile</span>
            </router-link>
        </div>
    </nav>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
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
.nav-link {
  border-top: 3px solid transparent; /* Reserve space for active indicator */
  /* padding adjusted via flex properties */
  height: 100%; /* Ensure links fill height */
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
</style>
