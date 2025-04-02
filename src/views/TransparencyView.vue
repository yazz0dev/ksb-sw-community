// /src/views/TransparencyView.vue
<template>
    <div class="container mt-4 mb-5">
      <h2 class="mb-4 text-center">Community Transparency & Guidelines</h2>

      <!-- Use card structure similar to ResourcesView -->
      <div class="transparency-content">
            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-primary text-white">
                    <h3 class="mb-0 h5"><i class="fas fa-info-circle me-2"></i>Introduction</h3>
                </div>
                <div class="card-body" v-html="renderSection(introductionContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-secondary text-white">
                    <h3 class="mb-0 h5"><i class="fas fa-users-cog me-2"></i>Roles & Permissions</h3>
                </div>
                <div class="card-body" v-html="renderSection(rolesContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-info text-white">
                    <h3 class="mb-0 h5"><i class="fas fa-project-diagram me-2"></i>Event Lifecycle</h3>
                </div>
                <div class="card-body" v-html="renderSection(eventLifecycleContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header" style="background-color: var(--bs-teal); color: white;">
                    <h3 class="mb-0 h5"><i class="fas fa-users me-2"></i>Team Management</h3>
                </div>
                <div class="card-body" v-html="renderSection(teamsContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-warning text-dark">
                    <h3 class="mb-0 h5"><i class="fas fa-star-half-alt me-2"></i>Rating System</h3>
                </div>
                <div class="card-body" v-html="renderSection(ratingContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header" style="background-color: var(--bs-purple); color: white;">
                    <h3 class="mb-0 h5"><i class="fas fa-star me-2"></i>Experience Points (XP) System</h3>
                </div>
                <div class="card-body" v-html="renderSection(xpContent)"></div>
            </div>

            <div class="card mb-4 shadow-sm">
                <div class="card-header bg-success text-white">
                     <h3 class="mb-0 h5"><i class="fas fa-file-pdf me-2"></i>Portfolio & Projects</h3>
                </div>
                <div class="card-body" v-html="renderSection(portfolioContent)"></div>
            </div>

             <div class="card mb-4 shadow-sm">
                <div class="card-header" style="background-color: var(--bs-orange); color: white;">
                    <h3 class="mb-0 h5"><i class="fas fa-trophy me-2"></i>Leaderboard</h3>
                </div>
                <div class="card-body" v-html="renderSection(leaderboardContent)"></div>
            </div>

             <div class="card mb-4 shadow-sm">
                 <div class="card-header bg-light">
                    <h3 class="mb-0 h5"><i class="fas fa-book-open me-2"></i>General Information</h3>
                </div>
                <div class="card-body" v-html="renderSection(generalContent)"></div>
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
Welcome to the KSB Software Community Platform! This space is built to encourage collaboration, skill development, and friendly competition among students interested in software development. Our goal is to provide a transparent and fair environment where contributions are recognized and members can grow together. This page outlines the core mechanics and guidelines of our community platform.
`;

const rolesContent = `
Our community operates with three distinct roles, each with specific permissions:

#### Student
*   Can view upcoming and past events.
*   Can request new events (subject to Admin approval).
*   Can join **Approved** events.
*   Can form or join teams for team-based events.
*   Can submit projects (individually or as part of a team).
*   Can rate other participants/teams after an event concludes, based on criteria set by the Organizer.
*   Earns Experience Points (XP) based on participation, ratings received, and winning events.
*   Can view their own profile, XP breakdown, project history, and generate a portfolio PDF.
*   Can view public profiles of other users.

#### Event Organizer
*   Has all **Student** permissions.
*   Can create and manage events they organize (setting details, dates, XP allocation per role, rating criteria).
*   For team-based events they organize, they can manage team formation (e.g., set team size limits, potentially assign members if needed).
*   Can start and manage the rating period for their completed events (must wait for a cooldown after event end).
*   Responsible for ensuring their event runs smoothly and fairly according to community guidelines.
*   Can view detailed results and ratings for events they organized.

#### Administrator
*   Has all **Student** and **Event Organizer** permissions for *any* event.
*   Can approve or reject event requests submitted by Students.
*   Can create events directly.
*   Can manage all users, events, and system settings.
*   Oversees the platform, enforces community guidelines, and resolves disputes.
*   Can manage global settings like rating criteria templates (if applicable).
`;

const eventLifecycleContent = `
Events follow a structured lifecycle to ensure clarity and fairness:

1.  **Request/Creation:**
    *   A **Student** can request an event, providing necessary details. This enters the **Pending** state.
    *   An **Admin** or **Event Organizer** can create an event directly, setting its details, dates, XP values for different roles/criteria, and rating criteria. This typically starts in the **Approved** state if the start date is in the future.

2.  **Approval (for Student Requests):**
    *   An **Admin** reviews **Pending** event requests.
    *   They check for validity, date conflicts, and adherence to guidelines before approving or rejecting.
    *   Approved requests move to the **Approved** state.

