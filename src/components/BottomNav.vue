<template>
    <nav class="fixed bottom-0 left-0 right-0 h-12 bg-surface border-t border-border flex justify-around items-center shadow-[0_-1px_4px_rgba(0,0,0,0.08)] z-40">
        <!-- Home -->
        <router-link
            to="/home"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <i class="fas fa-home text-xl mb-0.5"></i>
            <span class="text-xs">Home</span>
        </router-link>

        <!-- Event Request Link (Non-Admin Only) -->
        <router-link
            v-if="isAuthenticated && !isAdmin"
            to="/create-event"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <i class="fas fa-calendar-plus text-xl mb-0.5"></i>
            <span class="text-xs">Request</span>
        </router-link>

        <!-- Leaderboard -->
        <router-link
            to="/leaderboard"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <i class="fas fa-trophy text-xl mb-0.5"></i>
            <span class="text-xs">Leaderboard</span>
        </router-link>

        <!-- Manage Requests (Admin Only) -->
        <router-link
            v-if="isAdmin != null && isAdmin"
            to="/manage-requests"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <i class="fas fa-tasks text-xl mb-0.5"></i>
            <span class="text-xs">Manage</span>
        </router-link>

        <!-- Profile (User Only) -->
        <router-link
            v-if="typeof isAuthenticated === 'boolean' && typeof isAdmin === 'boolean' && isAuthenticated && !isAdmin"
            to="/profile"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <!-- Profile Pic or Icon -->
            <img v-if="userProfilePicUrl" :src="userProfilePicUrl" alt="Profile" class="w-6 h-6 rounded-full object-cover mb-0.5 border border-border" @error="handleImageError" ref="profileImageRef"/>
            <i v-else class="fas fa-user-circle text-xl mb-0.5"></i>
            <span class="text-xs">Profile</span>
        </router-link>
    </nav>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const profileImageRef = ref(null); // Ref for the image element

// Computed properties for user state
const isAdmin = computed(() => store.getters['user/isAdmin']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const userProfilePicUrl = computed(() => store.getters['user/profilePictureUrl']); // Use the correct getter name

// Default avatar URL (if needed, though icon is fallback here)
// const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const handleImageError = () => {
    // Option 1: Hide the broken image (icon will show via v-else)
    if (profileImageRef.value) {
        profileImageRef.value.style.display = 'none';
    }
    // Option 2: Set to default (if you prefer default over icon)
    // if (profileImageRef.value) {
    //   profileImageRef.value.src = defaultAvatarUrl;
    // }
    // Option 3: Add a class to hide/style differently
    // if (profileImageRef.value) {
    //   profileImageRef.value.classList.add('hidden'); // requires .hidden { display: none; }
    // }
};

</script>
