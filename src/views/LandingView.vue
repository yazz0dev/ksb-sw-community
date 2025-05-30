<template>
  <div class="landing-section">
    <!-- Welcome Section -->
    <section class="welcome-section d-flex align-items-center justify-content-center">
      <div class="container-xl text-center px-3 px-md-4">
        <transition name="fade-slide-down">
          <div>
            <h1 class="display-4 display-md-3 fw-bold text-gradient mb-3 mb-md-4">
              Welcome to the <span class="brand-highlight">KSB Tech Community!</span>
            </h1>
            <p class="lead text-secondary mb-3 mb-md-4 mx-auto" style="max-width: 40rem;">
              Manage events, collaborate on projects, and share resources within the KSB MCA community.
            </p>
            <router-link
              to="/login"
              class="btn btn-lg btn-primary px-4 px-md-5 py-2 shadow animate-pop d-inline-flex align-items-center justify-content-center gap-2"
            >
              <i class="fas fa-sign-in-alt"></i>
              <span>Log In to Get Started</span>
            </router-link>
          </div>
        </transition>
      </div>
    </section>

    <!-- Platform Features Section -->
    <section class="features-section py-4 py-md-5">
      <div class="container-lg px-3 px-md-4">
        <transition-group name="fade-slide-up" tag="div" class="row g-3 g-md-4 justify-content-center">
          <div class="col-md-4" v-for="(feature, index) in features" :key="feature.icon">
            <div class="card h-100 shadow-sm feature-card animate-pop" :style="{ animationDelay: `${index * 80}ms` }">
              <div class="card-body text-center p-3 p-md-4">
                <span :class="['feature-icon', getIconColorClass(feature.color)]">
                  <i :class="['fas', feature.icon]" aria-hidden="true"></i>
                </span>
                <h5 class="card-title mt-3 mb-2 fw-semibold">{{ feature.title }}</h5>
                <p class="card-text text-secondary">{{ feature.text }}</p> <!-- Removed small class -->
              </div>
            </div>
          </div>
        </transition-group>
      </div>
    </section>

    <!-- About & Info Section -->
    <section class="about-section py-4 py-md-5">
      <div class="container-lg px-3 px-md-4">
        <div class="row g-4 g-md-5 align-items-center">
          <div class="col-lg-6">
            <transition name="fade-slide-left">
              <div>
                <h2 class="fw-bold text-primary mb-3">About <span class="brand-highlight">KSB Tech Community</span></h2>
                <p class="lead text-secondary mb-3 mb-md-4">
                  The KSB Tech Community is a collaborative platform for MCA students at KMCT School Of Business to learn, build, and grow together through real-world software projects and events.
                </p>
                <ul class="list-unstyled mb-3 mb-md-4">
                  <li class="mb-2"><i class="fas fa-lightbulb text-warning me-2" aria-hidden="true"></i> Foster practical software development experience</li>
                  <li class="mb-2"><i class="fas fa-users text-info me-2" aria-hidden="true"></i> Encourage peer learning and mentorship</li>
                  <li class="mb-2"><i class="fas fa-folder-open text-success me-2" aria-hidden="true"></i> Build a portfolio of real-world projects</li>
                  <li class="mb-2"><i class="fas fa-rocket text-primary me-2" aria-hidden="true"></i> Develop professional and technical skills</li>
                </ul>
              </div>
            </transition>
          </div>
          <div class="col-lg-6">
            <transition name="fade-slide-right">
              <div>
                <div class="card shadow-sm about-card animate-pop">
                  <div class="card-body">
                    <h5 class="h5 text-primary mb-3"><i class="fas fa-gift me-2" aria-hidden="true"></i> What We Offer</h5>
                    <ul class="list-unstyled mb-3">
                      <li class="mb-2"><i class="fas fa-calendar-alt text-primary me-2" aria-hidden="true"></i> Regular events and hackathons</li>
                      <li class="mb-2"><i class="fas fa-users text-secondary me-2" aria-hidden="true"></i> Team-based and individual projects</li>
                      <li class="mb-2"><i class="fas fa-star text-warning me-2" aria-hidden="true"></i> XP and rating system for recognition</li>
                      <li class="mb-2"><i class="fas fa-book text-success me-2" aria-hidden="true"></i> Curated resources and learning materials</li>
                      <li class="mb-2"><i class="fas fa-trophy text-danger me-2" aria-hidden="true"></i> Leaderboards and portfolio generation</li>
                    </ul>
                    <h6 class="fw-semibold text-primary mb-2 mt-4"><i class="fas fa-hands-helping me-2" aria-hidden="true"></i> How to Get Involved</h6>
                    <ol class="mb-0 ps-3">
                      <li>Log in with your student account</li>
                      <li>Participate in events or request new ones</li>
                      <li>Collaborate, submit projects, and earn XP</li>
                      <li>Rate peers and provide feedback</li>
                      <li>Track your progress and build your portfolio</li>
                    </ol>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- Sponsorship & Contact Section -->
    <section class="sponsor-section py-5 bg-gradient-light">
      <div class="container-lg">
        <div class="row g-4 align-items-center">
          <div class="col-md-7">
            <transition name="fade-slide-left">
              <div>
                <h3 class="fw-bold text-primary mb-3"><i class="fas fa-hand-holding-heart me-2" aria-hidden="true"></i> Sponsor the Tech Community</h3>
                <p class="text-secondary mb-2">
                  We welcome sponsorships and partnerships from organizations, companies, and individuals who wish to support student innovation and skill development. Sponsoring the KSB Tech Community helps us organize more impactful events, provide better resources, and empower the next generation of tech professionals.
                </p>
                <p class="text-secondary mb-2">
                  If you are interested in sponsoring or collaborating with us, please contact the MCA department at KMCT School Of Business or reach out via our social channels below.
                </p>
              </div>
            </transition>
          </div>
          <div class="col-md-5">
            <transition name="fade-slide-right">
              <div class="contact-card card shadow-sm animate-pop">
                <div class="card-body text-center">
                  <h5 class="mb-3 text-primary"><i class="fas fa-envelope me-2" aria-hidden="true"></i>Contact & Socials</h5>
                  <p class="text-secondary small mb-3">For questions or suggestions, reach out to the MCA department or connect with us on:</p>
                  <div class="mb-3">
                    <a href="https://instagram.com/" target="_blank" rel="noopener" class="text-secondary me-3" aria-label="Instagram">
                      <i class="fab fa-instagram fa-lg"></i>
                    </a>
                    <a href="mailto:labkmct@gmail.com" class="text-secondary me-3" aria-label="Email">
                      <i class="fas fa-envelope fa-lg"></i>
                    </a>
                    <a href="https://github.com/" target="_blank" rel="noopener" class="text-secondary" aria-label="GitHub">
                      <i class="fab fa-github fa-lg"></i>
                    </a>
                  </div>
                  <router-link to="/transparency" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-eye me-2"></i> Community Transparency
                  </router-link>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer mt-5 py-4 border-top">
      <div class="container">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
           <p class="text-muted small mb-0">&copy; {{ new Date().getFullYear() }} KSB Tech Community. All rights reserved.</p>
           <div class="d-flex gap-3">
             <router-link to="/legal" class="text-muted small text-decoration-none">Terms & Privacy</router-link>
           </div>
        </div>
        <p class="mt-3 small text-muted text-center">
          This site is managed by the MCA department of KMCT School Of Business.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Feature {
    icon: string;
    color: 'primary' | 'info' | 'secondary' | 'warning' | 'success' | 'danger';
    title: string;
    text: string;
}