3.  **Event States & Transitions:**
    *   **Pending:** Awaiting Admin approval (only for Student requests).
    *   **Approved:** Scheduled to start. Students can join, and Organizers can finalize setup.
    *   **In Progress:** The event start date/time has passed. Submissions are typically open during this phase.
    *   **Completed:** The event end date/time has passed. Submissions are closed.
    *   **Rating Open:** The Organizer has manually opened the rating period after the event is **Completed** (following a short cooldown). Participants can rate each other.
    *   **Rating Closed:** The Organizer has closed the rating period, or it has automatically closed (if a duration is set). XP calculations are finalized.
    *   **Cancelled:** The event was terminated prematurely by an Admin or Organizer.

4.  **Submission Phase:**
    *   Occurs while the event is **In Progress**.
    *   Participants/Teams submit their project links and descriptions.

5.  **Rating Phase:**
    *   Initiated by the **Event Organizer** after the event state becomes **Completed**.
    *   There's a cooldown period (e.g., 30 minutes) after completion before rating can be opened.
    *   Participants rate others based on the criteria defined for the event.
    *   The Organizer closes the rating period manually. Weighted average ratings and XP are calculated upon closing.
`;

const teamsContent = `
Events can be configured for individual participation or team collaboration:

*   **Event Type:** The Organizer specifies if an event is individual or team-based during creation.
*   **Team Formation:** For team events, Students can typically form their own teams or join existing ones within the event, up to the size limit set by the Organizer. The Organizer may also have tools to facilitate team assignments if needed.
*   **Team Identity:** Each team usually has a unique name within the event.
*   **Submissions:** In team events, submissions are made by the team collectively (e.g., one submission per team).
*   **Ratings:** Teams are rated as a single unit based on their collective submission and performance. Individual member ratings might contribute to an overall team score depending on the specific rating setup.
*   **XP:** XP earned from ratings and winning is typically awarded to all members of the team equally for team-based events, distributed according to the role XP weights defined for the event.
`;

const ratingContent = `
The rating system provides peer feedback and influences XP distribution:

*   **Timing:** Rating occurs *after* an event is **Completed** and the Organizer opens the rating period.
*   **Criteria:** The **Event Organizer** defines specific rating criteria relevant to the event's goals (e.g., Functionality, Design, Presentation, Collaboration). These criteria are linked to the XP roles defined for the event.
*   **Scale:** Participants rate others (individuals or teams) on each criterion using a scale (e.g., 0-5 stars).
*   **Weighted Average:** A participant's (or team's) overall rating for the event is calculated as a *weighted average*. The score given for each criterion is weighted by the XP points allocated to the corresponding role for that event.
    *   *Example:* If 'Design' has 50 XP allocated and 'Functionality' has 100 XP, a high rating in Functionality will contribute more to the overall score and final XP earned than the same rating in Design.
*   **Winner Determination:** The participant or team with the highest weighted average rating is typically declared the winner for that event. Ties might be handled based on specific rules (e.g., highest raw score sum, Organizer decision).
*   **Objectivity:** Participants are expected to provide fair, objective, and constructive ratings based on the defined criteria and the work presented.
`;

const xpContent = `
Experience Points (XP) quantify participation and achievement:

#### XP Roles/Categories
XP is earned and tracked per specific roles/skills defined within the platform, such as:
*   Full Stack Development
*   Presentation / Communication
*   UI/UX Design
*   Project Management / Organization
*   Problem Solving / Algorithm Design
*(The exact roles can be configured)*

#### Earning XP
*   **Participation:** A base amount of XP might be awarded simply for participating and submitting in an event (configuration dependent).
*   **Performance (Ratings):** The primary way to earn XP is through peer ratings. The weighted average rating received directly influences the XP awarded for each relevant role category defined in the event. The higher the rating in criteria linked to a role, the more XP earned for that role.
*   **Winning Bonus:** The declared winner(s) of an event receive a significant flat XP bonus (e.g., +100 XP), often added to one or more relevant role categories or as general XP.

#### XP Calculation & Tracking
*   XP is calculated and awarded after the **Rating Period** is closed for a completed event.
*   XP earned in an event is added to the user's profile under the corresponding roles (\`xpByRole\`).
*   A user's **Total XP** is the sum of all XP across all roles (\`currentUserTotalXp\`).
`;

const portfolioContent = `
Your profile serves as a portfolio showcasing your involvement and achievements:

*   **Project Submissions:** During events, you submit links (e.g., GitHub repo, live demo URL) and descriptions for your projects.
*   **Event History:** Your profile displays a history of events you've participated in, organized, or won.
*   **Project Showcase:** Projects submitted in completed events are listed on your public profile, demonstrating your practical work.
*   **Skills & Roles:** Your profile displays self-declared skills and preferred roles, along with XP earned in different categories.
*   **Portfolio PDF Generation:** You can generate a PDF document summarizing your profile information, including total XP, XP breakdown by role, skills, preferred roles, and a list of your submitted projects from completed events. This serves as a shareable snapshot of your community contributions and achievements.
`;

const leaderboardContent = `
The leaderboard ranks participants based on their contributions:

