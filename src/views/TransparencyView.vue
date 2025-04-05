<template>
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-3xl font-bold text-text-primary mb-6 pb-2 border-b border-border">Community Transparency & Guidelines</h1>

        <div class="space-y-6">
            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-info-circle h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Introduction</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(introductionContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-users-cog h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Roles & Permissions</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(rolesContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-project-diagram h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Event Lifecycle</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(eventLifecycleContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-users h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Team Management</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(teamsContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-star-half-alt h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Rating System</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(ratingContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-star h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Experience Points (XP) System</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(xpContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-file-pdf h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Portfolio & Projects</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(portfolioContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-trophy h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Leaderboard</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(leaderboardContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-book-open h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">General Information</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(generalContent)"></div>
            </div>
        </div>
      </div>
    </div>
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
Welcome to the KSB Software Community Platform! We foster collaboration, skill development, and friendly competition. Our goal is a transparent, fair environment where contributions are recognized. This page outlines our platform's mechanics and guidelines.
`;

const rolesContent = `
Our community has three roles with distinct permissions:

#### Student
*   View events (upcoming/past).
*   Request new events (needs Admin approval).
*   Join **Approved** events.
*   Form/join teams for team events.
*   Submit projects (individual/team).
*   Rate others after events based on Organizer's criteria.
*   Earn XP via participation, ratings, and wins.
*   View own profile (XP, projects, etc.) and generate portfolio PDF.
*   View public user profiles.

#### Event Organizer
*   All **Student** permissions.
*   Create and manage their own events (details, dates, XP, rating criteria).
*   Manage team formation for their events (e.g., set size limits).
*   Start/manage rating periods for their completed events (after a cooldown).
*   Ensure their event runs smoothly and fairly.
*   View detailed results/ratings for their organized events.

#### Administrator
*   All **Student** and **Event Organizer** permissions for *any* event.
*   Approve/reject event requests from Students.
*   Create events directly.
*   Manage users, events, and system settings.
*   Oversee the platform, enforce guidelines, resolve disputes.
`;

const eventLifecycleContent = `
Events follow a clear lifecycle:

1.  **Request/Creation:**
    *   **Students** request events (**Pending** state).
    *   **Admins/Organizers** create events directly (**Approved** state).

2.  **Approval:**
    *   **Admins** review **Pending** requests, approving or rejecting them. Approved requests become **Approved**.

3.  **Event States:**
    *   **Pending:** Awaiting Admin approval.
    *   **Approved:** Scheduled; Students can join.
    *   **In Progress:** Event is active; submissions open.
    *   **Completed:** Event ended; submissions closed.
    *   **Rating Open:** Organizer manually starts rating period after completion (post-cooldown).
    *   **Rating Closed:** Rating period ended; XP calculated.
    *   **Cancelled:** Event terminated early.

4.  **Submission:** During **In Progress** state.
5.  **Rating:** Initiated by Organizer after **Completed** state (requires cooldown). Participants rate based on event criteria. Ends manually or automatically; XP calculated.
`;

const teamsContent = `
Events can be individual or team-based:

*   **Type:** Organizer sets event type (individual/team).
*   **Formation:** Students form/join teams (up to size limit) for team events. Organizer may assist.
*   **Submissions:** Teams submit work collectively.
*   **Ratings:** Teams are rated as a unit.
*   **XP:** Earned XP is typically shared equally among team members based on event role weights.
`;

const ratingContent = `
Peer ratings provide feedback and influence XP:

*   **Timing:** Occurs after an event is **Completed** and the Organizer opens the rating period.
*   **Criteria:** Organizer defines criteria (e.g., Functionality, Design) linked to XP roles.
*   **Scale:** Participants rate others (individuals/teams) per criterion (e.g., 0-5 stars).
*   **Weighted Average:** Overall rating is a weighted average based on XP allocated to each criterion's role. Higher ratings on criteria with more XP contribute more.
*   **Winner:** Participant/team with the highest weighted average rating usually wins.
*   **Objectivity:** Provide fair, objective ratings based on criteria.
`;

const xpContent = `
Experience Points (XP) track participation and achievements:

#### XP Roles/Categories
XP is earned per skill/role (e.g., Full Stack, UI/UX, Presentation).

#### Earning XP
*   **Participation:** Base XP for submitting (optional).
*   **Performance (Ratings):** Main source. Weighted average rating determines XP earned per relevant role.
*   **Winning Bonus:** Winner(s) get a flat XP bonus (e.g., +100 XP).

#### Calculation & Tracking
*   Calculated after **Rating Period** closes.
*   Added to user's profile under corresponding roles (\`xpByRole\`).
*   **Total XP** is the sum across all roles (\`currentUserTotalXp\`).
`;

const portfolioContent = `
Your profile showcases your work:

*   **Submissions:** Link projects (e.g., GitHub) during events.
*   **History:** Profile lists participated/organized/won events.
*   **Showcase:** Completed projects are displayed publicly.
*   **Skills & XP:** Profile shows skills, roles, and XP earned per category.
*   **PDF Generation:** Create a PDF summary of your profile (XP, skills, projects) for sharing.
`;

const leaderboardContent = `
Ranks participants by achievement:

*   **Basis:** Ranks users by **Total XP**.
*   **Visibility:** Shows top community members.
*   **Updates:** Updates automatically after event ratings are finalized.
`;

const generalContent = `
Platform guidelines:

#### Submissions
*   Use publicly accessible links (e.g., public GitHub repos).
*   Provide clear project descriptions.
*   Submit before the deadline.

#### Rating Etiquette
*   Rate fairly based *only* on criteria. Avoid bias.
*   Rate promptly.

#### Scheduling
*   Avoid scheduling overlapping events.
*   Be mindful of rating period start/end times.

#### Code of Conduct
*   Be respectful and professional.
*   Follow KSB community's Code of Conduct.
*   Report concerns to an Administrator.
`;

// Utility function to render markdown content safely
const renderSection = (content) => {
    const rawHtml = marked(content);
    // Sanitize the HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml);
};
</script>