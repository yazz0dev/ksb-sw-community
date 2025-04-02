// src/views/LandingView.vue
<template>
  <div class="landing-container container text-center py-5"> 
    <h1 class="mb-3">Welcome to the KSB MCA S/W Community!</h1>
    <p class="lead text-muted mb-4"> 
      Manage events, collaborate on projects, and share resources within the KSB MCA community.
    </p>
    <p class="mb-5">
      Please <router-link to="/login" class="fw-bold">log in</router-link> to access the platform.
    </p>

    <div class="row justify-content-center mb-4">
        <div class="col-md-8 col-lg-6">
            <div class="card text-start shadow"> 
                <div class="card-header"><h5 class="mb-0">Platform Features</h5></div>
                <ul class="list-group list-group-flush">
                     <li class="list-group-item"><i class="fas fa-calendar-alt fa-fw me-2 text-primary"></i>View upcoming and past events.</li>
                     <li class="list-group-item"><i class="fas fa-plus-circle fa-fw me-2 text-info"></i>Request new events.</li>
                     <li class="list-group-item"><i class="fas fa-users fa-fw me-2 text-secondary"></i>Participate in team-based events.</li>
                     <li class="list-group-item"><i class="fas fa-star fa-fw me-2 text-warning"></i>Rate projects and provide feedback.</li>
                     <li class="list-group-item"><i class="fas fa-book fa-fw me-2 text-success"></i>Access a library of shared resources.</li>
                     <li class="list-group-item"><i class="fas fa-trophy fa-fw me-2 text-primary"></i>View leaderboards based on XP.</li>
                     <li class="list-group-item"><i class="fas fa-file-pdf fa-fw me-2 text-danger"></i>Generate a portfolio of your achievements.</li>
                </ul>
            </div>
        </div>
    </div>

    <p class="mt-5">
        <small class="text-muted">This site is managed by the MCA department of KMCT School Of Business.</small>
    </p>
  </div>
</template>

<script setup>
// No script logic needed for this simple view
</script>

<style scoped>
.landing-container {
  max-width: 900px; /* Limit width */
}
/* Removed redundant icon width style, relying on fa-fw class */
</style>
