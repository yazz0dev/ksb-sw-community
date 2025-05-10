<template>
    <section class="py-5 transparency-section">
        <div class="container-lg py-5">
            <h1 class="h1 text-primary mb-5 pb-3 border-bottom border-2">
                Community Processes & Guidelines
            </h1>
            <div class="transparency-content">
                <!-- Event System Section -->
                <div class="card mb-4 shadow-sm">
                    <div class="card-header bg-primary-subtle">
                        <h5 class="mb-0 d-flex align-items-center text-primary-emphasis">
                            <i class="fas fa-tasks me-3"></i>
                            How the KSB Tech Community Works
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="content" v-html="eventLifecycleHtml"></div>
                    </div>
                </div>
                <!-- Voting & XP System Section -->
                <div class="card mb-4 shadow-sm">
                    <div class="card-header bg-primary-subtle">
                        <h5 class="mb-0 d-flex align-items-center text-primary-emphasis">
                            <i class="fas fa-star me-3"></i>
                            Voting & XP System
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="content" v-html="votingHtml"></div>
                        <hr class="my-4">
                        <div class="content" v-html="xpHtml"></div>
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
                        <div class="content" v-html="generalHtml"></div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'; // Import ref, watchEffect (remove computed)
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

// --- Content Strings ---
const eventLifecycleContent = `
## Community Process Overview

The KSB Tech Community is a student-driven platform for collaborative learning, project development, and professional growth. Here’s how our process works:

### 1️⃣ Event Request & Approval
- 🙋 **Students** can request new events or project ideas.
- 🛡️ **Admins** review and approve event requests to ensure quality and relevance.
- 📝 Once approved, event details are published and registration opens.

### 2️⃣ Registration & Team Formation
- 👤 Students can join as individuals or form teams (depending on event format).
- 🤝 Team formation is encouraged for collaborative events.
- 🏷️ Roles and responsibilities are clarified within teams.

### 3️⃣ Project Development
- 💻 Teams/individuals work on their projects during the event period.
- 📊 Regular updates and checkpoints may be required.
- 💬 Collaboration, mentorship, and support are available throughout.

### 4️⃣ Submission & Review
- 🎉 Participants submit their completed projects before the deadline.
- 📝 Submissions are reviewed for completeness and adherence to guidelines.

### 5️⃣ Peer Voting & XP Distribution
- ⭐ Participants (not involved in the event) vote on projects based on defined criteria.
- ✨ XP is awarded for participation, project quality, teamwork, and votes.
- 🏆 Winners and top performers are recognized on the leaderboard.

### 6️⃣ Portfolio & Recognition
- 📁 All completed projects and XP contribute to each student’s portfolio.
- 🏅 Achievements and badges are displayed on user profiles.
`;

const votingContent = `
## Voting System

### ⭐ What Gets Voted On?
- 💻 Technical implementation
- 🎤 Project presentation
- ✨ Code quality
- 📄 Documentation
- 🤝 Team collaboration

### 📝 How Voting Works
- Peer voting is conducted after event completion.
- Voting uses one student/team across multiple categories.
- Feedback is anonymous and constructive.

### 👍 Voting Guidelines
- Be objective and fair.
- Provide actionable feedback.
- Vote based on the published criteria.
- Consider both effort and outcome.
`;

const xpContent = `
## Experience Points (XP) System

### ✨ How to Earn XP
- Event participation: 2 XP
- Best Performer: Bonus XP
- Team leadership: Extra XP
- Event organization: 10-50 XP

### 🏷️ XP Categories
- Developer
- Frontend Design
- Presentation Skills
- Design 
- Problem Solving

### 🚀 Level System
- Levels are based on total XP.
- Progression is tracked for each skill category.
- Special badges are awarded for milestones.
- XP never decays—your achievements are permanent!
`;

const generalContent = `
## General Guidelines

### 📜 Code of Conduct
- Maintain professionalism and respect.
- Uphold academic integrity.
- Foster a collaborative and inclusive environment.

### 💬 Communication
- Communicate clearly and promptly.
- Use appropriate channels for discussions.
- Provide constructive feedback.

### 🙋 Participation
- Engage regularly in events and meetings.
- Meet deadlines and contribute actively.

### 🆘 Support
- Reach out for technical help or mentorship.
- Utilize available resources.
- Report issues or concerns to organizers/admins.
`;

// --- Reactive HTML Content ---
const eventLifecycleHtml = ref('');
const votingHtml = ref('');
const xpHtml = ref('');
const generalHtml = ref('');

// --- Utility function to render markdown content safely (now async) ---
const renderSection = async (content: string): Promise<string> => {
    if (!content) return '';
    try {
        const rawHtml: string = await marked(content); // Await the promise
        return DOMPurify.sanitize(rawHtml);
    } catch (error) {
        return `<p class="text-danger">Error rendering content.</p>`;
    }
};

// --- Watchers to render content when strings are defined ---
watchEffect(async () => {
    eventLifecycleHtml.value = await renderSection(eventLifecycleContent);
});
watchEffect(async () => {
    votingHtml.value = await renderSection(votingContent);
});
watchEffect(async () => {
    xpHtml.value = await renderSection(xpContent);
});
watchEffect(async () => {
    generalHtml.value = await renderSection(generalContent);
});

</script>

<style scoped>
.transparency-section {
  background-color: var(--bs-body-bg);
}

.card {
  border-radius: 1rem;
  overflow: hidden;
}

.card-header {
  border-top-left-radius: 1rem !important;
  border-top-right-radius: 1rem !important;
  background: var(--bs-primary-bg-subtle);
}

.card-body .content h2 {
    font-size: 1.75rem;
    margin-bottom: 1rem;
    margin-top: 1.5rem;
    font-weight: 500;
}

.card-body .content h3 {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
    margin-top: 1.25rem;
    font-weight: 500;
}

.card-body .content ul {
    list-style: disc;
    padding-left: 2rem;
    margin-top: 0.5rem;
}

.card-body .content p,
.card-body .content li {
    line-height: 1.7;
    margin-bottom: 0.5rem;
}

.card-body .content strong {
    color: var(--bs-primary);
}

@media (max-width: 768px) {
  .card-header, .card {
    border-radius: 0.5rem !important;
  }
}
</style>
