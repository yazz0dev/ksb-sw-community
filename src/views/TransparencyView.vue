// /src/views/TransparencyView.vue
<template>
    <div class="container mt-4">
      <h2 class="mb-4">Community Transparency</h2>

      <!-- Use card structure similar to ResourcesView -->
      <div class="transparency-content">
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Introduction</h3>
                </div>
                <div class="card-body" v-html="renderSection(introductionContent)"></div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>Roles & Permissions</h3>
                </div>
                <div class="card-body" v-html="renderSection(rolesContent)"></div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>Event Lifecycle</h3>
                </div>
                <div class="card-body" v-html="renderSection(eventLifecycleContent)"></div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>Team Management</h3>
                </div>
                <div class="card-body" v-html="renderSection(teamsContent)"></div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>Rating System</h3>
                </div>
                <div class="card-body" v-html="renderSection(ratingContent)"></div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>Experience Points (XP) System</h3>
                </div>
                <div class="card-body" v-html="renderSection(xpContent)"></div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>Portfolio & Projects</h3>
                </div>
                <div class="card-body" v-html="renderSection(portfolioContent)"></div>
            </div>

             <div class="card mb-4">
                <div class="card-header">
                    <h3>Leaderboard</h3>
                </div>
                <div class="card-body" v-html="renderSection(leaderboardContent)"></div>
            </div>

             <div class="card mb-4">
                <div class="card-header">
                    <h3>General Information</h3>
                </div>
                <div class="card-body" v-html="renderSection(generalContent)"></div>
            </div>
      </div>
    </div>
  </template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked'; // Ensure marked is installed (npm install marked)

// --- Markdown Content Sections ---

const introductionContent = `
This page outlines how our KSB MCA Software Community platform operates, aiming for transparency in how events are managed, how contributions are recognized (XP), and how feedback (ratings) is handled.
`;

const rolesContent = `
*   **Student:** Can view events, request new events (limit one active/pending request), participate in events, rate participants/teams in completed events, manage their own profile (add projects), view leaderboards, and generate a portfolio.
*   **Teacher / Admin:** Have all student permissions plus:
    *   Can create events directly (auto-approved).
    *   Can manage pending event requests (approve/reject).
    *   Can manage created events (update status, manage teams, toggle ratings, set winners, delete).
    *   Ratings submitted by Admins carry higher weight in calculations.
    *   Can manage shared resources (future feature).
    *   Admin accounts do not have a personal user profile page.
`;

const eventLifecycleContent = `
1.  **Request (Student):** Students use the "Request Event" form. The request enters a "Pending" state. A student cannot submit a new request if they have another "Pending" or "Approved" (but not yet started) request.
2.  **Direct Creation (Admin):** Admins use the "Create Event" form (same UI, different backend action). The event is created directly with an "Upcoming" status and is auto-approved. A date conflict check is performed during creation.
3.  **Approval (Admin):** Admins review "Pending" requests via "Manage Requests". They check for date conflicts with existing events. Approving a request creates a new event with status "Upcoming". Rejecting marks the request as "Rejected".
4.  **Management (Organizer/Admin):**
    *   **Status Updates:** Events progress through statuses: Upcoming -> In Progress -> Completed. They can also be "Cancelled".
    *   **Teams:** For team events, organizers/admins can create teams and assign students via the "Manage Teams" page.
    *   **Ratings:** Once an event is "Completed", the organizer/admin can manually "Open Ratings".
    *   **Winners:** After completion, organizers/admins can manually select a winner or use the "Calculate Winner (Auto)" button (which determines the winner based on weighted average ratings). Only *one* winner (team or individual) is currently supported via manual selection.
    *   **Deletion:** Organizers/Admins can delete events (use with caution!).
`;

const teamsContent = `
*   Applies only to events marked as "Team Event".
*   Teams are created and students are assigned via the "Manage Teams" page, accessible by the event organizer(s) or Admins.
*   The student selection list shows users with the "Student" role or users without any role field defined.
*   Students already assigned to *any* team within the *same* event are disabled in the selection list.
`;

const ratingContent = `
*   **Availability:** Ratings can only be submitted for events that are "Completed" AND have had their "Ratings Open" toggle enabled by an organizer/admin.
*   **Who Can Rate:** Any authenticated user (Student, Teacher, Admin) can rate participants or teams.
*   **Process:** Users navigate to the event details page and click the "Rate Team" or "Rate" button (for individuals). A link to the event page can be copied and shared while ratings are open.
*   **Criteria:** Each event uses 5 rating criteria (e.g., Design, Presentation, Problem Solving, Execution, Technology). These can be customized when an event is requested/created. Users rate each criterion on a 0-5 star scale.
*   **Weighting:** For calculating scores (used for XP and optionally auto-winner calculation), ratings from users with the "Teacher" or "Admin" role are given a 70% weight, while ratings from "Student" users are given a 30% weight.
`;

