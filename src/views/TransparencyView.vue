<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-12">
      <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">Community Transparency & Guidelines</h2>

      <div class="space-y-6">
            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-blue-600 text-white">
                    <i class="fas fa-info-circle h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">Introduction</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(introductionContent)"></div>
            </div>

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-gray-600 text-white">
                    <i class="fas fa-users-cog h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">Roles & Permissions</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(rolesContent)"></div>
            </div>

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                 <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-cyan-600 text-white">
                     <i class="fas fa-project-diagram h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">Event Lifecycle</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(eventLifecycleContent)"></div>
            </div>

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-gray-600 text-white">
                    <i class="fas fa-users h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">Team Management</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(teamsContent)"></div>
            </div>

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-yellow-500 text-gray-800">
                     <i class="fas fa-star-half-alt h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">Rating System</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(ratingContent)"></div>
            </div>

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-blue-600 text-white">
                    <i class="fas fa-star h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">Experience Points (XP) System</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(xpContent)"></div>
            </div>

            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                 <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-green-600 text-white">
                     <i class="fas fa-file-pdf h-4 w-4 mr-2"></i>
                     <h3 class="text-base font-semibold">Portfolio & Projects</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(portfolioContent)"></div>
            </div>

             <div class="bg-white shadow-md rounded-lg overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-yellow-500 text-gray-800">
                    <i class="fas fa-trophy h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">Leaderboard</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(leaderboardContent)"></div>
            </div>

             <div class="bg-white shadow-md rounded-lg overflow-hidden">
                 <div class="px-4 py-3 border-b border-gray-200 flex items-center bg-gray-100 text-gray-800">
                    <i class="fas fa-book-open h-4 w-4 mr-2"></i>
                    <h3 class="text-base font-semibold">General Information</h3>
                </div>
                <div class="p-4 sm:p-6" v-html="renderSection(generalContent)"></div>
            </div>
      </div>
    </div>
  </template>

<script setup>
import { ref } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked options (optional, but good practice)
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