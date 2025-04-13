<template>
  <CBox id="app" d="flex" flexDir="column" minH="100vh" bg="var(--color-neutral-light)" color="var(--color-text-secondary)">
    <!-- Offline State Handler -->
    <OfflineStateHandler />
    <!-- Notification System -->
    <NotificationSystem />

    <!-- Top Navigation Bar -->
    <CFlex
      as="nav"
      position="sticky"
      top="0"
      zIndex="sticky"
      bg="var(--color-surface)"
      boxShadow="sm"
      align="center"
      :h="{ base: '12', lg: '16' }"
      borderBottomWidth="1px"
      borderColor="var(--color-border)"
    >
      <CContainer maxW="container.xl" d="flex" alignItems="center" justifyContent="space-between" h="full" :px="{ base: 4, sm: 6, lg: 8 }">
        <CLink
          as="router-link"
          to="/"
          :fontSize="{ base: 'lg', lg: 'xl' }"
          fontWeight="bold"
          color="var(--color-primary)"
          :mr="{ base: 4, lg: 8 }"
          d="flex"
          alignItems="center"
          h="full"
          whiteSpace="nowrap"
          @click="closeNavbar"
          :_hover="{ textDecoration: 'none' }"
        >
          KSB Tech Community
        </CLink>

        <CIconButton
          :display="{ base: 'flex', lg: 'none' }"
          variant="ghost"
          aria-label="Toggle navigation"
          :icon="h(CIcon, { name: 'fa-bars', size: 'xl' })"
          @click.stop="toggleNavbar"
          color="var(--color-text-secondary)"
          :_hover="{ color: 'var(--color-primary)', bg: 'transparent' }"
          :_focus="{ boxShadow: 'outline' }"
        />

        <!-- Mobile Menu Overlay -->
        <CBox
          v-if="isNavbarOpen"
          position="fixed"
          inset="0"
          bg="blackAlpha.300"
          :display="{ base: 'block', lg: 'none' }"
          zIndex="overlay"
          @click.stop="closeNavbar"
          aria-hidden="true"
        />

        <!-- Navbar Content -->
        <CBox
          :display="{ base: isNavbarOpen ? 'block' : 'none', lg: 'flex' }"
          :position="{ base: 'fixed', lg: 'static' }"
          top="12"
          left="0"
          right="0"
          :w="{ base: 'full', lg: 'auto' }"
          :bg="{ base: 'var(--color-surface)', lg: 'transparent' }"
          :boxShadow="{ base: 'lg', lg: 'none' }"
          :alignItems="{ lg: 'center' }"
          transition="all 0.3s ease-in-out"
          overflow="hidden"
          :borderBottomWidth="{ base: '1px', lg: '0' }"
          borderColor="var(--color-border)"
          zIndex="popover"
          ref="navbarCollapseRef"
          :opacity="{ base: isNavbarOpen ? 1 : 0, lg: 1 }"
          :transform="{ base: isNavbarOpen ? 'translateY(0)' : 'translateY(-100%)', lg: 'translateY(0)' }"
          :h="{ base: isNavbarOpen ? 'auto' : '0', lg: 'auto' }"
        >
          <!-- Menu Navigation -->
          <CList
            d="flex"
            :flexDir="{ base: 'column', lg: 'row' }"
            listStyleType="none"
            :mr="{ lg: 'auto' }"
            :px="{ base: 4, lg: 0 }"
            :py="{ base: 3, lg: 0 }"
            :sx="{
              '@media screen and (max-width: 991px)': {
                '& > *:not(style) ~ *:not(style)': {
                  borderTopWidth: '1px',
                  borderColor: 'var(--color-border)',
                },
              },
            }"
          >
            <CListItem v-if="isAuthenticated" :display="{ base: 'none', lg: 'block' }" :mr="{ lg: 1 }">
              <CLink
                as="router-link"
                to="/home"
                :display="{ base: 'block', lg: 'inline-block' }"
                px="3"
                :py="{ base: 3, lg: 2 }"
                borderRadius="md"
                color="var(--color-text-secondary)"
                :_hover="{ color: 'var(--color-primary)', bg: 'var(--color-secondary-light)', textDecoration: 'none' }"
                :fontWeight="$route.path === '/home' ? 'semibold' : 'normal'"
                :color="$route.path === '/home' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
                :bg="$route.path === '/home' ? 'var(--color-secondary-light)' : 'transparent'"
                @click="closeNavbar"
              >
                Home
              </CLink>
            </CListItem>
            <CListItem :mr="{ lg: 1 }">
              <CLink
                as="router-link"
                to="/leaderboard"
                :display="{ base: 'block', lg: 'inline-block' }"
                px="3"
                :py="{ base: 3, lg: 2 }"
                borderRadius="md"
                color="var(--color-text-secondary)"
                :_hover="{ color: 'var(--color-primary)', bg: 'var(--color-secondary-light)', textDecoration: 'none' }"
                :fontWeight="$route.path === '/leaderboard' ? 'semibold' : 'normal'"
                :color="$route.path === '/leaderboard' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
                :bg="$route.path === '/leaderboard' ? 'var(--color-secondary-light)' : 'transparent'"
                @click="closeNavbar"
              >
                Leaderboard
              </CLink>
            </CListItem>
             <CListItem :mr="{ lg: 1 }" v-if="isAuthenticated">
               <CLink
                 as="router-link"
                 to="/home"
                 :display="{ base: 'block', lg: 'inline-block' }"
                 px="3"
                 :py="{ base: 3, lg: 2 }"
                 borderRadius="md"
                 color="var(--color-text-secondary)"
                 :_hover="{ color: 'var(--color-primary)', bg: 'var(--color-secondary-light)', textDecoration: 'none' }"
                 :fontWeight="$route.path === '/home' ? 'semibold' : 'normal'"
                 :color="$route.path === '/home' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
                 :bg="$route.path === '/home' ? 'var(--color-secondary-light)' : 'transparent'"
                 @click="closeNavbar"
               >
                 Events
               </CLink>
             </CListItem>
             <CListItem :mr="{ lg: 1 }" v-else>
               <CLink
                 as="router-link"
                 to="/completed-events"
                 :display="{ base: 'block', lg: 'inline-block' }"
                 px="3"
                 :py="{ base: 3, lg: 2 }"
                 borderRadius="md"
                 color="var(--color-text-secondary)"
                 :_hover="{ color: 'var(--color-primary)', bg: 'var(--color-secondary-light)', textDecoration: 'none' }"
                 :fontWeight="$route.path === '/completed-events' ? 'semibold' : 'normal'"
                 :color="$route.path === '/completed-events' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
                 :bg="$route.path === '/completed-events' ? 'var(--color-secondary-light)' : 'transparent'"
                 @click="closeNavbar"
               >
                 Completed Events
               </CLink>
             </CListItem>
            <CListItem :mr="{ lg: 1 }">
              <CLink
                as="router-link"
                to="/resources"
                :display="{ base: 'block', lg: 'inline-block' }"
                px="3"
                :py="{ base: 3, lg: 2 }"
                borderRadius="md"
                color="var(--color-text-secondary)"
                :_hover="{ color: 'var(--color-primary)', bg: 'var(--color-secondary-light)', textDecoration: 'none' }"
                :fontWeight="$route.path === '/resources' ? 'semibold' : 'normal'"
                :color="$route.path === '/resources' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
                :bg="$route.path === '/resources' ? 'var(--color-secondary-light)' : 'transparent'"
                @click="closeNavbar"
              >
                Resources
              </CLink>
            </CListItem>
            <CListItem>
              <CLink
                as="router-link"
                to="/transparency"
                :display="{ base: 'block', lg: 'inline-block' }"
                px="3"
                :py="{ base: 3, lg: 2 }"
                borderRadius="md"
                color="var(--color-text-secondary)"
                :_hover="{ color: 'var(--color-primary)', bg: 'var(--color-secondary-light)', textDecoration: 'none' }"
                :fontWeight="$route.path === '/transparency' ? 'semibold' : 'normal'"
                :color="$route.path === '/transparency' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
                :bg="$route.path === '/transparency' ? 'var(--color-secondary-light)' : 'transparent'"
                @click="closeNavbar"
              >
                Transparency
              </CLink>
            </CListItem>
          </CList>

          <!-- Auth Links -->
          <CList
            d="flex"
            :flexDir="{ base: 'column', lg: 'row' }"
            listStyleType="none"
            :ml="{ lg: 'auto' }"
            :px="{ base: 4, lg: 0 }"
            :py="{ base: 3, lg: 0 }"
            :borderTopWidth="{ base: '1px', lg: '0' }"
            borderColor="var(--color-border)"
          >
            <CListItem v-if="!isAuthenticated">
              <CLink
                as="router-link"
                to="/login"
                :display="{ base: 'inline-flex', lg: 'inline-block' }"
                px="3"
                :py="{ base: 3, lg: 2 }"
                borderRadius="md"
                color="var(--color-text-secondary)"
                :_hover="{ color: 'var(--color-primary)', bg: 'var(--color-secondary-light)', textDecoration: 'none' }"
                :fontWeight="$route.path === '/login' ? 'semibold' : 'normal'"
                :color="$route.path === '/login' ? 'var(--color-primary)' : 'var(--color-text-secondary)'"
                :bg="$route.path === '/login' ? 'var(--color-secondary-light)' : 'transparent'"
                @click="closeNavbar"
              >
                Login
              </CLink>
            </CListItem>
            <CListItem v-if="isAuthenticated">
              <CLink
                href="#"
                @click.prevent="logout"
                d="inline-flex"
                alignItems="center"
                px="3"
                :py="{ base: 3, lg: 2 }"
                borderRadius="md"
                color="var(--color-text-secondary)"
                :_hover="{ color: 'var(--color-error)', bg: 'var(--color-error-light)', textDecoration: 'none' }"
              >
                <CIcon name="fa-sign-out-alt" mr="2" />
                Logout
              </CLink>
            </CListItem>
          </CList>
        </CBox>
      </CContainer>
    </CFlex>

    <!-- Main Content Area -->
    <CBox as="main" flexGrow="1" :px="{ base: 4, sm: 6, lg: 8 }" :py="{ base: 6, sm: 8 }" :pb="{ base: 16, lg: 8 }">
      <CContainer maxW="container.xl" h="full">
        <router-view v-slot="{ Component }">
          <!-- Keep the fade-in animation class if defined globally -->
          <component :is="Component" class="animate-fade-in" />
        </router-view>
      </CContainer>
    </CBox>

    <!-- Bottom Navigation -->
    <BottomNav v-if="isAuthenticated" :display="{ base: 'flex', lg: 'none' }" />
  </CBox>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, h } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
