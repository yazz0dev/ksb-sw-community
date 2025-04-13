<template>
    <section class="section">
        <div class="container is-max-desktop py-5">
            <h1 class="title is-1 has-text-primary mb-6 pb-3" style="border-bottom: 2px solid var(--bulma-primary);">
                Community Transparency & Guidelines
            </h1>

            <div class="content">
                <!-- Community Guidelines Section -->
                <div class="card mb-5 custom-card">
                    <header class="card-header has-background-primary-light" style="border-bottom: 1px solid var(--bulma-primary);">
                        <p class="card-header-title is-flex is-align-items-center has-text-primary-dark">
                            <span class="icon mr-3"><i class="fas fa-user-shield"></i></span>
                            <span class="is-size-5">Community Guidelines</span>
                        </p>
                    </header>
                    <div class="card-content">
                        <div class="content" v-html="renderSection(introductionContent)"></div>
                    </div>
                </div>

                <!-- Roles Section -->
                <div class="card mb-5 custom-card">
                    <header class="card-header has-background-primary-light" style="border-bottom: 1px solid var(--bulma-primary);">
                        <p class="card-header-title is-flex is-align-items-center has-text-primary-dark">
                            <span class="icon mr-3"><i class="fas fa-users"></i></span>
                            <span class="is-size-5">Community Roles</span>
                        </p>
                    </header>
                    <div class="card-content">
                        <div class="content" v-html="renderSection(rolesContent)"></div>
                    </div>
                </div>

                <!-- Event System Section -->
                <div class="card mb-5 custom-card">
                    <header class="card-header has-background-primary-light" style="border-bottom: 1px solid var(--bulma-primary);">
                        <p class="card-header-title is-flex is-align-items-center has-text-primary-dark">
                            <span class="icon mr-3"><i class="fas fa-tasks"></i></span>
                            <span class="is-size-5">Event System</span>
                        </p>
                    </header>
                    <div class="card-content">
                        <div class="content" v-html="renderSection(eventLifecycleContent)"></div>
                    </div>
                </div>

                <!-- Rating & XP System Section -->
                <div class="card mb-5 custom-card">
                    <header class="card-header has-background-primary-light" style="border-bottom: 1px solid var(--bulma-primary);">
                        <p class="card-header-title is-flex is-align-items-center has-text-primary-dark">
                            <span class="icon mr-3"><i class="fas fa-star"></i></span>
                            <span class="is-size-5">Rating & XP System</span>
                        </p>
                    </header>
                    <div class="card-content">
                        <div class="content" v-html="renderSection(ratingContent)"></div>
                        <hr class="my-5">
                        <div class="content" v-html="renderSection(xpContent)"></div>
                    </div>
                </div>

                <!-- General Guidelines Section -->
                <div class="card mb-5 custom-card">
                    <header class="card-header has-background-primary-light" style="border-bottom: 1px solid var(--bulma-primary);">
                        <p class="card-header-title is-flex is-align-items-center has-text-primary-dark">
                            <span class="icon mr-3"><i class="fas fa-book"></i></span>
                            <span class="is-size-5">General Guidelines</span>
                        </p>
                    </header>
                    <div class="card-content">
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
/* Add some basic styling to ensure cards have a slight shadow and content is spaced */
.custom-card {
  box-shadow: 0 2px 4px rgba(10, 10, 10, 0.1);
}

/* Style the content rendered from markdown */
.card-content .content h2 {
    font-size: 1.5rem; /* is-size-4 */
    margin-bottom: 1rem; /* mb-4 */
    margin-top: 1.5rem; /* mt-5 */
}

.card-content .content h3 {
    font-size: 1.25rem; /* is-size-5 */
    margin-bottom: 0.75rem; /* mb-3 */
    margin-top: 1.25rem; /* mt-4 */
}

.card-content .content ul {
    list-style: disc;
    margin-left: 1.5em;
    margin-top: 0.5em;
}

.card-content .content p,
.card-content .content li {
    line-height: 1.6;
}

.has-text-primary-dark {
    color: hsl(217, 71%, 45%); /* Adjust if needed */
}

/* Ensure primary-light background is defined if not in global styles */
.has-background-primary-light {
    background-color: hsl(217, 71%, 96%); /* Bulma's primary-light */
}

.py-5 { padding-top: 1.25rem; padding-bottom: 1.25rem; }
.pb-3 { padding-bottom: 0.75rem; }
.mb-5 { margin-bottom: 1.25rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mr-3 { margin-right: 0.75rem; }
.my-5 { margin-top: 1.25rem; margin-bottom: 1.25rem; }
</style>
