<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-2 px-3 fixed-top" :class="{ 'navbar-hidden': !showNavbar }">
    <div class="container-fluid">
      <router-link class="navbar-brand fw-bold text-primary" :to="brandLinkTarget">
        <span>KSB Tech Community</span>
      </router-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li class="nav-item">
            <router-link class="nav-link" :to="{ name: 'Home' }" @click="closeNavbar">Home</router-link>
          </li>
          <li class="nav-item" v-if="!isAuthenticated">
            <router-link
              class="nav-link"
              active-class="active fw-semibold"
              to="/events"
              @click="closeNavbar"
            >
              Events
            </router-link>
          </li>
           <li class="nav-item d-none d-lg-block" v-if="!isAuthenticated">
             <router-link
                class="nav-link"
                active-class="active fw-semibold"
                to="/leaderboard"
                @click="closeNavbar"
             >
                Leaderboard
             </router-link>
           </li>
          <li class="nav-item">
            <router-link
              class="nav-link"
              active-class="active fw-semibold"
              to="/resources"
              @click="closeNavbar"
            >
              Resources
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              class="nav-link"
              active-class="active fw-semibold"
              to="/transparency"
              @click="closeNavbar"
            >
              Transparency
            </router-link>
          </li>
        </ul>

        <ul class="navbar-nav ms-auto align-items-lg-center">
          <template v-if="!isAuthenticated">
            <li class="nav-item">
              <router-link
                class="btn btn-primary btn-sm"
                to="/login"
                @click="closeNavbar"
              >
                 <i class="fas fa-sign-in-alt me-1"></i> Login
              </router-link>
            </li>
          </template>

          <template v-if="isAuthenticated">
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarUserDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-user-circle me-1"></i>
                <span>{{ userName }}</span>
              </a>
              <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarUserDropdown">
                <li>
                  <router-link
                    class="dropdown-item"
                    to="/profile"
                    @click="closeNavbar"
                  >
                    <i class="fas fa-user fa-fw me-2"></i> View Profile
                  </router-link>
                </li>
                <li>
                  <button
                    class="dropdown-item"
                    @click="handleLogout"
                  >
                    <i class="fas fa-sign-out-alt fa-fw me-2"></i>Logout
                  </button>
                </li>
              </ul>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
  isAuthenticated: boolean;
  userName: string;
  showNavbar?: boolean;
}>();

const emit = defineEmits<{
  (e: 'logout'): void;
}>();

const router = useRouter();

// Compute button class based on variant
const brandLinkTarget = computed(() => {
  return props.isAuthenticated ? { name: 'Home' } : { name: 'Landing' };
});

const closeNavbar = () => {
  try {
    const toggler = document.querySelector('.navbar-toggler') as HTMLElement | null;
    if (toggler && window.getComputedStyle(toggler).display !== 'none') {
      toggler.click();
    } else {
      const navbarContent = document.getElementById('navbarNav');
      if (navbarContent?.classList.contains('show') && window.bootstrap?.Collapse) {
        const bsCollapse = window.bootstrap.Collapse.getInstance(navbarContent);
        bsCollapse?.hide();
      }
    }
  } catch (error) {
    // Optionally handle or log the error differently if needed
  }
};

const handleLogout = () => {
  closeNavbar();
  emit('logout');
};

onMounted(() => {
  const collapseEl = document.getElementById('navbarNav');
  const toggler = document.querySelector('.navbar-toggler');
  if (!collapseEl || !toggler || !window.bootstrap?.Collapse) return;
  
  const bsCollapse = window.bootstrap.Collapse.getInstance(collapseEl)
    || new window.bootstrap.Collapse(collapseEl, { toggle: false });

  const outsideClickHandler = (e: MouseEvent | TouchEvent) => {
    if (window.innerWidth < 992 && collapseEl.classList.contains('show')
      && !collapseEl.contains(e.target as Node)
      && !toggler.contains(e.target as Node)) {
      bsCollapse.hide();
    }
  };
  document.addEventListener('mousedown', outsideClickHandler, true);
  document.addEventListener('touchstart', outsideClickHandler, true);

  const escapeKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && window.innerWidth < 992 && collapseEl.classList.contains('show')) {
      closeNavbar();
    }
  };
  document.addEventListener('keydown', escapeKeyHandler, true);

  const removeAfterEach = router.afterEach(() => {
    if (window.innerWidth < 992 && collapseEl.classList.contains('show')) {
      bsCollapse.hide();
    }
  });

  onUnmounted(() => {
    document.removeEventListener('mousedown', outsideClickHandler, true);
    document.removeEventListener('touchstart', outsideClickHandler, true);
    document.removeEventListener('keydown', escapeKeyHandler, true);
    removeAfterEach();
  });
});
</script>

<style scoped>
.app-navbar {
  border-bottom: 1px solid var(--bs-border-color-translucent);
  transition: transform 0.3s ease-in-out;
  will-change: transform;
}

.navbar-hidden {
  transform: translateY(-100%);
}

@media (max-width: 991.98px) {
  /* Styles for the collapsed mobile menu */
  #navbarNav.collapse.show,
  #navbarNav.collapsing {
    background-color: var(--bs-primary);
    padding: 0.75rem 1rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--bs-border-color-translucent);
    border-radius: var(--bs-border-radius-sm);
    box-shadow: var(--bs-box-shadow);
  }

  #navbarNav .nav-item {
    margin-bottom: 0.125rem;
  }

  #navbarNav .nav-link {
    color: rgba(255, 255, 255, 0.85);
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    border-radius: var(--bs-border-radius-sm); /* for hover indication */
  }

  #navbarNav .nav-link:hover,
  #navbarNav .nav-link:focus {
    color: var(--bs-white);
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* Ensure router-link-active styles are applied correctly for visibility */
  #navbarNav .nav-link.router-link-active.router-link-exact-active,
  #navbarNav .nav-link.active { /* This targets Bootstrap's .active and Vue Router's active class */
    color: var(--bs-white) !important; /* Ensure high contrast for active text */
    font-weight: 600; /* Corresponds to fw-semibold or Bootstrap's bold for active nav items */
    background-color: rgba(255, 255, 255, 0.15); /* Slightly more prominent active background */
  }

  .navbar-nav {
    width: 100%;
  }
}

.dropdown-menu {
  margin-top: 0.5rem;
  box-shadow: var(--bs-box-shadow-sm);
  border-color: var(--bs-border-color-translucent);
}
.dropdown-item {
    font-size: 0.9rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
}
.dropdown-item i {
    color: var(--bs-secondary);
}

.navbar-profile-pic {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border: 1px solid var(--bs-border-color);
}

.nav-link, .dropdown-item, .navbar-brand {
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
</style>
