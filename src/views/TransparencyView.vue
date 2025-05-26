<template>
  <div class="transparency-section">
    <div class="container-lg py-5">
      <!-- Header -->
      <div class="text-center mb-5">
        <h1 class="display-4 fw-bold text-primary mb-3">
          <i class="fas fa-eye me-3"></i>How KSB Tech Community Works
        </h1>
        <p class="lead text-secondary mx-auto" style="max-width: 600px;">
          Complete transparency about our platform's features, systems, and processes
        </p>
      </div>

      <!-- Quick Navigation -->
      <div class="card shadow-sm mb-5">
        <div class="card-body">
          <h5 class="card-title mb-3">
            <i class="fas fa-compass me-2 text-primary"></i>Quick Navigation
          </h5>
          <div class="row g-2">
            <div class="col-md-6 col-lg-4" v-for="section in navigationSections" :key="section.id">
              <a :href="`#${section.id}`" class="btn btn-outline-primary btn-sm w-100 text-start">
                <i :class="section.icon + ' me-2'"></i>{{ section.title }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform Overview -->
      <section id="overview" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-info-circle me-2"></i>Platform Overview
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-8">
                <h5 class="text-primary mb-3">What is KSB Tech Community?</h5>
                <p class="mb-3">
                  KSB Tech Community is a comprehensive platform designed for MCA students at KMCT School of Business 
                  to collaborate, learn, and grow through real-world software projects and events. Our platform 
                  facilitates event management, team collaboration, skill development, and portfolio building.
                </p>
                <h6 class="text-primary mb-2">Core Mission</h6>
                <ul class="list-unstyled mb-3">
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Foster practical software development experience</li>
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Encourage peer learning and mentorship</li>
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Build portfolios of real-world projects</li>
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Develop professional and technical skills</li>
                </ul>
              </div>
              <div class="col-lg-4">
                <div class="bg-light rounded p-3">
                  <h6 class="text-primary mb-3">Platform Statistics</h6>
                  <div class="d-flex justify-content-between mb-2">
                    <span class="small">Active Users:</span>
                    <span class="fw-bold">{{ stats.activeUsers }}+</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span class="small">Events Hosted:</span>
                    <span class="fw-bold">{{ stats.eventsHosted }}+</span>
                  </div>
                  <div class="d-flex justify-content-between mb-2">
                    <span class="small">Projects Created:</span>
                    <span class="fw-bold">{{ stats.projectsCreated }}+</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="small">XP Distributed:</span>
                    <span class="fw-bold">{{ stats.xpDistributed }}+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- User Journey -->
      <section id="user-journey" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-info text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-route me-2"></i>User Journey
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-md-6" v-for="(journey, index) in userJourneys" :key="journey.type">
                <div class="border rounded p-3 h-100">
                  <h5 class="text-primary mb-3">
                    <i :class="journey.icon + ' me-2'"></i>{{ journey.type }}
                  </h5>
                  <ol class="ps-3">
                    <li v-for="step in journey.steps" :key="step" class="mb-2 small">{{ step }}</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Event Management System -->
      <section id="events" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-success text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-calendar-alt me-2"></i>Event Management System
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-6">
                <h5 class="text-success mb-3">Event Lifecycle</h5>
                <div class="timeline">
                  <div v-for="(stage, index) in eventLifecycle" :key="stage.name" class="timeline-item">
                    <div class="timeline-marker">
                      <i :class="stage.icon + ' text-success'"></i>
                    </div>
                    <div class="timeline-content">
                      <h6 class="mb-1">{{ stage.name }}</h6>
                      <p class="small text-muted mb-0">{{ stage.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-6">
                <h5 class="text-success mb-3">Event Types & Formats</h5>
                <div class="row g-3">
                  <div class="col-12" v-for="format in eventFormats" :key="format.name">
                    <div class="border rounded p-3">
                      <h6 class="mb-2">
                        <i :class="format.icon + ' me-2 text-primary'"></i>{{ format.name }}
                      </h6>
                      <p class="small text-muted mb-2">{{ format.description }}</p>
                      <div class="d-flex flex-wrap gap-1">
                        <span v-for="feature in format.features" :key="feature" 
                              class="badge bg-light text-dark small">{{ feature }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- XP & Rating System -->
      <section id="xp-system" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-warning text-dark">
            <h2 class="h4 mb-0">
              <i class="fas fa-star me-2"></i>Experience Points (XP) & Rating System
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-6">
                <h5 class="text-warning mb-3">XP Categories</h5>
                <div class="row g-3">
                  <div class="col-12" v-for="category in xpCategories" :key="category.key">
                    <div class="d-flex align-items-center p-2 border rounded">
                      <i :class="category.icon + ' me-3 text-primary'"></i>
                      <div class="flex-grow-1">
                        <h6 class="mb-1">{{ category.name }}</h6>
                        <p class="small text-muted mb-0">{{ category.description }}</p>
                      </div>
                      <span class="badge bg-primary">{{ category.baseXP }} XP</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-6">
                <h5 class="text-warning mb-3">How XP is Calculated</h5>
                <div class="bg-light rounded p-3 mb-3">
                  <h6 class="mb-2">XP Sources:</h6>
                  <ul class="list-unstyled mb-0">
                    <li class="mb-2"><i class="fas fa-plus text-success me-2"></i>Event Participation (Base XP)</li>
                    <li class="mb-2"><i class="fas fa-plus text-success me-2"></i>Role-specific Contributions</li>
                    <li class="mb-2"><i class="fas fa-plus text-success me-2"></i>Peer Ratings & Feedback</li>
                    <li class="mb-2"><i class="fas fa-plus text-success me-2"></i>Project Quality & Innovation</li>
                    <li class="mb-2"><i class="fas fa-plus text-success me-2"></i>Best Performer Bonuses</li>
                    <li class="mb-2"><i class="fas fa-plus text-success me-2"></i>Event Organization</li>
                  </ul>
                </div>
                <div class="alert alert-info">
                  <i class="fas fa-info-circle me-2"></i>
                  <strong>Fair Play:</strong> XP is calculated automatically based on participation, 
                  peer ratings, and objective criteria. Manual XP adjustments are logged and transparent.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Team & Collaboration -->
      <section id="collaboration" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-secondary text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-users me-2"></i>Team Formation & Collaboration
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-8">
                <h5 class="text-secondary mb-3">Team Formation Process</h5>
                <div class="row g-3">
                  <div class="col-md-6" v-for="(step, index) in teamFormationSteps" :key="step.title">
                    <div class="card border-0 bg-light h-100">
                      <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                          <span class="badge bg-secondary rounded-circle me-2">{{ index + 1 }}</span>
                          <h6 class="mb-0">{{ step.title }}</h6>
                        </div>
                        <p class="small text-muted mb-0">{{ step.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <h5 class="text-secondary mb-3">Collaboration Features</h5>
                <ul class="list-unstyled">
                  <li class="mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    Team Lead Selection
                  </li>
                  <li class="mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    Role Assignment
                  </li>
                  <li class="mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    Project Submission
                  </li>
                  <li class="mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    Peer Rating System
                  </li>
                  <li class="mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    Progress Tracking
                  </li>
                  <li class="mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    Communication Tools
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Technology Stack -->
      <section id="technology" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-dark text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-code me-2"></i>Technology Stack & Architecture
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-6">
                <h5 class="mb-3">Frontend Technologies</h5>
                <div class="row g-2">
                  <div class="col-6" v-for="tech in frontendTech" :key="tech.name">
                    <div class="d-flex align-items-center p-2 border rounded">
                      <i :class="tech.icon + ' me-2'" :style="{ color: tech.color }"></i>
                      <div>
                        <div class="fw-bold small">{{ tech.name }}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">{{ tech.purpose }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-6">
                <h5 class="mb-3">Backend & Infrastructure</h5>
                <div class="row g-2">
                  <div class="col-6" v-for="tech in backendTech" :key="tech.name">
                    <div class="d-flex align-items-center p-2 border rounded">
                      <i :class="tech.icon + ' me-2'" :style="{ color: tech.color }"></i>
                      <div>
                        <div class="fw-bold small">{{ tech.name }}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">{{ tech.purpose }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-4">
              <h5 class="mb-3">Key Features & Capabilities</h5>
              <div class="row g-3">
                <div class="col-md-4" v-for="feature in platformFeatures" :key="feature.name">
                  <div class="text-center p-3 border rounded">
                    <i :class="feature.icon + ' fa-2x mb-2 text-primary'"></i>
                    <h6 class="mb-1">{{ feature.name }}</h6>
                    <p class="small text-muted mb-0">{{ feature.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Data & Privacy -->
      <section id="privacy" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-danger text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-shield-alt me-2"></i>Data Handling & Privacy
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-6">
                <h5 class="text-danger mb-3">Data We Collect</h5>
                <div class="accordion" id="dataAccordion">
                  <div class="accordion-item" v-for="(dataType, index) in dataTypes" :key="dataType.category">
                    <h6 class="accordion-header">
                      <button class="accordion-button collapsed" type="button" 
                              :data-bs-toggle="'collapse'" 
                              :data-bs-target="`#collapse${index}`">
                        <i :class="dataType.icon + ' me-2'"></i>{{ dataType.category }}
                      </button>
                    </h6>
                    <div :id="`collapse${index}`" class="accordion-collapse collapse" 
                         data-bs-parent="#dataAccordion">
                      <div class="accordion-body">
                        <ul class="list-unstyled mb-0">
                          <li v-for="item in dataType.items" :key="item" class="mb-1">
                            <i class="fas fa-dot-circle text-primary me-2" style="font-size: 0.5rem;"></i>{{ item }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-6">
                <h5 class="text-danger mb-3">Privacy & Security Measures</h5>
                <div class="list-group list-group-flush">
                  <div class="list-group-item" v-for="measure in privacyMeasures" :key="measure.title">
                    <div class="d-flex align-items-start">
                      <i :class="measure.icon + ' me-3 mt-1 text-success'"></i>
                      <div>
                        <h6 class="mb-1">{{ measure.title }}</h6>
                        <p class="mb-0 small text-muted">{{ measure.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Student Registration -->
      <section id="registration" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-user-plus me-2"></i>Student Registration Process
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-8">
                <h5 class="text-primary mb-3">How New Students Join</h5>
                <p class="mb-3">
                  We use a controlled registration system to ensure only legitimate students can access the platform.
                  This maintains the quality and security of our community.
                </p>
                <div class="row g-3">
                  <div class="col-md-6" v-for="(step, index) in registrationSteps" :key="step.title">
                    <div class="card border-primary h-100">
                      <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                          <span class="badge bg-primary rounded-circle me-2">{{ index + 1 }}</span>
                          <h6 class="mb-0">{{ step.title }}</h6>
                        </div>
                        <p class="small text-muted mb-0">{{ step.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-4">
                <div class="bg-light rounded p-3">
                  <h6 class="text-primary mb-3">Registration Features</h6>
                  <ul class="list-unstyled mb-0">
                    <li class="mb-2">
                      <i class="fas fa-link text-success me-2"></i>
                      Admin-generated signup links
                    </li>
                    <li class="mb-2">
                      <i class="fas fa-calendar text-success me-2"></i>
                      Batch-specific registration
                    </li>
                    <li class="mb-2">
                      <i class="fas fa-shield-alt text-success me-2"></i>
                      Duplicate prevention
                    </li>
                    <li class="mb-2">
                      <i class="fas fa-clock text-success me-2"></i>
                      Pending approval system
                    </li>
                    <li class="mb-2">
                      <i class="fas fa-envelope text-success me-2"></i>
                      Email notifications
                    </li>
                    <li class="mb-2">
                      <i class="fas fa-history text-success me-2"></i>
                      Audit trail tracking
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact & Support -->
      <section id="contact" class="mb-5">
        <div class="card shadow-sm">
          <div class="card-header bg-info text-white">
            <h2 class="h4 mb-0">
              <i class="fas fa-headset me-2"></i>Contact & Support
            </h2>
          </div>
          <div class="card-body">
            <div class="row g-4">
              <div class="col-lg-6">
                <h5 class="text-info mb-3">Get Help & Support</h5>
                <div class="list-group list-group-flush">
                  <div class="list-group-item d-flex align-items-center">
                    <i class="fas fa-envelope text-primary me-3"></i>
                    <div>
                      <strong>Email Support</strong>
                      <div class="small text-muted">labkmct@gmail.com</div>
                    </div>
                  </div>
                  <div class="list-group-item d-flex align-items-center">
                    <i class="fab fa-instagram text-primary me-3"></i>
                    <div>
                      <strong>Social Media</strong>
                      <div class="small text-muted">Follow us for updates</div>
                    </div>
                  </div>
                  <div class="list-group-item d-flex align-items-center">
                    <i class="fab fa-github text-primary me-3"></i>
                    <div>
                      <strong>Open Source</strong>
                      <div class="small text-muted">Contribute to our platform</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-6">
                <h5 class="text-info mb-3">Feedback & Suggestions</h5>
                <p class="mb-3">
                  We value your feedback and continuously improve our platform based on user suggestions. 
                  Your input helps us create a better experience for the entire community.
                </p>
                <div class="d-grid gap-2">
                  <router-link to="/legal" class="btn btn-outline-info">
                    <i class="fas fa-file-contract me-2"></i>Terms & Privacy Policy
                  </router-link>
                  <a href="mailto:labkmct@gmail.com" class="btn btn-info">
                    <i class="fas fa-paper-plane me-2"></i>Send Feedback
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="text-center mt-5 pt-4 border-top">
        <p class="text-muted">
          <i class="fas fa-heart text-danger me-1"></i>
          Built with transparency and community in mind by the MCA department at KMCT School of Business
        </p>
        <p class="small text-muted">
          Last updated: {{ lastUpdated }} | Platform Version: {{ platformVersion }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Platform statistics (these would typically come from an API)
const stats = ref({
  activeUsers: 150,
  eventsHosted: 25,
  projectsCreated: 80,
  xpDistributed: 15000
});

// Navigation sections
const navigationSections = ref([
  { id: 'overview', title: 'Platform Overview', icon: 'fas fa-info-circle' },
  { id: 'user-journey', title: 'User Journey', icon: 'fas fa-route' },
  { id: 'events', title: 'Event Management', icon: 'fas fa-calendar-alt' },
  { id: 'xp-system', title: 'XP & Rating System', icon: 'fas fa-star' },
  { id: 'collaboration', title: 'Team Collaboration', icon: 'fas fa-users' },
  { id: 'technology', title: 'Technology Stack', icon: 'fas fa-code' },
  { id: 'privacy', title: 'Data & Privacy', icon: 'fas fa-shield-alt' },
  { id: 'registration', title: 'Student Registration', icon: 'fas fa-user-plus' },
  { id: 'contact', title: 'Contact & Support', icon: 'fas fa-headset' }
]);

// User journeys
const userJourneys = ref([
  {
    type: 'New Student Journey',
    icon: 'fas fa-user-graduate',
    steps: [
      'Receive admin-generated signup link',
      'Complete registration form with student details',
      'Wait for admin approval',
      'Receive account activation email',
      'Log in and complete profile setup',
      'Browse available events and resources',
      'Join first event or team',
      'Start earning XP and building portfolio'
    ]
  },
  {
    type: 'Event Participant Journey',
    icon: 'fas fa-calendar-check',
    steps: [
      'Browse upcoming events on dashboard',
      'Join event individually or form/join team',
      'Participate in event activities',
      'Submit project or deliverables',
      'Rate team members and provide feedback',
      'Receive XP based on participation and ratings',
      'View updated leaderboard position',
      'Generate portfolio with new achievements'
    ]
  }
]);

// Event lifecycle
const eventLifecycle = ref([
  {
    name: 'Request',
    icon: 'fas fa-plus-circle',
    description: 'Students or organizers request new events'
  },
  {
    name: 'Review',
    icon: 'fas fa-search',
    description: 'Admin reviews and approves event proposals'
  },
  {
    name: 'Setup',
    icon: 'fas fa-cog',
    description: 'Event details, teams, and criteria are configured'
  },
  {
    name: 'Active',
    icon: 'fas fa-play',
    description: 'Event is live, participants can join and collaborate'
  },
  {
    name: 'Submission',
    icon: 'fas fa-upload',
    description: 'Teams submit their projects and deliverables'
  },
  {
    name: 'Rating',
    icon: 'fas fa-star',
    description: 'Peer rating and feedback collection period'
  },
  {
    name: 'Completion',
    icon: 'fas fa-check-circle',
    description: 'XP calculation and distribution, event closure'
  }
]);

// Event formats
const eventFormats = ref([
  {
    name: 'Hackathon',
    icon: 'fas fa-code',
    description: 'Intensive coding competitions with time constraints',
    features: ['Team-based', 'Project submission', 'Peer rating', 'XP rewards']
  },
  {
    name: 'Workshop',
    icon: 'fas fa-chalkboard-teacher',
    description: 'Learning sessions and skill development activities',
    features: ['Individual participation', 'Skill building', 'Resource sharing', 'Attendance XP']
  },
  {
    name: 'Presentation',
    icon: 'fas fa-presentation',
    description: 'Project showcases and knowledge sharing sessions',
    features: ['Individual/Team', 'Public speaking', 'Feedback system', 'Presenter XP']
  },
  {
    name: 'Competition',
    icon: 'fas fa-trophy',
    description: 'Competitive events with winners and rankings',
    features: ['Individual/Team', 'Ranking system', 'Winner bonuses', 'Performance XP']
  }
]);

// XP Categories
const xpCategories = ref([
  {
    key: 'developer',
    name: 'Developer XP',
    icon: 'fas fa-code',
    description: 'Earned through coding and technical implementation',
    baseXP: 50
  },
  {
    key: 'presenter',
    name: 'Presenter XP',
    icon: 'fas fa-microphone',
    description: 'Earned through presentations and public speaking',
    baseXP: 40
  },
  {
    key: 'designer',
    name: 'Designer XP',
    icon: 'fas fa-paint-brush',
    description: 'Earned through UI/UX design contributions',
    baseXP: 45
  },
  {
    key: 'problemSolver',
    name: 'Problem Solver XP',
    icon: 'fas fa-lightbulb',
    description: 'Earned through critical thinking and algorithmic solutions',
    baseXP: 55
  },
  {
    key: 'organizer',
    name: 'Organizer XP',
    icon: 'fas fa-users-cog',
    description: 'Earned through event organization and leadership',
    baseXP: 60
  },
  {
    key: 'participation',
    name: 'Participation XP',
    icon: 'fas fa-hand-paper',
    description: 'Base XP for participating in events',
    baseXP: 25
  }
]);

// Team formation steps
const teamFormationSteps = ref([
  {
    title: 'Event Selection',
    description: 'Choose a team-based event to participate in'
  },
  {
    title: 'Team Creation',
    description: 'Create a new team or join an existing one'
  },
  {
    title: 'Member Invitation',
    description: 'Invite other students to join your team'
  },
  {
    title: 'Role Assignment',
    description: 'Assign roles based on skills and preferences'
  },
  {
    title: 'Lead Selection',
    description: 'Team members vote to select a team leader'
  },
  {
    title: 'Collaboration',
    description: 'Work together on the project or challenge'
  }
]);

// Technology stack
const frontendTech = ref([
  { name: 'Vue 3', icon: 'fab fa-vuejs', color: '#4FC08D', purpose: 'Framework' },
  { name: 'TypeScript', icon: 'fab fa-js-square', color: '#3178C6', purpose: 'Language' },
  { name: 'Pinia', icon: 'fas fa-database', color: '#FFD43B', purpose: 'State Management' },
  { name: 'Bootstrap 5', icon: 'fab fa-bootstrap', color: '#7952B3', purpose: 'UI Framework' },
  { name: 'Vite', icon: 'fas fa-bolt', color: '#646CFF', purpose: 'Build Tool' },
  { name: 'Font Awesome', icon: 'fab fa-font-awesome', color: '#339AF0', purpose: 'Icons' }
]);

const backendTech = ref([
  { name: 'Firebase Auth', icon: 'fas fa-fire', color: '#FFCA28', purpose: 'Authentication' },
  { name: 'Firestore', icon: 'fas fa-database', color: '#FFCA28', purpose: 'Database' },
  { name: 'OneSignal', icon: 'fas fa-bell', color: '#E54B4B', purpose: 'Push Notifications' },
  { name: 'Supabase', icon: 'fas fa-server', color: '#3ECF8E', purpose: 'Edge Functions' },
  { name: 'Luxon', icon: 'fas fa-clock', color: '#FF6B6B', purpose: 'Date/Time' },
  { name: 'jsPDF', icon: 'fas fa-file-pdf', color: '#E74C3C', purpose: 'PDF Generation' }
]);

// Platform features
const platformFeatures = ref([
  {
    name: 'Real-time Updates',
    icon: 'fas fa-sync-alt',
    description: 'Live updates for events, teams, and notifications'
  },
  {
    name: 'Offline Support',
    icon: 'fas fa-wifi',
    description: 'Queue actions when offline for later sync'
  },
  {
    name: 'Responsive Design',
    icon: 'fas fa-mobile-alt',
    description: 'Works seamlessly on all devices'
  },
  {
    name: 'Security First',
    icon: 'fas fa-lock',
    description: 'Secure authentication and data protection'
  },
  {
    name: 'Performance',
    icon: 'fas fa-tachometer-alt',
    description: 'Fast loading with optimized code splitting'
  },
  {
    name: 'Accessibility',
    icon: 'fas fa-universal-access',
    description: 'Built with accessibility standards in mind'
  }
]);

// Data types collected
const dataTypes = ref([
  {
    category: 'Profile Information',
    icon: 'fas fa-user',
    items: ['Name', 'Email', 'Student ID', 'Batch Year', 'Skills', 'Bio', 'Profile Photo']
  },
  {
    category: 'Activity Data',
    icon: 'fas fa-chart-line',
    items: ['Event Participation', 'Project Submissions', 'Team Memberships', 'XP Earned', 'Ratings Given/Received']
  },
  {
    category: 'Technical Data',
    icon: 'fas fa-cog',
    items: ['Login Sessions', 'Device Information', 'Usage Analytics', 'Error Logs', 'Performance Metrics']
  },
  {
    category: 'Communication Data',
    icon: 'fas fa-comments',
    items: ['Feedback Submissions', 'Support Requests', 'Notification Preferences', 'Push Notification Tokens']
  }
]);

// Privacy measures
const privacyMeasures = ref([
  {
    title: 'Data Encryption',
    icon: 'fas fa-lock',
    description: 'All data is encrypted in transit and at rest using industry-standard protocols'
  },
  {
    title: 'Access Control',
    icon: 'fas fa-key',
    description: 'Role-based access control ensures users only see data they are authorized to view'
  },
  {
    title: 'Data Minimization',
    icon: 'fas fa-compress-alt',
    description: 'We only collect data that is necessary for platform functionality'
  },
  {
    title: 'Regular Audits',
    icon: 'fas fa-search',
    description: 'Regular security audits and vulnerability assessments are conducted'
  },
  {
    title: 'User Control',
    icon: 'fas fa-user-cog',
    description: 'Users can view, edit, and delete their personal data at any time'
  },
  {
    title: 'Transparent Logging',
    icon: 'fas fa-list-alt',
    description: 'All data access and modifications are logged for transparency and security'
  }
]);

// Registration steps
const registrationSteps = ref([
  {
    title: 'Admin Link Generation',
    description: 'Administrators create batch-specific or token-based signup links'
  },
  {
    title: 'Student Registration',
    description: 'Students use the link to fill out registration form with their details'
  },
  {
    title: 'Duplicate Check',
    description: 'System automatically checks for existing registrations with same email/ID'
  },
  {
    title: 'Pending Review',
    description: 'Registration is stored with pending status for admin review'
  },
  {
    title: 'Admin Approval',
    description: 'Administrators review and approve legitimate student registrations'
  },
  {
    title: 'Account Creation',
    description: 'Firebase Auth account is created and student receives activation email'
  }
]);

// Platform metadata
const lastUpdated = ref(new Date().toLocaleDateString());
const platformVersion = ref('2.1.0');
</script>

<style scoped>
.transparency-section {
  background-color: var(--bs-body-bg);
  min-height: 100vh;
}

.timeline {
  position: relative;
  padding-left: 2rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 1rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--bs-success);
}

.timeline-item {
  position: relative;
  margin-bottom: 2rem;
}

.timeline-marker {
  position: absolute;
  left: -2.5rem;
  top: 0;
  width: 2rem;
  height: 2rem;
  background: white;
  border: 2px solid var(--bs-success);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-content {
  background: var(--bs-light);
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 3px solid var(--bs-success);
}

.card-header {
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.accordion-button:not(.collapsed) {
  background-color: var(--bs-primary-bg-subtle);
  color: var(--bs-primary);
}

.list-group-item {
  border: none;
  padding: 1rem 0;
}

.list-group-item:not(:last-child) {
  border-bottom: 1px solid var(--bs-border-color);
}

/* Smooth scrolling for anchor links */
html {
  scroll-behavior: smooth;
}

/* Highlight target section */
section:target {
  animation: highlight 2s ease-in-out;
}

@keyframes highlight {
  0% { background-color: rgba(var(--bs-primary-rgb), 0.1); }
  100% { background-color: transparent; }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .timeline {
    padding-left: 1.5rem;
  }
  
  .timeline-marker {
    left: -2rem;
    width: 1.5rem;
    height: 1.5rem;
  }
  
  .timeline::before {
    left: 0.75rem;
  }
}
</style>
