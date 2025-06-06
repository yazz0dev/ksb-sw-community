<template>
  <main class="transparency-section">
    <div class="container-lg py-3 py-md-4"> <!-- Reduced from py-4 py-md-5 -->
      <!-- Header Section -->
      <header class="text-center mb-3 mb-md-4"> <!-- Reduced from mb-4 mb-md-5 -->
        <h1 class="h2 fw-bold text-primary mb-3">
          <i class="fas fa-eye me-2"></i>Community Transparency
        </h1>
        <p class="lead text-secondary mx-auto" style="max-width: 700px;">
          Understanding how our platform works and serves the KSB MCA community
        </p>
      </header>

      <!-- Quick Stats Section -->
      <section class="stats-section mb-3 mb-md-4"> <!-- Reduced from mb-4 mb-md-5 -->
        <div class="row g-3 g-md-4">
          <div class="col-6 col-md-3" v-for="stat in stats" :key="stat.label">
            <div class="stat-card text-center p-3 p-md-4 h-100">
              <div class="stat-number text-primary fw-bold mb-1">{{ stat.value }}+</div>
              <div class="stat-label small text-secondary">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Content Section -->
      <section class="content-section">
        <div class="row g-4 g-lg-5">
          <!-- First Row: Overview & How It Works -->
          <div class="col-12 col-md-6 d-flex">
            <div class="content-card w-100 d-flex flex-column">
              <div class="content-header">
                <h2 class="h4 text-primary mb-3">
                  <i class="fas fa-info-circle me-2"></i>What We Do
                </h2>
              </div>
              <div class="content-body flex-grow-1 d-flex flex-column">
                <p class="mb-3">
                  KSB Tech Community empowers MCA students through collaborative projects, 
                  skill-building events, and industry-focused learning experiences.
                </p>
                <ul class="feature-list list-unstyled mb-0">
                  <li class="feature-item d-flex flex-column flex-sm-row align-items-start mb-3" 
                      v-for="feature in platformFeatures" :key="feature.title">
                    <i :class="`${feature.icon} text-primary me-sm-2 mb-1 mb-sm-0`"></i>
                    <div>
                      <span class="fw-medium d-inline-block me-1">{{ feature.title }}:</span>
                      <span class="text-secondary small">{{ feature.description }}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- How It Works -->
          <div class="col-12 col-md-6 d-flex">
            <div class="content-card w-100 d-flex flex-column">
              <div class="content-header">
                <h2 class="h4 text-primary mb-3">
                  <i class="fas fa-cogs me-2"></i>How It Works
                </h2>
              </div>
              <div class="content-body flex-grow-1 d-flex flex-column">
                <ul class="process-steps list-unstyled mb-0">
                  <li class="step-item d-flex align-items-start mb-3" 
                      v-for="(step, index) in processSteps" :key="step.title">
                    <div class="step-number">{{ index + 1 }}</div>
                    <div class="step-content">
                      <h3 class="h6 mb-1">{{ step.title }}</h3>
                      <p class="small text-secondary mb-0">{{ step.description }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Second Row: Event Types & Participation -->
          <div class="col-12 col-md-6 d-flex">
            <div class="content-card w-100 d-flex flex-column">
              <div class="content-header">
                <h2 class="h4 text-info mb-3">
                  <i class="fas fa-calendar-check me-2"></i>Event Types
                </h2>
              </div>
              <div class="content-body flex-grow-1 d-flex flex-column">
                <p class="mb-3 small">
                  Our comprehensive event system supports multiple formats designed to enhance learning, 
                  collaboration, and real-world skill development for MCA students.
                </p>
                
                <!-- Event Types -->
                <div class="event-types">
                  <h3 class="small fw-bold text-info mb-2">Event Types & Formats:</h3>
                  <ul class="list-unstyled mb-0">
                    <li class="event-type-item" v-for="eventType in eventTypes.slice(0, 3)" :key="eventType.name">
                      <div class="d-flex flex-column flex-sm-row align-items-start mb-3">
                        <i :class="`${eventType.icon} text-info mt-1 me-sm-2 mb-1 mb-sm-0`" 
                           aria-hidden="true"></i>
                        <div class="flex-grow-1">
                          <div class="d-flex flex-column flex-sm-row align-items-start align-items-sm-center 
                                      justify-content-sm-between mb-1 gap-1">
                            <h4 class="small fw-bold mb-0">{{ eventType.name }}</h4>
                            <span class="badge bg-info text-white align-self-start align-self-sm-center">
                              {{ eventType.duration }}
                            </span>
                          </div>
                          <p class="small text-secondary mb-2">{{ eventType.description }}</p>
                          <div class="event-features mb-2">
                            <span v-for="feature in eventType.features" :key="feature" 
                                  class="badge bg-light text-dark me-1 mb-1">{{ feature }}</span>
                          </div>
                          <div class="event-example small text-muted" v-if="eventType.example">
                            <i class="fas fa-lightbulb me-1"></i>
                            <em>Example: {{ eventType.example }}</em>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Event System Participation -->
          <div class="col-12 col-md-6 d-flex">
            <div class="content-card w-100 d-flex flex-column">
              <div class="content-header">
                <h2 class="h4 text-info mb-3">
                  <i class="fas fa-users me-2"></i>Event Participation
                </h2>
              </div>
              <div class="content-body flex-grow-1 d-flex flex-column">
                <!-- Add same padding at top as the other card has with its paragraph -->
                <div class="mb-3 small d-md-block d-none">
                  &nbsp;
                </div>
                
                <!-- Remaining event types -->
                <div class="event-types mb-4">
                  <ul class="list-unstyled mb-0">
                    <li class="event-type-item" v-for="eventType in eventTypes.slice(3)" :key="eventType.name">
                      <div class="d-flex flex-column flex-sm-row align-items-start mb-3">
                        <i :class="`${eventType.icon} text-info mt-1 me-sm-2 mb-1 mb-sm-0`" 
                           aria-hidden="true"></i>
                        <div class="flex-grow-1">
                          <div class="d-flex flex-column flex-sm-row align-items-start align-items-sm-center 
                                      justify-content-sm-between mb-1 gap-1">
                            <h4 class="small fw-bold mb-0">{{ eventType.name }}</h4>
                            <span class="badge bg-info text-white align-self-start align-self-sm-center">
                              {{ eventType.duration }}
                            </span>
                          </div>
                          <p class="small text-secondary mb-2">{{ eventType.description }}</p>
                          <div class="event-features mb-2">
                            <span v-for="feature in eventType.features" :key="feature" 
                                  class="badge bg-light text-dark me-1 mb-1">{{ feature }}</span>
                          </div>
                          <div class="event-example small text-muted" v-if="eventType.example">
                            <i class="fas fa-lightbulb me-1"></i>
                            <em>Example: {{ eventType.example }}</em>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Participation & Lifecycle Section - Single Card Across Full Width -->
          <div class="col-12">
            <div class="content-card">
              <div class="content-header">
                <h2 class="h4 text-info mb-3">
                  <i class="fas fa-clipboard-check me-2"></i>How Students Engage
                </h2>
              </div>
              <div class="content-body">
                <div class="row">
                  <div class="col-md-6">
                    <!-- Event Participation -->
                    <h3 class="small fw-bold text-info mb-2">Participation Methods:</h3>
                    <ul class="participation-modes list-unstyled">
                      <li class="participation-item d-flex flex-column flex-sm-row align-items-start mb-2">
                        <i class="fas fa-user text-success me-sm-2 mb-1 mb-sm-0"></i>
                        <div>
                          <span class="fw-medium small d-inline-block me-1">Individual:</span>
                          <span class="text-secondary small">Solo projects, presentations, skill challenges</span>
                        </div>
                      </li>
                      <li class="participation-item d-flex flex-column flex-sm-row align-items-start mb-2">
                        <i class="fas fa-users text-primary me-sm-2 mb-1 mb-sm-0"></i>
                        <div>
                          <span class="fw-medium small d-inline-block me-1">Team-based:</span>
                          <span class="text-secondary small">Collaborative projects, hackathons, group challenges</span>
                        </div>
                      </li>
                      <li class="participation-item d-flex flex-column flex-sm-row align-items-start mb-2">
                        <i class="fas fa-clipboard-check text-warning me-sm-2 mb-1 mb-sm-0"></i>
                        <div>
                          <span class="fw-medium small d-inline-block me-1">Role-specific:</span>
                          <span class="text-secondary small">Developer, Designer, Presenter, Team Lead</span>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <!-- Event Lifecycle -->
                    <h3 class="small fw-bold text-info mb-2">Event Lifecycle:</h3>
                    <ol class="lifecycle-steps list-unstyled small text-secondary">
                      <li class="lifecycle-step d-flex flex-column flex-sm-row align-items-start mb-2">
                        <span class="lifecycle-number me-sm-2 mb-1 mb-sm-0">1</span>
                        <div>
                          <span class="fw-medium d-inline-block me-1">Request & Planning:</span>
                          <span class="text-muted">Community requests or admin-initiated events</span>
                        </div>
                      </li>
                      <li class="lifecycle-step d-flex flex-column flex-sm-row align-items-start mb-2">
                        <span class="lifecycle-number me-sm-2 mb-1 mb-sm-0">2</span>
                        <div>
                          <span class="fw-medium d-inline-block me-1">Registration:</span>
                          <span class="text-muted">Students join individually or form teams</span>
                        </div>
                      </li>
                      <li class="lifecycle-step d-flex flex-column flex-sm-row align-items-start mb-2">
                        <span class="lifecycle-number me-sm-2 mb-1 mb-sm-0">3</span>
                        <div>
                          <span class="fw-medium d-inline-block me-1">Active Phase:</span>
                          <span class="text-muted">Collaboration, development, and learning</span>
                        </div>
                      </li>
                      <li class="lifecycle-step d-flex flex-column flex-sm-row align-items-start">
                        <span class="lifecycle-number me-sm-2 mb-1 mb-sm-0">4</span>
                        <div>
                          <span class="fw-medium d-inline-block me-1">Completion:</span>
                          <span class="text-muted">Submission, peer review, XP distribution</span>
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Bottom Row: XP & Technology -->
          <div class="col-12 col-md-6 d-flex">
            <div class="content-card w-100 d-flex flex-column">
              <div class="content-header">
                <h2 class="h4 text-warning mb-3">
                  <i class="fas fa-star me-2"></i>XP & Recognition
                </h2>
              </div>
              <div class="content-body flex-grow-1 d-flex flex-column">
                <p class="mb-3 small">
                  Earn experience points through participation, collaboration, and quality contributions.
                </p>
                <ul class="xp-categories list-unstyled mb-0">
                  <li class="xp-item" v-for="category in xpCategories" :key="category.name">
                    <div class="d-flex flex-column flex-sm-row align-items-start justify-content-between">
                      <div class="d-flex align-items-center mb-1 mb-sm-0">
                        <i :class="`${category.icon} me-2 text-primary`"></i>
                        <span class="small fw-medium">{{ category.name }}</span>
                      </div>
                      <span class="badge bg-primary">{{ category.baseXP }} XP</span>
                    </div>
                  </li>
                </ul>
                
                <!-- Add spacer at the bottom to match height with tech card -->
                <div class="mt-auto pt-3 d-md-block d-none"></div>
              </div>
            </div>
          </div>

          <!-- Technology & Privacy -->
          <div class="col-12 col-md-6 d-flex">
            <div class="content-card w-100 d-flex flex-column">
              <div class="content-header">
                <h2 class="h4 text-success mb-3">
                  <i class="fas fa-shield-alt me-2"></i>Technology & Privacy
                </h2>
              </div>
              <div class="content-body flex-grow-1 d-flex flex-column">
                <div class="mb-3">
                  <h3 class="small fw-bold text-success mb-2">Built With:</h3>
                  <div class="tech-stack">
                    <span class="badge bg-light text-dark me-1 mb-1" v-for="tech in techStack" :key="tech">{{ tech }}</span>
                  </div>
                </div>
                <div>
                  <h3 class="small fw-bold text-success mb-2">Privacy Measures:</h3>
                  <ul class="privacy-list mb-0">
                    <li v-for="measure in privacyMeasures" :key="measure" 
                        class="d-flex align-items-start">
                      <i class="fas fa-check text-success me-2 mt-1"></i>
                      <span>{{ measure }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact Section -->
      <section class="contact-section mt-4 mt-md-5">
        <div class="card border-0 bg-primary text-white">
          <div class="card-body text-center p-4 p-md-5">
            <h2 class="h4 mb-3">Questions or Feedback?</h2>
            <p class="mb-4 opacity-90">
              We're committed to transparency and continuous improvement. 
              Reach out to us with any questions or suggestions.
            </p>
            <div class="d-flex flex-column flex-sm-row gap-3 justify-content-center">
              <a href="mailto:labkmct@gmail.com" class="btn btn-light">
                <i class="fas fa-envelope me-2"></i>Contact Us
              </a>
              <router-link to="/legal" class="btn btn-outline-light">
                <i class="fas fa-file-contract me-2"></i>Terms & Privacy
              </router-link>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="text-center mt-4 pt-4 border-top">
        <p class="small text-muted mb-0">
          Managed by the MCA department at KMCT School of Business | 
          Platform Version: {{ platformVersion }}
        </p>
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Simplified statistics
const stats = ref([
  { value: 30, label: 'Active Students' },
  { value: 5, label: 'Projects' },
  { value: 5, label: 'Events Held' },
  { value: 15, label: 'Total XP (K)' }
]);

// Platform features
const platformFeatures = ref([
  {
    title: 'Event Management',
    description: 'Create, join, and manage tech events',
    icon: 'fas fa-calendar-alt'
  },
  {
    title: 'Collaborative Projects',
    description: 'Work together on real-world projects to build skills and portfolios',
    icon: 'fas fa-project-diagram'
  },
  {
    title: 'Skill-Building Events',
    description: 'Participate in workshops and hackathons to enhance your technical skills',
    icon: 'fas fa-tools'
  },
  {
    title: 'Industry Connections',
    description: 'Connect with industry professionals and explore career opportunities',
    icon: 'fas fa-briefcase'
  },
  {
    title: 'Mentorship',
    description: 'Receive guidance and support from experienced mentors in the tech field',
    icon: 'fas fa-user-graduate'
  }
]);

// Simplified process steps
const processSteps = ref([
  { title: 'Join Events', description: 'Browse and participate in hackathons, workshops, and challenges' },
  { title: 'Collaborate', description: 'Form teams, share skills, and work on exciting projects together' },
  { title: 'Earn Recognition', description: 'Get XP for participation, receive peer ratings and feedback' },
  { title: 'Build Portfolio', description: 'Generate professional portfolios showcasing your growth' }
]);

// Enhanced event types with more details
const eventTypes = ref([
  { 
    name: 'Hackathons', 
    icon: 'fas fa-code', 
    duration: '24-48hrs',
    description: 'Intensive coding competitions where teams build functional projects within time constraints',
    features: ['Team collaboration', 'Real projects', 'Mentorship', 'Peer judging', 'Innovation focus'],
    example: 'Build a mobile app for campus management in 36 hours'
  },
  { 
    name: 'Workshops', 
    icon: 'fas fa-chalkboard-teacher', 
    duration: '2-4hrs',
    description: 'Skill-building sessions led by industry experts or experienced students',
    features: ['Hands-on learning', 'Expert instructors', 'Certificates', 'Q&A sessions'],
    example: 'React.js fundamentals workshop with live coding exercises'
  },
  { 
    name: 'Tech Talks', 
    icon: 'fas fa-microphone', 
    duration: '1-2hrs',
    description: 'Industry insights and knowledge sharing sessions by professionals and alumni',
    features: ['Industry insights', 'Networking', 'Q&A sessions', 'Career guidance'],
    example: 'AI in Healthcare - Industry trends and career opportunities'
  },
  { 
    name: 'Project Showcases', 
    icon: 'fas fa-presentation', 
    duration: '3-4hrs',
    description: 'Students present their completed projects to peers and industry mentors',
    features: ['Public speaking', 'Demo projects', 'Feedback sessions', 'Portfolio building'],
    example: 'Final year project presentations with industry panel review'
  },
  { 
    name: 'Study Jams', 
    icon: 'fas fa-book-reader', 
    duration: '2-3hrs',
    description: 'Collaborative learning sessions focused on specific technologies or concepts',
    features: ['Peer learning', 'Resource sharing', 'Group discussions', 'Problem solving'],
    example: 'Data Structures & Algorithms practice session with peer teaching'
  },
  { 
    name: 'Coding Competitions', 
    icon: 'fas fa-trophy', 
    duration: '3-5hrs',
    description: 'Competitive programming challenges testing algorithmic and problem-solving skills',
    features: ['Individual/Team', 'Algorithmic thinking', 'Time pressure', 'Ranking system'],
    example: 'Weekly coding contest with problems ranging from beginner to advanced'
  }
]);

// XP categories
const xpCategories = ref([
  { name: 'Participation', icon: 'fas fa-hand-paper', baseXP: 25 },
  { name: 'Development', icon: 'fas fa-code', baseXP: 50 },
  { name: 'Presentation', icon: 'fas fa-microphone', baseXP: 40 },
  { name: 'Leadership', icon: 'fas fa-users-cog', baseXP: 60 }
]);

// Essential tech stack
const techStack = ref([
  'Vue 3', 'TypeScript', 'Firebase', 'Bootstrap 5', 'PWA'
]);

// Key privacy measures
const privacyMeasures = ref([
  'Data encryption in transit and at rest',
  'Role-based access control',
  'Regular security audits',
  'User data control and transparency'
]);

const platformVersion = ref('2.1.0');
</script>

<style scoped>
.transparency-section {
  background-color: var(--bs-body-bg);
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding: 1.5rem 0 2rem 0;
}

.stat-card,
.content-card {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  transition: all 0.2s ease;
}

.content-card {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-body {
  flex: 1 1 auto;
}

.stat-card {
  text-align: center;
}

.stat-card:hover,
.content-card:hover {
  border-color: var(--bs-primary-bg-subtle);
  box-shadow: var(--bs-box-shadow-sm);
  transform: translateY(-2px);
}

.stat-number {
  font-size: 1.25rem;
  line-height: 1.2;
}

.feature-item,
.step-item,
.participation-item,
.lifecycle-step {
  margin-bottom: 0.75rem;
}

.step-number,
.lifecycle-number {
  width: 20px;
  height: 20px;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 0.5rem;
}

.step-number {
  background: var(--bs-primary);
}

.lifecycle-number {
  background: var(--bs-info);
}

.event-type-item {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--bs-border-color-translucent);
  margin-bottom: 0.75rem;
}

.event-type-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.badge {
  font-size: 0.65rem;
  padding: 0.25em 0.5em;
}

.event-example {
  padding: 0.4rem;
  background-color: var(--bs-light);
  border-radius: var(--bs-border-radius-sm);
  border-left: 3px solid var(--bs-info);
  font-size: 0.75rem;
}

.xp-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.xp-item:last-child {
  border-bottom: none;
}

.privacy-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.privacy-list li {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.contact-section .card {
  background: linear-gradient(135deg, var(--bs-primary) 0%, var(--bs-info) 100%) !important;
}

.contact-section .btn {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Animation for content cards */
.content-card {
  animation: fadeInUp 0.6s ease-out both;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Tablet and up */
@media (min-width: 576px) {
  .content-card {
    padding: 1.25rem;
  }
  
  .badge {
    font-size: 0.7rem;
  }
  
  .stat-number {
    font-size: 1.4rem;
  }
}

/* Desktop and up - Adjust for equal heights */
@media (min-width: 768px) {
  .transparency-section {
    padding: 2rem 0 4rem 0;
  }
  
  .content-card {
    padding: 1.5rem;
  }
  
  .stat-number {
    font-size: 1.5rem;
  }
  
  /* Animation delays for staggered effect */
  .content-card:nth-child(2) { animation-delay: 0.1s; }
  .content-card:nth-child(3) { animation-delay: 0.2s; }
  .content-card:nth-child(4) { animation-delay: 0.3s; }
  
  /* Ensure consistent heights within rows */
  .row > .col-md-6:nth-child(odd) .content-card,
  .row > .col-md-6:nth-child(even) .content-card {
    height: 100%;
  }
}

@media (min-width: 992px) {
  .transparency-section {
    min-height: calc(100vh - var(--navbar-height-desktop));
  }
}
</style>