*   **Ranking Basis:** The primary leaderboard ranks users based on their **Total XP** (the sum of XP across all roles).
*   **Visibility:** Shows the top-performing community members.
*   **Updates:** The leaderboard updates automatically as XP is awarded after events conclude and ratings are finalized.
*   **(Future)** Potential for filtering leaderboards by specific XP roles/categories might be implemented.
`;

const generalContent = `
General guidelines and information for using the platform:

#### Project Links & Submissions
*   Ensure submitted links are publicly accessible (e.g., public GitHub repos, live deployment URLs).
*   Provide clear descriptions of your project.
*   Submissions must be made before the event deadline.

#### Rating Etiquette
*   Rate based *only* on the defined criteria and the work presented. Avoid personal bias.
*   Aim for constructive feedback where possible (though the system might focus primarily on scores).
*   Complete your ratings promptly once the rating period opens.

#### Timelines & Scheduling
*   Organizers and Admins should avoid scheduling events with overlapping active dates/times.
*   Rating periods have defined start (manual by Organizer after cooldown) and end (manual by Organizer) times. Be mindful of these.

#### Code of Conduct
*   All interactions should be respectful and professional.
*   Adhere to any specific Code of Conduct established by the KSB community.
*   Report any violations or concerns to an Administrator.
`;

// Utility function to render markdown content safely
const renderSection = (content) => {
    const rawHtml = marked(content);
    // Sanitize the HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml);
};
</script>

<style scoped>
/* Use Bootstrap variables for consistency */
.card {
    border: 1px solid var(--bs-border-color);
}

.card-header {
    border-bottom: 1px solid var(--bs-border-color);
    padding: 0.75rem 1.25rem; /* Standard Bootstrap padding */
}

.card-header h3 {
    font-size: 1.1rem; /* Slightly smaller header */
    font-weight: 600;
    margin-bottom: 0; /* Remove default margin */
    display: flex; /* Align icon and text */
    align-items: center; /* Align icon and text */
}

.card-body {
    padding: 1.25rem; /* Standard Bootstrap padding */
    color: var(--bs-body-color);
}

/* Enhanced markdown styling using :deep */
:deep(.card-body) {
    line-height: 1.7; /* Improve readability */
}

/* Styling for H4 within rendered markdown */
:deep(.card-body h4) {
    color: var(--bs-heading-color);
    font-weight: 600; /* Bolder sub-headings */
    font-size: 1rem; /* Adjust size */
    margin-top: 1.5rem; /* More space above H4 */
    margin-bottom: 0.75rem;
    /* border-bottom: 1px dashed var(--bs-border-color-translucent); */ /* Optional separator */
    /* padding-bottom: 0.25rem; */
}

/* Styling for lists within rendered markdown */
:deep(.card-body ul) {
    list-style: none; /* Remove default bullets */
    padding-left: 0; /* Remove default padding */
    margin-bottom: 1rem;
}

:deep(.card-body ul li) {
    position: relative;
    padding-left: 1.5rem; /* Indentation for custom bullet */
    margin-bottom: 0.5rem; /* Space between list items */
}

/* Custom bullet points */
:deep(.card-body ul li::before) {
    content: "\f111"; /* Font Awesome solid circle icon */
    font-family: "Font Awesome 5 Free"; /* Ensure Font Awesome is loaded */
    font-weight: 900; /* Use solid style */
    color: var(--bs-primary); /* Use theme primary color */
    position: absolute;
    left: 0;
    top: 0.1em; /* Adjust vertical alignment */
    font-size: 0.6em; /* Smaller bullet size */
}

/* Styling for strong/bold text */
:deep(.card-body strong) {
    color: var(--bs-emphasis-color); /* Use Bootstrap's emphasis color */
    font-weight: 600;
}

/* Ensure no extra margin at the top/bottom of card body */
:deep(.card-body > *:first-child) {
    margin-top: 0;
}

:deep(.card-body > *:last-child) {
    margin-bottom: 0;
}

/* Styling for code blocks (if any used in markdown) */
:deep(.card-body pre) {
    background-color: var(--bs-light);
    padding: 1rem;
    border-radius: var(--bs-border-radius);
    overflow-x: auto;
}

:deep(.card-body code) {
    color: var(--bs-code-color);
    font-size: 0.875em;
    word-wrap: break-word;
}

:deep(.card-body pre code) {
     color: inherit; /* Use parent's color for code within pre */
     font-size: inherit;
     background-color: transparent;
     padding: 0;
     border-radius: 0;
}
</style>