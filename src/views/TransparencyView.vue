// /src/views/TransparencyView.vue
<template>
    <div class="container mt-4">
      <h2 class="mb-4">Community Transparency</h2>

      <!-- Use card structure similar to ResourcesView -->
      <div class="transparency-content">
            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Introduction</h3>
                </div>
                <div class="card-body" v-html="renderSection(introductionContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Roles & Permissions</h3>
                </div>
                <div class="card-body" v-html="renderSection(rolesContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Event Lifecycle</h3>
                </div>
                <div class="card-body" v-html="renderSection(eventLifecycleContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Team Management</h3>
                </div>
                <div class="card-body" v-html="renderSection(teamsContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Rating System</h3>
                </div>
                <div class="card-body" v-html="renderSection(ratingContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Experience Points (XP) System</h3>
                </div>
                <div class="card-body" v-html="renderSection(xpContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Portfolio & Projects</h3>
                </div>
                <div class="card-body" v-html="renderSection(portfolioContent)"></div>
            </div>

             <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">Leaderboard</h3>
                </div>
                <div class="card-body" v-html="renderSection(leaderboardContent)"></div>
            </div>

             <div class="card mb-4 shadow-sm">
                <div class="card-header">
                    <h3 class="mb-0">General Information</h3>
                </div>
                <div class="card-body" v-html="renderSection(generalContent)"></div>
            </div>
      </div>
    </div>
  </template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked'; // Ensure marked is installed (npm install marked)
// Optional: import DOMPurify from 'dompurify';

// --- Markdown Content Sections ---

const introductionContent = `
This page outlines how our KSB MCA Software Community platform operates, aiming for transparency in how events are managed, how contributions are recognized (XP), and how feedback (ratings) is handled. Our goal is to provide a clear understanding of the platform's mechanics.
`;

const rolesContent = `
*   **Student:** Can view events, request new events (limit one active/pending request), participate in events (join/leave upcoming), submit projects (during 'In Progress' events), rate participants/teams in completed events, manage their own profile (skills, preferred roles - *project list is now automatic*), view leaderboards, view public profiles, and generate a PDF portfolio based on their profile and event submissions.
*   **Teacher / Admin:** Have all student permissions plus:
    *   Can create events directly (auto-approved, bypasses request limit).
    *   Can manage pending event requests (approve/reject).
    *   Can manage created events (update status, manage teams, toggle ratings, set winners manually or auto-calculate, delete).
    *   Ratings submitted by Admins/Teachers carry higher weight (70%) in score calculations.
    *   Can manage shared resources (via direct Firestore access or future admin UI).
    *   Admin accounts do not have a personal user profile page and are excluded from the leaderboard.
`;

const eventLifecycleContent = `
1.  **Request (Student):** Students use the "Request Event" form. Requires name, type, description, desired dates. Optional: team event flag, co-organizers, custom rating criteria. The request enters a "Pending" state. A student cannot submit a new request if they have another "Pending" or "Approved" (but not yet started) request.
2.  **Direct Creation (Admin/Teacher):** Admins/Teachers use the "Create Event" form (same UI, different backend action). The event is created directly with an "Upcoming" status and is auto-approved. A date conflict check is performed during creation against other 'Upcoming'/'In Progress' events.
3.  **Approval (Admin/Teacher):** Admins/Teachers review "Pending" requests via "Manage Requests". They can see potential date conflicts. Approving a request creates a new event with status "Upcoming" using the requested details. Rejecting marks the request as "Rejected".
4.  **Management (Organizer/Co-Organizer/Admin):**
    *   **Status Updates:** Events progress: Upcoming -> In Progress -> Completed. They can also be "Cancelled" (from Upcoming/In Progress). Moving to 'Completed' triggers XP calculation.
    *   **Teams:** For team events, authorized users can create teams and assign students via "Manage Teams". Students can only be in one team per event.
    *   **Participants (Individual):** Participants are added implicitly when they submit a project or potentially through a future "Join Event" button (not currently implemented). Users can leave 'Upcoming' events.
    *   **Submissions:** Participants (or one member per team) can submit project details (name, link, description) while the event is "In Progress". Only one submission per participant/team is allowed.
    *   **Ratings:** Once an event is "Completed", authorized users can manually "Open Ratings".
    *   **Winners:** After completion, authorized users can manually select a winner (radio button) or use "Calculate Winner (Auto)" which determines the highest scoring participant/team based on weighted ratings.
    *   **Deletion:** Authorized users can delete events (permanent).
`;

const teamsContent = `
*   Applies only to events marked as "Is this a team event?".
*   Teams are created and students are assigned via the "Manage Teams" page, accessible by the event organizer(s), co-organizer(s) or Admins.
*   The student selection list shows users with the "Student" role (or no defined role). The current user and users already assigned to *any* team within the *same* event are disabled in the selection list.
*   Team names must be unique within an event.
`;

