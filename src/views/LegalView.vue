<template>
  <div class="legal-view container py-4 py-md-5">
    <div class="card shadow-sm">
      <div class="card-body p-3 p-md-5">
        <h1 class="h3 h2-md text-primary mb-3 mb-md-4 text-center">Legal Information</h1>

        <section id="terms-of-service" class="mb-4 mb-md-5">
          <h2 class="h5 h4-md text-dark mb-3 border-bottom pb-2">Terms of Service</h2>
          <p class="text-secondary">Last updated: {{ new Date().toLocaleDateString() }}</p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">1. Acceptance of Terms</h5>
          <p class="text-secondary">
            By accessing or using the KSB Tech Community platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Platform.
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">2. Use of the Platform</h5>
          <p class="text-secondary">
            The Platform is intended for use by students and faculty of the MCA department at KMCT School Of Business for educational and collaborative purposes related to technology, event management, project development, and resource sharing.
          </p>
          <p class="text-secondary">
            You agree not to misuse the Platform. Misuse includes, but is not limited to:
            <ul>
              <li>Uploading or sharing content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.</li>
              <li>Impersonating any person or entity.</li>
              <li>Attempting to gain unauthorized access to any part of the Platform.</li>
              <li>Disrupting or interfering with the security or use of the Platform.</li>
            </ul>
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">3. User Content</h5>
          <p class="text-secondary">
            You are responsible for any content you post or share on the Platform. By posting content, you grant the KSB Tech Community a non-exclusive, royalty-free license to use, reproduce, and display such content in connection with the Platform.
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">4. Disclaimer of Warranties</h5>
          <p class="text-secondary">
            The Platform is provided "as is" and "as available" without any warranties of any kind, express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or secure.
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">5. Limitation of Liability</h5>
          <p class="text-secondary">
            To the fullest extent permitted by law, KSB Tech Community and KMCT School Of Business shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Platform.
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">6. Changes to Terms</h5>
          <p class="text-secondary">
            We reserve the right to modify these Terms at any time. We will notify users of any significant changes. Your continued use of the Platform after such changes constitutes your acceptance of the new Terms.
          </p>
          <!-- Add more terms as needed -->
        </section>

        <section id="privacy-policy">
          <h2 class="h4 text-dark mb-3 border-bottom pb-2">Privacy Policy</h2>
          <p class="text-secondary">Last updated: {{ new Date().toLocaleDateString() }}</p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">1. Information We Collect</h5>
          <p class="text-secondary">
            We may collect the following types of information:
            <ul>
              <li><strong>Personal Information:</strong> Name, student ID, email address, and other information you provide during registration or profile setup.</li>
              <li><strong>Usage Data:</strong> Information about how you use the Platform, such as event participation, project submissions, and interactions.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, operating system, and other technical details collected automatically.</li>
            </ul>
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">2. How We Use Your Information</h5>
          <p class="text-secondary">
            We use your information to:
            <ul>
              <li>Provide, operate, and maintain the Platform.</li>
              <li>Manage your account and facilitate your participation in events and projects.</li>
              <li>Communicate with you about Platform updates, events, and other relevant information.</li>
              <li>Improve the Platform and develop new features.</li>
              <li>Ensure the security and integrity of the Platform.</li>
            </ul>
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">3. Information Sharing</h5>
          <p class="text-secondary">
            We do not sell your personal information. We may share your information in the following circumstances:
            <ul>
              <li>With other users of the Platform as necessary for collaboration (e.g., team members on a project).</li>
              <li>With faculty and administrators of the MCA department for oversight and support.</li>
              <li>If required by law or to protect the rights, property, or safety of KSB Tech Community, its users, or others.</li>
            </ul>
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">4. Data Security</h5>
          <p class="text-secondary">
            We implement reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure.
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">5. Your Rights</h5>
          <p class="text-secondary">
            You may have certain rights regarding your personal information, such as the right to access, correct, or delete your data. Please contact us to exercise these rights.
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">6. Changes to This Policy</h5>
          <p class="text-secondary">
            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on the Platform.
          </p>

          <h5 class="h6 fw-semibold mt-3 mt-md-4 mb-2">7. Contact Us</h5>
          <p class="text-secondary">
            If you have any questions about this Privacy Policy, please contact the MCA department at KMCT School Of Business.
          </p>
          <!-- Add more privacy policy details as needed -->
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No specific script needed for this static content view,
// but setup lang="ts" is good practice for consistency.
</script>

<style scoped>
.legal-view {
  max-width: 900px; /* Limit width for better readability */
  margin: auto;
}

.legal-view h1, .legal-view h2, .legal-view h3, .legal-view h4, .legal-view h5, .legal-view h6 {
  font-weight: 500; /* Consistent font weight for headings */
}

.legal-view p, .legal-view li {
  line-height: 1.7;
  font-size: 0.95rem;
}

.legal-view ul {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
}

.legal-view li {
  margin-bottom: 0.25rem;
}

.card {
  border: none; /* Remove default card border if shadow is enough */
}
</style>
