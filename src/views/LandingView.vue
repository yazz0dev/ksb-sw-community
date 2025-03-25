// src/views/LandingView.vue
<template>
  <!-- Use the specific landing container class -->
  <div class="landing-container container">
    <h1>Welcome to the KSB MCA S/W Community!</h1>
    <p>
      This platform is for managing events, collaborating on projects, and
      sharing resources within the KSB MCA community.
    </p>
    <p>
      Please <router-link to="/login">log in</router-link> to access the
      application.
    </p>
    <p>Features:</p>
    <ul>
      <li>View upcoming events.</li>
      <li>Request new events (for students and admins).</li>
      <li>Participate in teams (for team-based events).</li>
      <li>Rate events and provide feedback.</li>
      <li>Access a library of resources.</li>
      <li>View a leaderboard of top contributors.</li>
      <li>Generate a portfolio of your achievements.</li>
    </ul>
    <p class="mt-3">
        <small>This site is managed by the MCA department of KMCT School Of Buisiness.</small>
    </p>
  </div>
</template>

<script>
export default {
  name: 'LandingView',
};
</script>
