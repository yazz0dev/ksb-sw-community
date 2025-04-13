<template>
    <CFlex
        as="nav"
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        h="12"
        bg="var(--color-surface)"
        borderTopWidth="1px"
        borderColor="var(--color-border)"
        justify="space-around"
        align="center"
        boxShadow="0 -1px 4px rgba(0,0,0,0.08)"
        zIndex="docked"
    >
        <!-- Home -->
        <CLink
            as="router-link"
            to="/home"
            d="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            flex="1"
            color="var(--color-text-secondary)"
            textAlign="center"
            h="full"
            transition="color 0.2s ease-in-out"
            px="1"
            py="1"
            :_hover="{ color: 'var(--color-primary)', textDecoration: 'none' }"
            :color="$route.path === '/home' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
            :fontWeight="$route.path === '/home' ? 'medium' : 'normal'"
        >
            <CIcon name="fa-home" fontSize="xl" mb="0.5" />
            <CText fontSize="xs">Home</CText>
        </CLink>

        <!-- Event Request Link (Non-Admin Only) -->
        <CLink
            v-if="isAuthenticated && !isAdmin"
            as="router-link"
            to="/create-event"
            d="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            flex="1"
            color="var(--color-text-secondary)"
            textAlign="center"
            h="full"
            transition="color 0.2s ease-in-out"
            px="1"
            py="1"
            :_hover="{ color: 'var(--color-primary)', textDecoration: 'none' }"
            :color="$route.path === '/create-event' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
            :fontWeight="$route.path === '/create-event' ? 'medium' : 'normal'"
        >
            <CIcon name="fa-calendar-plus" fontSize="xl" mb="0.5" />
            <CText fontSize="xs">Request</CText>
        </CLink>

        <!-- Leaderboard -->
        <CLink
            as="router-link"
            to="/leaderboard"
            d="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            flex="1"
            color="var(--color-text-secondary)"
            textAlign="center"
            h="full"
            transition="color 0.2s ease-in-out"
            px="1"
            py="1"
            :_hover="{ color: 'var(--color-primary)', textDecoration: 'none' }"
            :color="$route.path === '/leaderboard' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
            :fontWeight="$route.path === '/leaderboard' ? 'medium' : 'normal'"
        >
            <CIcon name="fa-trophy" fontSize="xl" mb="0.5" />
            <CText fontSize="xs">Leaderboard</CText>
        </CLink>

        <!-- Manage Requests (Admin Only) -->
        <CLink
            v-if="isAdmin != null && isAdmin"
            as="router-link"
            to="/manage-requests"
            d="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            flex="1"
            color="var(--color-text-secondary)"
            textAlign="center"
            h="full"
            transition="color 0.2s ease-in-out"
            px="1"
            py="1"
            :_hover="{ color: 'var(--color-primary)', textDecoration: 'none' }"
            :color="$route.path === '/manage-requests' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
            :fontWeight="$route.path === '/manage-requests' ? 'medium' : 'normal'"
        >
            <CIcon name="fa-tasks" fontSize="xl" mb="0.5" />
            <CText fontSize="xs">Manage</CText>
        </CLink>

        <!-- Profile (User Only) -->
        <CLink
            v-if="typeof isAuthenticated === 'boolean' && typeof isAdmin === 'boolean' && isAuthenticated && !isAdmin"
            as="router-link"
            to="/profile"
            d="flex"
            flexDir="column"
            alignItems="center"
            justifyContent="center"
            flex="1"
            color="var(--color-text-secondary)"
            textAlign="center"
            h="full"
            transition="color 0.2s ease-in-out"
            px="1"
            py="1"
            :_hover="{ color: 'var(--color-primary)', textDecoration: 'none' }"
            :color="$route.path === '/profile' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
            :fontWeight="$route.path === '/profile' ? 'medium' : 'normal'"
        >
            <!-- Profile Pic or Icon -->
            <CAvatar 
                v-if="userProfilePicUrl" 
                :src="userProfilePicUrl" 
                :name="userName || 'Profile'" 
                size="xs" 
                mb="0.5" 
                borderWidth="1px" 
                borderColor="var(--color-border)" 
                @error="handleImageError" 
                ref="profileImageRef" 
            />
            <CIcon v-else name="fa-user-circle" fontSize="xl" mb="0.5" />
            <CText fontSize="xs">Profile</CText>
        </CLink>
    </CFlex>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { 
  CFlex, 
  CLink, 
  CIcon, 
  CText,
  Avatar as CAvatar 
} from '@chakra-ui/vue-next';

const store = useStore();
const profileImageRef = ref(null); // Ref for the image element
// Computed properties for user state
const isAdmin = computed(() => store.getters['user/isAdmin']);
const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const userProfilePicUrl = computed(() => store.getters['user/profilePictureUrl']);
const userName = computed(() => store.getters['user/getUser']?.name); // Get user name for Avatar fallback

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