const features = ref<Feature[]>([
  { icon: 'fa-calendar-alt', color: 'primary', title: 'Events', text: 'View upcoming and past events.' },
  { icon: 'fa-plus-circle', color: 'info', title: 'Request Events', text: 'Request new events and activities.' },
  { icon: 'fa-users', color: 'secondary', title: 'Teamwork', text: 'Participate in team-based events.' },
  { icon: 'fa-star', color: 'warning', title: 'Feedback', text: 'Rate projects and provide feedback.' },
  { icon: 'fa-book', color: 'success', title: 'Resources', text: 'Access a library of shared resources.' },
  { icon: 'fa-trophy', color: 'primary', title: 'Leaderboards', text: 'View leaderboards based on XP.' },
  { icon: 'fa-file-pdf', color: 'danger', title: 'Portfolio', text: 'Generate a portfolio of your achievements.' }
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
/* General Layout */
.landing-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e9f0fb 100%);
  min-height: 100vh;
  overflow-x: hidden; 
}

/* Welcome Section */
.welcome-section {
  min-height: 60vh;
  background: linear-gradient(120deg, #e0e7ff 0%, #f8fafc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.text-gradient {
  background: linear-gradient(90deg, #2563eb 30%, #14b8a6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.brand-highlight {
  color: #2563eb;
  font-weight: 700;
}
.animate-pop {
  animation: pop-in 0.7s cubic-bezier(.23,1.01,.32,1) both;
}
@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.95);}
  100% { opacity: 1; transform: scale(1);}
}