import {
  Box as CBox,
  Flex as CFlex,
  Container as CContainer,
  Link as CLink,
  IconButton as CIconButton,
  Icon as CIcon,
  List as CList,
  ListItem as CListItem,
} from '@chakra-ui/vue-next';
import BottomNav from './components/BottomNav.vue';
import OfflineStateHandler from './components/OfflineStateHandler.vue';
import NotificationSystem from './components/NotificationSystem.vue';

const store = useStore();
const router = useRouter();
const navbarCollapseRef = ref(null);
const isNavbarOpen = ref(false);

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']);

const toggleNavbar = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  if (event) event.stopPropagation();
  isNavbarOpen.value = !isNavbarOpen.value;
};

const closeNavbar = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  if (event) event.stopPropagation();
  isNavbarOpen.value = false;
};

const logout = (event) => {
  // Prevent event propagation to avoid triggering other click handlers
  if (event) event.stopPropagation();
  closeNavbar(); // Close navbar immediately on click
  const auth = getAuth();
  signOut(auth).then(() => {
    // Success is handled in finally
  }).catch((error) => {
      console.error("Logout failed:", error);
      // Optionally show user feedback about logout failure
  }).finally(() => {
      store.dispatch('user/clearUserData'); // Clear user data in store
      // Use replace to prevent going back to authenticated pages
      router.replace({ name: 'Login' }).catch(err => {
          // Handle potential navigation errors if needed
          if (err.name !== 'NavigationDuplicated') {
               console.error('Router navigation error after logout:', err);
          }
      });
  });
};

// Close mobile navbar on route change
onMounted(() => {
  router.afterEach(() => {
    closeNavbar();
  });
});

// Initialize offline capabilities when the app mounts
onMounted(() => {
  router.afterEach(() => {
    closeNavbar();
  });
  
  // Initialize offline capabilities
  store.dispatch('app/initOfflineCapabilities');
});

// No specific unmount logic needed for this component in this case
onUnmounted(() => {
});
</script>