const ratingContent = `
*   **Availability:** Ratings can only be submitted for events that are "Completed" AND have had their "Ratings Open" toggle enabled.
*   **Who Can Rate:** Any authenticated user (Student, Teacher, Admin) can rate. Users cannot rate themselves in individual events.
*   **Process:** Users navigate to the event details page. A "Rate Team" button appears for teams, or a "Rate" button appears next to participants in individual events. Clicking leads to the rating form.
*   **Criteria:** Events use 5 rating criteria (defaults: Design, Presentation, Problem Solving, Execution, Technology, customizable on creation). Users rate each on a 1-5 star scale. A rating of 0 stars is not counted towards the average unless it's the only rating submitted.
*   **Weighting:** For calculating scores, ratings from "Teacher" or "Admin" users have a 70% weight; ratings from "Student" users have a 30% weight.
*   **Score:** The final weighted average score (0-5) is calculated based on the average of the 5 criteria ratings, weighted by the rater's role.
`;

const xpContent = `
*   **Calculation Trigger:** XP is automatically calculated/recalculated for all participants when an event's status changes to "Completed", or when winners are set/changed.
*   **Base XP:** Derived from the weighted average score (0-5 scale) from ratings for that participant/team in the event. The score is multiplied by 10 (e.g., a score of 4.5 yields 45 base XP).
*   **Winner Bonus:** A fixed bonus (currently 100 XP) is added to the base XP if the participant/team is marked as a winner.
*   **Distribution (\`xpByRole\`):** The total XP (Base + Bonus) earned from a completed event is currently distributed *equally* across all predefined role categories in the user's profile (\`xpByRole\` map): \`fullstack\`, \`presenter\`, \`designer\`, \`organizer\`, \`problemSolver\`. *Future refinement may allow more targeted distribution based on event type or rated criteria.*
*   **Total XP:** The "Total XP" shown on profiles and used for the "Overall" leaderboard is the sum of all values in the user's \`xpByRole\` map.
`;

const portfolioContent = `
*   **Project Source:** The "Event Projects" section on the user profile *automatically* displays project submissions made by the user (or their team) for completed events. Manually adding projects to the profile is no longer supported.
*   **Generation:** A "Generate PDF Portfolio" button is available on the user's own profile page.
*   **Content:** The generated PDF includes:
    *   User's Name
    *   Total XP
    *   Skills and Preferred Roles (if added on profile)
    *   XP Breakdown by role (\`xpByRole\`)
    *   List of Event Project Submissions (Name, Description, Link, Event Context).
`;

const leaderboardContent = `
*   Ranks users (excluding Admins) based on their calculated XP.
*   Can be filtered by:
    *   **Overall:** Ranks by Total XP (sum of all \`xpByRole\` categories).
    *   **Specific Roles:** (e.g., Fullstack, Presenter) Ranks by the XP in that specific \`xpByRole\` category.
`;

const generalContent = `
*   **Resources:** A curated list of links, guides, and downloads is available on the "Resources" page.
*   **Communication:** Official communication channels will be specified by the department.
*   **Code of Conduct:** All community members must adhere to a code of conduct promoting respectful and collaborative interaction. (Link to be provided if available).
*   **Data Privacy:** We collect data necessary for authentication, profile management, event participation, ratings, and XP calculation. We strive to protect user data. This platform is for internal community use.
`;

// Function to render markdown with options
const renderSection = (markdown) => {
    if (!markdown) return '';
    marked.setOptions({
        gfm: true,
        breaks: true,
        // sanitize: false, // Basic sanitization is often needed. Use DOMPurify in production.
    });
    const rawHtml = marked(markdown);
    // Add target="_blank" to external links
    const linkedHtml = rawHtml.replace(/<a href="http/g, '<a target="_blank" rel="noopener noreferrer" href="http');
    // Optional: Sanitize HTML (replace with DOMPurify for security)
    // const cleanHtml = DOMPurify.sanitize(linkedHtml);
    // return cleanHtml;
    return linkedHtml; // Return potentially unsanitized HTML (use with trusted content)
};

</script>

<style scoped>
/* Styles mimic ResourcesView and use main.css variables/classes */
.transparency-content .card-header h3 { font-size: 1.15rem; }
.transparency-content .card-body { color: var(--color-text-secondary); }

/* Target elements generated by marked inside card-body */
:deep(.card-body > :first-child) { margin-top: 0; }
:deep(.card-body > :last-child) { margin-bottom: 0; }
:deep(.card-body h1), :deep(.card-body h2), :deep(.card-body h3), :deep(.card-body h4) {
    color: var(--color-text); margin-top: var(--space-5); margin-bottom: var(--space-3); }
:deep(.card-body p) { margin-bottom: var(--space-4); }
:deep(.card-body ul), :deep(.card-body ol) {
    padding-left: var(--space-6); margin-bottom: var(--space-4); }
:deep(.card-body li) { margin-bottom: var(--space-2); }
:deep(.card-body a) { color: var(--color-primary); }
:deep(.card-body a:hover) { color: var(--color-primary-hover); }
:deep(.card-body code) {
     background-color: var(--color-background); padding: var(--space-1) var(--space-2);
     border-radius: calc(var(--border-radius) / 2); font-size: 90%; color: var(--color-text); }
:deep(.card-body pre) {
     background-color: var(--color-background); padding: var(--space-4);
     border-radius: var(--border-radius); overflow-x: auto; margin-bottom: var(--space-4); }
:deep(.card-body pre code) { padding: 0; background: none; }
:deep(.card-body blockquote) {
    border-left: 4px solid var(--color-border); padding-left: var(--space-4);
    margin: 0 0 var(--space-4) 0; color: var(--color-text-muted); font-style: italic; }
</style>