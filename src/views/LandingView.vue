// src/views/LandingView.vue
<template>
  <div class="container">
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
    <p>
        This site is managed by the MCA department of KMCT College of Engineering for Women.
    </p>
  </div>
</template>

<script>
export default {
  name: 'LandingView',
};
</script>

<style scoped>
/* Add some basic styling if you want */
.container {
  text-align: center;
  margin-top: 50px;
}
</style>