const xpContent = `
*   **Calculation Trigger:** XP points are automatically calculated and updated for all participants when an event's status is changed to "Completed". Setting winners may also trigger a recalculation if bonuses apply. Submitting a rating does *not* directly grant XP.
*   **Basis:** The base XP earned from an event is derived from the weighted average score (0-5 scale) calculated from ratings (see Rating System). This score is typically scaled (e.g., multiplied by 10) to determine the base XP amount.
*   **Distribution (\`xpByRole\`):** The total XP earned from a completed event is currently distributed across several predefined role categories stored in the user's profile (\`xpByRole\` map):
    *   \`fullstack\`
    *   \`presenter\`
    *   \`designer\`
    *   \`organizer\`
    *   \`problemSolver\`
    *   *Note: In the current simplified implementation, the full event XP amount is added to *each* of these categories. This might be refined in the future for more specific role-based XP assignment.*
*   **Winner Bonus:** If a user or their team is marked as the winner of an event, a fixed bonus (currently 100 XP) is added to their calculated event XP before distribution to the \`xpByRole\` categories.
*   **Total XP:** The "Total XP" displayed on profiles and used for the "Overall" leaderboard is the sum of all values in the user's \`xpByRole\` map.
`;

const portfolioContent = `
*   Students can manage a list of personal projects on their "Profile" page.
*   Each project includes a name, description, and a GitHub link.
*   A "Generate PDF Portfolio" button is available on the profile page. This generates a PDF document containing:
    *   User's Name and UID
    *   Total XP
    *   Skills and Preferred Roles (if added)
    *   XP Breakdown by role (\`xpByRole\`)
    *   List of added projects with descriptions and links.
`;

const leaderboardContent = `
*   The Leaderboard ranks users based on their calculated XP.
*   Users with the "Admin" role are excluded from the leaderboard.
*   The leaderboard can be filtered:
    *   **Overall:** Ranks users by their Total XP (sum of all \`xpByRole\` categories).
    *   **Specific Roles:** (e.g., Fullstack, Presenter) Ranks users based only on the XP accumulated in that specific \`xpByRole\` category.
`;

const generalContent = `
*   **Resources:** A static list of useful links, guides, and downloads is available on the "Resources" page.
*   **Communication:** Please use appropriate channels for communication (details may be provided elsewhere).
*   **Code of Conduct:** All community members are expected to adhere to a standard code of conduct promoting respectful and collaborative interaction.
*   **Data Privacy:** We collect minimal necessary data (related to authentication, profile, event participation, ratings) to operate the platform. We strive to protect user data appropriately.
`;

// Function to render markdown with options
const renderSection = (markdown) => {
    if (!markdown) return '';
    // Configure marked (optional)
    marked.setOptions({
        gfm: true, // Enable GitHub Flavored Markdown
        breaks: true, // Convert single line breaks to <br>
        // sanitize: true, // Consider DOMPurify for production: npm install dompurify; import DOMPurify from 'dompurify';
    });
    const dirtyHtml = marked(markdown);
    // Simple link target="_blank" addition
    const withTargetBlank = dirtyHtml.replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
    // Add basic sanitization if needed, replace with DOMPurify for robustness
    // const cleanHtml = DOMPurify.sanitize(withTargetBlank);
    // return cleanHtml;
    return withTargetBlank; // Return unsanitized for now, assuming content is trusted
};

</script>

<style scoped>
/* Add styles to mimic ResourcesView card structure */
.transparency-content .card {
    background-color: var(--color-surface);
    border: var(--border-width) solid var(--color-border);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-sm); /* Lighter shadow */
}

.transparency-content .card-header {
    background-color: var(--color-background);
    padding: var(--space-3) var(--space-5);
    border-bottom: var(--border-width) solid var(--color-border);
    font-weight: 600;
}

.transparency-content .card-header h3 {
    margin-bottom: 0;
    font-size: 1.15rem; /* Slightly smaller header */
}

.transparency-content .card-body {
    padding: var(--space-5);
    color: var(--color-text-secondary);
    font-size: var(--font-size-base);
    line-height: var(--line-height-base);
}

/* Target elements generated by marked inside card-body */
.transparency-content .card-body > :first-child {
    margin-top: 0;
}
.transparency-content .card-body > :last-child {
    margin-bottom: 0;
}

.transparency-content .card-body h1,
.transparency-content .card-body h2,
.transparency-content .card-body h3,
.transparency-content .card-body h4 {
    color: var(--color-text);
    margin-top: var(--space-6);
    margin-bottom: var(--space-3);
}

.transparency-content .card-body p {
    margin-bottom: var(--space-4);
}

.transparency-content .card-body ul,
.transparency-content .card-body ol {
    padding-left: var(--space-6); /* Indent lists */
    margin-bottom: var(--space-4);
}
.transparency-content .card-body li {
    margin-bottom: var(--space-2);
}

.transparency-content .card-body a {
    color: var(--color-primary);
}
.transparency-content .card-body a:hover {
    color: var(--color-primary-hover);
}

.transparency-content .card-body code {
     background-color: var(--color-background);
     padding: var(--space-1) var(--space-2);
     border-radius: calc(var(--border-radius) / 2);
     font-size: 90%;
}

.transparency-content .card-body pre {
     background-color: var(--color-background);
     padding: var(--space-4);
     border-radius: var(--border-radius);
     overflow-x: auto;
     margin-bottom: var(--space-4);
}
.transparency-content .card-body pre code {
    padding: 0;
    background: none;
}

.transparency-content .card-body blockquote {
    border-left: 4px solid var(--color-border);
    padding-left: var(--space-4);
    margin-left: 0;
    margin-right: 0;
    margin-bottom: var(--space-4);
    color: var(--color-text-muted);
    font-style: italic;
}

</style>