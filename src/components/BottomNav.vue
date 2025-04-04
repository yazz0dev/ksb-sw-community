<template>
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center shadow-[0_-2px_5px_rgba(0,0,0,0.1)] z-40">
        <router-link to="/home" class="bottom-nav-item" active-class="active">
            <i class="fas fa-home text-xl mb-1"></i>
            <span class="text-xs">Home</span>
        </router-link>
        <router-link to="/request-event" class="bottom-nav-item" active-class="active">
            <i class="fas fa-calendar-plus text-xl mb-1"></i>
            <span class="text-xs">Request</span>
        </router-link>
        <router-link to="/leaderboard" class="bottom-nav-item" active-class="active">
            <i class="fas fa-trophy text-xl mb-1"></i>
            <span class="text-xs">Leaderboard</span>
        </router-link>
        <router-link to="/profile" class="bottom-nav-item" active-class="active">
            <img v-if="userProfilePic" :src="userProfilePic" alt="Profile" class="profile-icon" @error="handleImageError" />
            <i v-else class="fas fa-user-circle text-xl mb-1"></i>
            <span class="text-xs">Profile</span>
        </router-link>
    </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

// Use new URL pattern for asset handling
const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const userProfilePic = computed(() => store.getters['user/profilePictureUrl']);

const handleImageError = (e) => {
    // If the user's photo fails, don't fallback to default, show icon instead
    // The v-else in the template handles showing the icon
    e.target.style.display = 'none'; // Hide the broken image element
    // We might need a way to force re-render or show the icon explicitly if the img tag remains
};

</script>

<style scoped>
.bottom-nav-item {
    @apply flex flex-col items-center justify-center flex-1 text-gray-500 no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1;
}

.bottom-nav-item i {
    /* Size is handled by text-xl in template, mb-1 adds margin */
}

.profile-icon {
    @apply w-6 h-6 rounded-full object-cover mb-1 border border-gray-300;
}

.bottom-nav-item.active {
    @apply text-blue-600 font-medium;
}
</style>
