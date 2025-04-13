<template>
  <div class="section has-text-centered py-6 px-4">
    <div class="container is-max-widescreen">
      <h1 class="title is-1 has-text-primary mb-4">
        Welcome to the KSB Tech Community!
      </h1>
      <p class="subtitle is-5 has-text-grey mb-6 mx-auto" style="max-width: 48rem;">
        Manage events, collaborate on projects, and share resources within the KSB MCA community.
      </p>
      <p class="mb-8 has-text-grey">
        Please 
        <router-link
          to="/login"
          class="has-text-primary has-text-weight-semibold is-underlined-hover"
        >
          log in
        </router-link>
        to access the platform.
      </p>

      <div class="container is-max-desktop mb-8">
        <div class="card">
          <header class="card-header" style="background-color: var(--color-surface-variant); border-bottom: 1px solid var(--color-border);">
            <p class="card-header-title has-text-primary is-centered">
              Platform Features
            </p>
          </header>
          <div class="card-content p-0"> 
            <div 
              v-for="(feature, index) in features" 
              :key="index"
              class="is-flex is-align-items-center p-4 feature-item"
            >
              <span class="icon mr-3" :class="getIconColorClass(feature.color)">
                <i :class="['fas', feature.icon]"></i>
              </span>
              <span class="is-size-7 has-text-grey">{{ feature.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <p class="mt-6 is-size-7 has-text-grey-light">
        This site is managed by the MCA department of KMCT School Of Business.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// Removed Chakra UI imports

const features = ref([
  { icon: 'fa-calendar-alt', color: 'primary', text: 'View upcoming and past events.' },
  { icon: 'fa-plus-circle', color: 'info', text: 'Request new events.' },
  { icon: 'fa-users', color: 'neutral', text: 'Participate in team-based events.' },
  { icon: 'fa-star', color: 'warning', text: 'Rate projects and provide feedback.' },
  { icon: 'fa-book', color: 'success', text: 'Access a library of shared resources.' },
  { icon: 'fa-trophy', color: 'primary', text: 'View leaderboards based on XP.' },
  { icon: 'fa-file-pdf', color: 'error', text: 'Generate a portfolio of your achievements.' }
]);

const getIconColorClass = (color) => {
  switch (color) {
    case 'primary': return 'has-text-primary';
    case 'info': return 'has-text-info';
    case 'neutral': return 'has-text-grey'; // Mapped neutral to grey
    case 'warning': return 'has-text-warning';
    case 'success': return 'has-text-success';
    case 'error': return 'has-text-danger'; // Mapped error to danger
    default: return 'has-text-dark';
  }
};
</script>

<style scoped>
.is-underlined-hover:hover {
  text-decoration: underline;
}

.feature-item + .feature-item {
  border-top: 1px solid #dbdbdb; /* Standard Bulma border color */
  /* Or use a variable if you have defined one: border-top: 1px solid var(--bulma-border); */
}

/* Ensure card header title is centered even if actions are added later */
.card-header-title.is-centered {
  margin-left: auto;
  margin-right: auto;
}
</style>