/* Features Section */
.features-section {
  background: #fff;
  border-radius: 1.5rem;
  margin-top: -3rem;
  box-shadow: 0 4px 32px 0 rgba(37,99,235,0.07);
  padding-top: 3rem;
  padding-bottom: 3rem;
}
.feature-card {
  border: none;
  border-radius: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
  background: #f9fafb;
}
.feature-card:hover {
  transform: translateY(-6px) scale(1.03);
  box-shadow: 0 8px 32px 0 rgba(37,99,235,0.12);
}
.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: #e0e7ff;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px 0 rgba(37,99,235,0.08);
}

/* About Section */
.about-section {
  background: linear-gradient(120deg, #f8fafc 60%, #e0e7ff 100%);
  border-radius: 1.5rem;
  margin-top: 2rem;
}
.about-card {
  background: #fff;
  border-radius: 1rem;
  /* box-shadow removed, shadow-sm class will handle it */
}

/* Sponsor Section */
.sponsor-section {
  background: linear-gradient(120deg, #e0e7ff 0%, #f8fafc 100%);
  border-radius: 1.5rem;
  margin-top: 2rem;
}
.bg-gradient-light {
  background: linear-gradient(120deg, #f8fafc 60%, #e0e7ff 100%);
}
.contact-card {
  border-radius: 1rem;
  background: #fff;
  /* box-shadow removed, shadow-sm class will handle it */
}

/* Footer */
.landing-footer {
  background: #fff;
  border-radius: 1.5rem 1.5rem 0 0;
  box-shadow: 0 -2px 16px 0 rgba(37,99,235,0.05);
  margin-top: 1.5rem;
  padding-bottom: 0.5rem;
}

/* Animations */
.fade-slide-down-enter-active,
.fade-slide-up-enter-active,
.fade-slide-left-enter-active,
.fade-slide-right-enter-active {
  transition: all 0.7s cubic-bezier(.23,1.01,.32,1);
}
.fade-slide-down-enter-from {
  opacity: 0;
  transform: translateY(-40px);
}
.fade-slide-up-enter-from {
  opacity: 0;
  transform: translateY(40px);
}
.fade-slide-left-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}
.fade-slide-right-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.fade-slide-down-enter-to,
.fade-slide-up-enter-to,
.fade-slide-left-enter-to,
.fade-slide-right-enter-to {
  opacity: 1;
  transform: none;
}

/* Utility */
.text-decoration-underline-hover:hover {
  text-decoration: underline;
}
</style>

