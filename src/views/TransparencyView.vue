<template>
    <section class="transparency-section">
        <div class="container-lg py-4">
            <h1 class="h1 text-primary mb-4 pb-3 border-bottom border-2">
                Community Processes & Guidelines
            </h1>
            <div class="transparency-content">
                <!-- Event System Section -->
                <div class="card mb-4 shadow-sm hover-card">
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
                <div class="card mb-4 shadow-sm hover-card">
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
                <div class="card mb-4 shadow-sm hover-card">
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
import { ref, watchEffect } from 'vue';
import { useMarkdownRenderer } from '@/composables/useMarkdownRenderer';

const { renderMarkdown } = useMarkdownRenderer();

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

### 4️⃣ Project Submission & Review
- ✅ Projects are submitted by the deadline.
- 🧐 **Admins/Mentors** review submissions for completeness and quality.
- 📋 Feedback is provided to participants.

### 5️⃣ Voting & Feedback (If Applicable)
- 👍 For competitive events, a voting period may be initiated.
- 🗳️ Participants and/or community members can vote on projects.
- 🗣️ Constructive feedback is encouraged.

### 6️⃣ XP & Recognition
- ⭐ XP (Experience Points) are awarded based on participation, project quality, and contributions.
- 🏆 Winners/top performers are recognized.
- 📄 All participants gain valuable experience and portfolio-worthy projects.
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

// --- Watchers to render content when strings are defined ---
watchEffect(async () => {
    try {
        eventLifecycleHtml.value = await renderMarkdown(eventLifecycleContent);
    } catch (e) {
        console.error("Error rendering eventLifecycleContent:", e);
        eventLifecycleHtml.value = `<p class="text-danger">Error rendering content.</p>`;
    }
});
watchEffect(async () => {
    try {
        votingHtml.value = await renderMarkdown(votingContent);
    } catch (e) {
        console.error("Error rendering votingContent:", e);
        votingHtml.value = `<p class="text-danger">Error rendering content.</p>`;
    }
});
watchEffect(async () => {
    try {
        xpHtml.value = await renderMarkdown(xpContent);
    } catch (e) {
        console.error("Error rendering xpContent:", e);
        xpHtml.value = `<p class="text-danger">Error rendering content.</p>`;
    }
});
watchEffect(async () => {
    try {
        generalHtml.value = await renderMarkdown(generalContent);
    } catch (e) {
        console.error("Error rendering generalContent:", e);
        generalHtml.value = `<p class="text-danger">Error rendering content.</p>`;
    }
});

</script>

<style scoped>
.transparency-section {
  background-color: var(--bs-body-bg);
  padding-top: 2rem;
  padding-bottom: 3rem;
}

.card {
  border-radius: 1rem;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
}

.card-header {
  border-top-left-radius: 1rem !important;
  border-top-right-radius: 1rem !important;
  background: var(--bs-primary-bg-subtle);
  padding: 1rem 1.25rem;
}

.card-body {
  padding: 1.5rem;
}

.card-body .content h2 {
    font-size: 1.75rem;
    margin-bottom: 1.25rem;
    margin-top: 1rem;
    font-weight: 600;
    color: var(--bs-primary);
}

.card-body .content h3 {
    font-size: 1.4rem;
    margin-bottom: 1rem;
    margin-top: 1.5rem;
    font-weight: 500;
    color: var(--bs-primary-text-emphasis);
}

.card-body .content ul {
    list-style: disc;
    padding-left: 2rem;
    margin-top: 0.75rem;
    margin-bottom: 1rem;
}

.card-body .content p,
.card-body .content li {
    line-height: 1.8;
    margin-bottom: 0.75rem;
    font-size: 1.05rem;
}

.card-body .content strong {
    color: var(--bs-primary);
    font-weight: 600;
}

hr {
  opacity: 0.15;
}

@media (max-width: 768px) {
  .card-header, .card {
    border-radius: 0.5rem !important;
  }
  
  .card-body {
    padding: 1.25rem;
  }
  
  .transparency-section {
    padding-top: 1rem;
    padding-bottom: 2rem;
  }
}
</style>
