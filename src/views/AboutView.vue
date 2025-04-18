<template>
  <section class="py-5 about-section">
    <div class="container-lg">
      <h1 class="display-5 fw-bold text-primary mb-4">About KSB Tech Community</h1>
      <p class="lead text-secondary mb-4" style="max-width: 48rem;">
        The KSB Tech Community is a collaborative platform for MCA students at KMCT School Of Business to learn, build, and grow together through real-world software projects and events.
      </p>
      <div class="mb-5">
        <h2 class="h4 text-primary mb-3">Our Mission</h2>
        <ul class="list-unstyled ms-3">
          <li class="mb-2"><i class="fas fa-lightbulb text-warning me-2"></i> Foster practical software development experience</li>
          <li class="mb-2"><i class="fas fa-users text-info me-2"></i> Encourage peer learning and mentorship</li>
          <li class="mb-2"><i class="fas fa-folder-open text-success me-2"></i> Build a portfolio of real-world projects</li>
          <li class="mb-2"><i class="fas fa-rocket text-primary me-2"></i> Develop professional and technical skills</li>
        </ul>
      </div>
      <div class="mb-5">
        <h2 class="h4 text-primary mb-3">What We Offer</h2>
        <ul class="list-unstyled ms-3">
          <li class="mb-2"><i class="fas fa-calendar-alt text-primary me-2"></i> Regular events and hackathons</li>
          <li class="mb-2"><i class="fas fa-users text-secondary me-2"></i> Team-based and individual projects</li>
          <li class="mb-2"><i class="fas fa-star text-warning me-2"></i> XP and rating system for recognition</li>
          <li class="mb-2"><i class="fas fa-book text-success me-2"></i> Curated resources and learning materials</li>
          <li class="mb-2"><i class="fas fa-trophy text-danger me-2"></i> Leaderboards and portfolio generation</li>
        </ul>
      </div>
      <div class="mb-5">
        <h2 class="h4 text-primary mb-3">How to Get Involved</h2>
        <ol class="ms-3">
          <li class="mb-2">Log in with your student account</li>
          <li class="mb-2">Participate in events or request new ones</li>
          <li class="mb-2">Collaborate, submit projects, and earn XP</li>
          <li class="mb-2">Rate peers and provide feedback</li>
          <li class="mb-2">Track your progress and build your portfolio</li>
        </ol>
      </div>
      <!-- Sponsorship Section -->
      <div class="mb-5">
        <h2 class="h4 text-primary mb-3">Sponsor the Tech Community</h2>
        <p class="text-secondary mb-2">
          We welcome sponsorships and partnerships from organizations, companies, and individuals who wish to support student innovation and skill development. Sponsoring the KSB Tech Community helps us organize more impactful events, provide better resources, and empower the next generation of tech professionals.
        </p>
        <p class="text-secondary mb-2">
          If you are interested in sponsoring or collaborating with us, please contact the MCA department at KMCT School Of Business or reach out via our social channels below.
        </p>
      </div>
      <div class="mb-5">
        <h2 class="h4 text-primary mb-3">Contact & Socials</h2>
        <p class="text-secondary mb-2">For questions or suggestions, reach out to the MCA department or connect with us on:</p>
        <div class="mb-3">
          <a href="#" target="_blank" rel="noopener" class="text-secondary me-3" aria-label="Facebook">
            <i class="fab fa-facebook fa-lg"></i>
          </a>
          <a href="#" target="_blank" rel="noopener" class="text-secondary me-3" aria-label="Instagram">
            <i class="fab fa-instagram fa-lg"></i>
          </a>
          <a href="#" target="_blank" rel="noopener" class="text-secondary me-3" aria-label="LinkedIn">
            <i class="fab fa-linkedin fa-lg"></i>
          </a>
          <a href="#" target="_blank" rel="noopener" class="text-secondary" aria-label="GitHub">
            <i class="fab fa-github fa-lg"></i>
          </a>
        </div>
        <router-link to="/transparency" class="btn btn-outline-primary btn-sm">
          <i class="fas fa-eye me-2"></i> Community Transparency
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// No logic needed for static about page
</script>

<style scoped>
.about-section {
  background-color: var(--bs-body-bg);
}
</style>
