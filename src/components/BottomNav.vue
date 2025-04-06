<template>
    <nav class="fixed bottom-0 left-0 right-0 h-12 bg-surface border-t border-border flex justify-around items-center shadow-[0_-2px_5px_rgba(0,0,0,0.1)] z-40">
        <!-- Home (Always Visible) -->
        <router-link
            to="/home"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <i class="fas fa-home text-xl mb-0.5"></i>
            <span class="text-xs">Home</span>
        </router-link>
        
        <!-- Unified Event Creation Link -->
        <router-link
            v-if="isAuthenticated"
            to="/create-event"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <i :class="['fas', isAdmin ? 'fa-plus-circle' : 'fa-calendar-plus', 'text-xl mb-0.5']"></i>
            <span class="text-xs">{{ isAdmin ? 'Create' : 'Request' }}</span>
        </router-link>

        <!-- Leaderboard (Always Visible) -->
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
            v-if="isAdmin"
            to="/manage-requests"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <i class="fas fa-tasks text-xl mb-0.5"></i> <!-- Different icon -->
            <span class="text-xs">Manage</span>
        </router-link>
        
        <!-- Profile (User Only) -->
        <router-link
            v-if="!isAdmin"
            to="/profile"
            active-class="text-primary font-medium"
            class="flex flex-col items-center justify-center flex-1 text-text-secondary no-underline text-center h-full transition-colors duration-200 ease-in-out px-1 py-1 hover:text-primary"
        >
            <img v-if="userProfilePic" :src="userProfilePic" alt="Profile" class="w-6 h-6 rounded-full object-cover mb-0.5 border border-border" @error="handleImageError" />
            <i v-else class="fas fa-user-circle text-xl mb-0.5"></i>
            <span class="text-xs">Profile</span>
        </router-link>
    </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

// Get isAdmin status
const isAdmin = computed(() => store.getters['user/isAdmin']);
// Add missing isAuthenticated computed property
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);

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
