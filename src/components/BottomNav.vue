<template>
    <nav class="bottom-nav">
        <router-link to="/home" class="bottom-nav-item" active-class="router-link-exact-active">
            <i class="fas fa-home"></i>
            <span>Home</span>
        </router-link>
        <router-link to="/leaderboard" class="bottom-nav-item" active-class="router-link-exact-active">
            <i class="fas fa-trophy"></i>
            <span>Leaderboard</span>
        </router-link>
        <router-link to="/profile" class="bottom-nav-item" active-class="router-link-exact-active">
            <img v-if="userPhotoUrl" :src="userPhotoUrl" alt="Profile" class="profile-icon" @error="handleImageError" />
            <i v-else class="fas fa-user-circle"></i>
            <span>Profile</span>
        </router-link>
    </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();

// Use new URL pattern for asset handling
const defaultAvatarUrl = new URL('../assets/default-avatar.png', import.meta.url).href;

const userPhotoUrl = computed(() => store.getters['user/getUser']?.photoURL);

const handleImageError = (e) => {
    // If the user's photo fails, don't fallback to default, show icon instead
    // The v-else in the template handles showing the icon
    e.target.style.display = 'none'; // Hide the broken image element
    // We might need a way to force re-render or show the icon explicitly if the img tag remains
};

</script>

<style scoped>
/* Styles are defined globally in main.css */
.bottom-nav-item span {
    font-size: 0.7rem; /* Slightly smaller text */
}
</style>
