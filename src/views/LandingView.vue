<template>
  <div class="text-center py-5 px-4 landing-section">
    <div class="container container-xl">
      <h1 class="display-5 fw-bold text-primary mb-4">
        Welcome to the KSB Tech Community!
      </h1>
      <p class="lead text-secondary mb-5 mx-auto" style="max-width: 48rem;">
        Manage events, collaborate on projects, and share resources within the KSB MCA community.
      </p>
      <p class="mb-5 text-secondary">
        Please 
        <router-link
          to="/login"
          class="text-primary fw-semibold text-decoration-underline-hover"
        >
          log in
        </router-link>
        to access the platform.
      </p>

      <div class="container container-lg mb-5">
        <div class="card shadow-sm">
          <div class="card-header text-primary fw-bold text-center features-card-header">
              Platform Features
          </div>
          <ul class="list-group list-group-flush"> 
            <li 
              v-for="(feature, index) in features" 
              :key="index"
              class="list-group-item d-flex align-items-center p-3 feature-item"
            >
              <span :class="getIconColorClass(feature.color)" class="me-3 fs-5">
                <i :class="['fas fa-fw', feature.icon]"></i>
              </span>
              <span class="small text-secondary">{{ feature.text }}</span>
            </li>
          </ul>
        </div>
      </div>

      <p class="mt-5 small text-muted">
        This site is managed by the MCA department of KMCT School Of Business.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Feature {
    icon: string;
    color: 'primary' | 'info' | 'secondary' | 'warning' | 'success' | 'danger';
    text: string;
}

const features = ref<Feature[]>([
  { icon: 'fa-calendar-alt', color: 'primary', text: 'View upcoming and past events.' },
  { icon: 'fa-plus-circle', color: 'info', text: 'Request new events.' },
  { icon: 'fa-users', color: 'secondary', text: 'Participate in team-based events.' },
  { icon: 'fa-star', color: 'warning', text: 'Rate projects and provide feedback.' },
  { icon: 'fa-book', color: 'success', text: 'Access a library of shared resources.' },
  { icon: 'fa-trophy', color: 'primary', text: 'View leaderboards based on XP.' },
  { icon: 'fa-file-pdf', color: 'danger', text: 'Generate a portfolio of your achievements.' }
]);

const getIconColorClass = (color: Feature['color']): string => {
    switch (color) {
        case 'primary': return 'text-primary';
        case 'info': return 'text-info';
        case 'secondary': return 'text-secondary';
        case 'warning': return 'text-warning';
        case 'success': return 'text-success';
        case 'danger': return 'text-danger';
        default: return 'text-dark';
    }
};
</script>

<style scoped>
.landing-section {
  background-color: var(--bs-body-bg);
}

.text-decoration-underline-hover:hover {
  text-decoration: underline;
}

.features-card-header {
  background-color: var(--bs-secondary-bg-subtle);
  border-bottom: 1px solid var(--bs-border-color);
}
</style>
