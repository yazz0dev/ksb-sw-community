// /src/App.vue
<template>
  <div id="app" class="flex flex-col min-h-screen bg-background">
    <nav class="sticky top-0 z-30 bg-surface shadow-sm flex items-center h-12 lg:h-16 border-b border-border">
      <div class="container mx-auto flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
        <router-link to="/" class="text-lg lg:text-xl font-bold text-primary mr-4 lg:mr-8 flex items-center h-full whitespace-nowrap" @click="closeNavbar">KSB MCA S/W Community</router-link>

        <button class="lg:hidden border-none bg-transparent p-2 rounded text-text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-opacity-75" type="button" @click="toggleNavbar" aria-controls="navbarNav" :aria-expanded="isNavbarOpen.toString()" aria-label="Toggle navigation">
          <i class="fas fa-bars text-xl"></i>
        </button>

        <div
          :class="[
            'absolute top-12 lg:top-16 left-0 right-0 w-full bg-surface shadow-lg lg:shadow-none lg:relative lg:top-auto lg:left-auto lg:right-auto lg:flex lg:w-auto lg:items-center lg:bg-transparent transition-all duration-300 ease-in-out overflow-hidden',
            isNavbarOpen ? 'max-h-[calc(100vh-3rem)] lg:max-h-[calc(100vh-4rem)] opacity-100' : 'max-h-0 opacity-0 lg:opacity-100 lg:max-h-full lg:overflow-visible'
          ]"
          id="navbarNav"
          ref="navbarCollapseRef"
        >
          <ul class="flex flex-col lg:flex-row list-none lg:mr-auto px-4 lg:px-0 py-3 lg:py-0 divide-y divide-border lg:divide-y-0">
             <li v-if="isAuthenticated" class="lg:mr-1">
              <router-link
                to="/home"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary"
                @click="closeNavbar"
              >Home</router-link>
            </li>
             <li v-if="isAuthenticated && !isAdmin" class="lg:mr-1">
              <router-link
                to="/profile"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary"
                @click="closeNavbar"
              >Profile</router-link>
            </li>

            <li v-if="isAuthenticated" class="lg:mr-1">
              <router-link
                to="/leaderboard"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary"
                @click="closeNavbar"
              >Leaderboard</router-link>
            </li>
            <li class="lg:mr-1">
              <router-link
                to="/resources"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary"
                @click="closeNavbar"
              >Resources</router-link>
            </li>
            <li>
              <router-link
                to="/transparency"
                class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                active-class="font-semibold text-primary bg-secondary"
                @click="closeNavbar"
              >Transparency</router-link>
            </li>
          </ul>

           <ul class="flex flex-col lg:flex-row list-none lg:ml-auto px-4 lg:px-0 py-3 lg:py-0 border-t lg:border-none border-border">
              <li v-if="!isAuthenticated">
                <router-link
                  to="/login"
                  class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-primary hover:bg-secondary-light transition-colors duration-150"
                  active-class="font-semibold text-primary bg-secondary"
                  @click="closeNavbar"
                >Login</router-link>
              </li>
               <li v-if="isAuthenticated">
                  <a
                    href="#"
                    @click.prevent="logout"
                    class="block lg:inline-block px-3 py-3 lg:py-2 rounded-md text-text-secondary hover:text-error hover:bg-error-light transition-colors duration-150 flex items-center"
                  >
                      <i class="fas fa-sign-out-alt mr-2"></i>Logout
                  </a>
                </li>
            </ul>
        </div>
      </div>
    </nav>


    <main class="container mx-auto flex-grow px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16 lg:pb-8">
         <router-view v-slot="{ Component }">
             <!-- <transition name="fade" mode="out-in"> -->
                 <component :is="Component" class="animate-fade-in" />
             <!-- </transition> -->
         </router-view>
    </main>

    <BottomNav v-if="isAuthenticated" class="lg:hidden" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAuth, signOut } from 'firebase/auth';
import BottomNav from './components/BottomNav.vue';

const store = useStore();
const router = useRouter();
const navbarCollapseRef = ref(null);
const isNavbarOpen = ref(false);

const isAuthenticated = computed(() => store.getters['user/isAuthenticated']);
const isAdmin = computed(() => store.getters['user/isAdmin']);

const toggleNavbar = () => {
  isNavbarOpen.value = !isNavbarOpen.value;
};

const closeNavbar = () => {
  isNavbarOpen.value = false;
};

const logout = () => {
  const auth = getAuth();
  signOut(auth).then(() => {
  }).catch((error) => {
      console.error("Logout failed:", error);
  }).finally(() => {
      store.dispatch('user/clearUserData');
      router.replace({ name: 'Login' });
      closeNavbar();
  });
};

onMounted(() => {
  router.afterEach(() => {
    closeNavbar();
  });
});

onUnmounted(() => {
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
