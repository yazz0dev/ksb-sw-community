<template>
    <section class="py-5 transparency-section">
        <div class="container-lg py-5">
            <h1 class="h1 text-primary mb-5 pb-3" style="border-bottom: 2px solid var(--bs-primary);">
                Community Transparency & Guidelines
            </h1>

            <div class="transparency-content">
                <!-- Community Guidelines Section -->
                <div class="card mb-4 shadow-sm">
                    <div class="card-header bg-primary-subtle">
                        <h5 class="mb-0 d-flex align-items-center text-primary-emphasis">
                            <i class="fas fa-user-shield me-3"></i>
                            Community Guidelines
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="content" v-html="renderSection(introductionContent)"></div>
                    </div>
                </div>

                <!-- Roles Section -->
                <div class="card mb-4 shadow-sm">
                    <div class="card-header bg-primary-subtle">
                         <h5 class="mb-0 d-flex align-items-center text-primary-emphasis">
                            <i class="fas fa-users me-3"></i>
                            Community Roles
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="content" v-html="renderSection(rolesContent)"></div>
                    </div>
                </div>

                <!-- Event System Section -->
                <div class="card mb-4 shadow-sm">
                    <div class="card-header bg-primary-subtle">
                        <h5 class="mb-0 d-flex align-items-center text-primary-emphasis">
                           <i class="fas fa-tasks me-3"></i>
                            Event System
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="content" v-html="renderSection(eventLifecycleContent)"></div>
                    </div>
                </div>

                <!-- Rating & XP System Section -->
                <div class="card mb-4 shadow-sm">
                     <div class="card-header bg-primary-subtle">
                         <h5 class="mb-0 d-flex align-items-center text-primary-emphasis">
                            <i class="fas fa-star me-3"></i>
                            Rating & XP System
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="content" v-html="renderSection(ratingContent)"></div>
                        <hr class="my-4">
                        <div class="content" v-html="renderSection(xpContent)"></div>
                    </div>
                </div>

                <!-- General Guidelines Section -->
                <div class="card mb-4 shadow-sm">
                    <div class="card-header bg-primary-subtle">
                        <h5 class="mb-0 d-flex align-items-center text-primary-emphasis">
                            <i class="fas fa-book me-3"></i>
                            General Guidelines
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="content" v-html="renderSection(generalContent)"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

const introductionContent = `
## Welcome to KSB Tech Community

Our community is dedicated to fostering collaboration, learning, and growth among MCA students through hands-on software development projects and events. This transparency page outlines our community structure, guidelines, and processes.

### Our Mission
- 💡 Create opportunities for practical software development experience
- 🤝 Encourage peer learning and mentorship
- 📁 Build a portfolio of real-world projects
- 🚀 Develop professional and technical skills`;

const rolesContent = `
## Community Roles

### 🎓 Students
- Participate in events and projects
- Request and organize events
- Submit project work
- Provide peer feedback and ratings
- Earn XP and build portfolios

### 🧑‍🏫 Team Leaders
- Guide team members during events
- Facilitate team communication
- Ensure project deliverables
- Help resolve team challenges

### 🗓️ Organizers
- Plan and manage events
- Set up project requirements
- Monitor team progress
- Provide technical support
- Evaluate submissions

### 🛡️ Administrators
- Oversee community operations
- Review and approve event requests
- Manage user roles and permissions
- Ensure platform functionality
- Maintain community guidelines`;

const eventLifecycleContent = `
## Event Lifecycle

### 1️⃣ Event Creation
- 🙋 Students can request events
- ✅ Admins review and approve requests
- 📝 Event details are finalized

### 2️⃣ Registration
- 👤 Solo or 👥 team participation options
- 🤝 Team formation process
- 🏷️ Role assignments

### 3️⃣ Active Phase
- 💻 Project development period
- 📊 Regular progress updates
- 💬 Collaboration opportunities
- 🆘 Technical support available

### 4️⃣ Completion
- 🎉 Project submissions
- ⭐ Peer evaluations
- ✨ XP distribution
- 🏆 Results announcement`;

const ratingContent = `
## Rating System

### ⭐ Rating Criteria
- 💻 Technical implementation
- 🎤 Project presentation
- ✨ Code quality
- 📄 Documentation
- 🤝 Team collaboration

### 📝 Rating Process
- Peer evaluations after completion
- Rating scale of 1-5 stars
- Multiple rating categories
- Anonymous feedback system

### 👍 Rating Guidelines
- Be objective and fair
- Provide constructive feedback
- Rate based on defined criteria
- Consider team/individual effort`;

const xpContent = `
## Experience Points (XP) System

### ✨ Earning XP
- Event participation: 1-2 XP
- Project completion: 5-20 XP
- High ratings: Bonus XP
- Team leadership: Extra XP
- Event organization: 10-50 XP

### 🏷️ XP Categories
- Fullstack Development
- Frontend Design
- Backend Implementation
- Project Management
- Team Collaboration

### 🚀 Level System
- Levels based on total XP
- Role-specific progression
- Special badges for achievements
- XP decay prevention system`;

const generalContent = `
## General Guidelines

### 📜 Code of Conduct
- Professional behavior expected
- Respect for all members
- Academic integrity
- Collaborative spirit

### 💬 Communication
- Clear and timely communication
- Appropriate channel usage
- Professional language
- Constructive feedback

### 🙋 Participation
- Regular engagement encouraged
- Meeting attendance
- Deadline adherence
- Active contribution

### 🆘 Support
- Technical assistance available
- Mentorship opportunities
- Resource access
- Issue resolution process`;

// Utility function to render markdown content safely
const renderSection = (content) => {
    const rawHtml = marked(content);
    // Sanitize the HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml);
};
</script>

<style scoped>
.transparency-section {
  background-color: var(--bs-body-bg); /* Updated variable */
}

/* Style the content rendered from markdown */
.card-body .content h2 {
    font-size: 1.75rem; /* Approx h3 */
    margin-bottom: 1rem; 
    margin-top: 1.5rem; 
    font-weight: 500;
}

.card-body .content h3 {
    font-size: 1.5rem; /* Approx h4 */
    margin-bottom: 0.75rem;
    margin-top: 1.25rem; 
    font-weight: 500;
}

.card-body .content ul {
    list-style: disc;
    padding-left: 2rem; /* Adjusted padding */
    margin-top: 0.5rem;
}

.card-body .content p,
.card-body .content li {
    line-height: 1.6;
    margin-bottom: 0.5rem; /* Added spacing */
}
</style>
