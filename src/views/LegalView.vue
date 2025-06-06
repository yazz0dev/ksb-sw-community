<template>
  <div class="legal-view container py-3 py-md-4"> <!-- Reduced from py-4 py-md-5 -->
    <div class="bg-white p-3 p-md-4 rounded">
      <h1 class="h2 text-gradient-primary mb-4 text-center border-bottom pb-2">Legal Information</h1>

      <!-- Terms of Service -->
      <section id="terms-of-service" class="mb-5">
        <h2 class="h4 text-gradient-secondary mb-3 d-flex align-items-center">
          <i class="fas fa-gavel me-2"></i>Terms of Service
        </h2>
        <p class="small text-secondary mb-4">Last updated: {{ new Date().toLocaleDateString() }}</p>

        <div class="legal-section">
          <p class="fw-bold">1. Acceptance of Terms</p>
          <p>
            By accessing or using the KSB Tech Community platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Platform.
          </p>

          <p class="fw-bold">2. Use of the Platform</p>
          <p>
            The Platform is intended for use by students and faculty of the MCA department at KMCT School Of Business for educational and collaborative purposes related to technology, event management, project development, and resource sharing.
          </p>
          <p>
            You agree not to misuse the Platform. Misuse includes, but is not limited to:
          </p>
          <ul>
            <li>Uploading or sharing content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.</li>
            <li>Impersonating any person or entity.</li>
            <li>Attempting to gain unauthorized access to any part of the Platform.</li>
            <li>Disrupting or interfering with the security or use of the Platform.</li>
          </ul>

          <p class="fw-bold">3. User Content</p>
          <p>
            You are responsible for any content you post or share on the Platform. By posting content, you grant the KSB Tech Community a non-exclusive, royalty-free license to use, reproduce, and display such content in connection with the Platform.
          </p>

          <p class="fw-bold">4. Disclaimer of Warranties</p>
          <p>
            The Platform is provided "as is" and "as available" without any warranties of any kind, express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or secure.
          </p>

          <p class="fw-bold">5. Limitation of Liability</p>
          <p>
            To the fullest extent permitted by law, KSB Tech Community and KMCT School Of Business shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Platform.
          </p>

          <p class="fw-bold">6. Changes to Terms</p>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of any significant changes. Your continued use of the Platform after such changes constitutes your acceptance of the new Terms.
          </p>
        </div>
      </section>

      <!-- Privacy Policy -->
      <section id="privacy-policy">
        <h2 class="h4 text-gradient-secondary mb-3 d-flex align-items-center">
          <i class="fas fa-shield-alt me-2"></i>Privacy Policy
        </h2>
        <p class="small text-secondary mb-4">Last updated: {{ new Date().toLocaleDateString() }}</p>

        <div class="legal-section">
          <p class="fw-bold">1. Information We Collect</p>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>Personal Information:</strong> Name, student ID, email address, and other information you provide during registration or profile setup.</li>
            <li><strong>Usage Data:</strong> Information about how you use the Platform, such as event participation, project submissions, and interactions.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, operating system, and other technical details collected automatically.</li>
          </ul>

          <p class="fw-bold">2. How We Use Your Information</p>
          <p>We use your information to:</p>
          <ul>
            <li>Provide, operate, and maintain the Platform.</li>
            <li>Manage your account and facilitate your participation in events and projects.</li>
            <li>Communicate with you about Platform updates, events, and other relevant information.</li>
            <li>Improve the Platform and develop new features.</li>
            <li>Ensure the security and integrity of the Platform.</li>
          </ul>

          <p class="fw-bold">3. Information Sharing</p>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
          <ul>
            <li>With other users of the Platform as necessary for collaboration (e.g., team members on a project).</li>
            <li>With faculty and administrators of the MCA department for oversight and support.</li>
            <li>If required by law or to protect the rights, property, or safety of KSB Tech Community, its users, or others.</li>
          </ul>

          <p class="fw-bold">4. Data Security</p>
          <p>
            We implement reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure.
          </p>

          <p class="fw-bold">5. Your Rights</p>
          <p>
            You may have certain rights regarding your personal information, such as the right to access, correct, or delete your data. Please contact us to exercise these rights.
          </p>

          <p class="fw-bold">6. Changes to This Policy</p>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on the Platform.
          </p>

          <p class="fw-bold">7. Contact Us</p>
          <p>
            If you have any questions about this Privacy Policy, please contact the MCA department at KMCT School Of Business.
          </p>
        </div>
      </section>

      <!-- Contact & Navigation -->
      <div class="mt-5 pt-3 border-top d-flex justify-content-between align-items-center flex-column flex-sm-row gap-2">
        <router-link to="/" class="btn btn-outline-secondary btn-sm btn-icon">
          <i class="fas fa-arrow-left me-1"></i>Back to Home
        </router-link>
        <a href="mailto:info@ksbcommunity.edu" class="btn btn-primary btn-sm btn-icon">
          <i class="fas fa-envelope me-1"></i>Contact for Questions
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-view {
  max-width: 800px;
  margin: auto;
  min-height: calc(100vh - var(--navbar-height-mobile));
  padding-top: 0.5rem; /* Added to reduce top space */
}

.legal-section {
  background-color: var(--bs-light);
  padding: 1rem 1.5rem;
  border-radius: var(--bs-border-radius);
  border-left: 4px solid var(--bs-border-color);
}

.legal-section p.fw-bold {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

p, li {
  line-height: 1.7;
  color: var(--bs-body-color);
}

ul {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

li {
  margin-bottom: 0.5rem;
}

@media (min-width: 992px) {
  .legal-view {
    min-height: calc(100vh - var(--navbar-height-desktop));
    padding-top: 1rem; /* Added for desktop */
  }
}
</style>
