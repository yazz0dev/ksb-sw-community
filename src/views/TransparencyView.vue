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
*   **Student:** Can view events, request new events (limit one active/pending request), participate in events (leave upcoming events), submit projects (during 'In Progress' events), rate participants/teams in completed events, manage their profile (skills, preferred roles), view leaderboards, view public profiles, and generate a PDF portfolio.
*   **Admin:** Have all student permissions plus:
    *   Can create events directly (auto-approved).
    *   Can manage pending event requests (approve/reject).
    *   Can manage event lifecycle (update status, manage teams, toggle ratings, calculate/set winners).
    *   Can edit event details and teams at any stage.
    *   Admin accounts do not have personal profiles and are excluded from the leaderboard.
`;

const eventLifecycleContent = `
1.  **Event Creation:**
    * **Student Request:** Use "Request Event" form. One pending request limit per student.
    * **Admin Creation:** Direct creation with "Create Event" form, auto-approved.
    * Required: name, type, description, dates. Optional: team format, co-organizers, rating criteria.

2.  **Event Status Flow:**
    * Pending (Student Request) -> Approved/Rejected (Admin Review)
    * Approved -> In Progress (Auto-allowed on start date)
    * In Progress -> Completed (Auto-allowed on end date)
    * Upcoming/In Progress can be Cancelled

3.  **Key Features by Status:**
    * **Upcoming:** Team management, participants can leave
    * **In Progress:** Project submissions allowed (one per participant/team)
    * **Completed:** Rating system opens (manual toggle), winner calculation
`;

const teamsContent = `
*   Only available for events marked as "team event"
*   Managed via "Manage Teams" component by organizers/admins
*   Features:
    * Add/Edit/Remove teams
    * Assign/Remove team members
    * Student can only be in one team per event
    * Team submissions handled as unit
`;

const ratingContent = `
*   **Availability:** For completed events with ratings toggle enabled
*   **Access:** Any authenticated user except self-rating
*   **Rating Criteria:**
    * Design
    * Presentation
    * Problem Solving
    * Execution
    * Technology
*   **Scale:** 1-5 stars per criterion
*   **Final Score:** Weighted average (0-5) of all criteria ratings
`;

const xpContent = `
*   **Calculation Trigger:** Automatic on event completion or winner updates
*   **XP Formula:**
    * Base XP = Average Rating Score (0-5) × 10
    * Winner Bonus = +100 XP
*   **Role Distribution:**
    * Total XP split equally across role categories:
      * Fullstack
      * Presenter
      * Designer
      * Organizer
      * Problem Solver
*   **Profile Display:** Shows total XP and per-role breakdown
`;

const portfolioContent = `
*   **Project Tracking:**
    * Automatic collection from event submissions
    * Shows in user profiles (own and public view)
    * Includes team and individual submissions
*   **PDF Generation:**
    * Available on user's own profile
    * Includes:
      * Personal Info & Skills
      * XP Summary & Breakdown
      * Event Project History
      * Submission Links
`;

const leaderboardContent = `
*   **Rankings:**
    * Overall Score (Total XP)
    * Role-specific Rankings
*   **Features:**
    * Excludes Admin accounts
    * Real-time updates with XP changes
    * Sortable by different XP categories
`;

const generalContent = `
*   **Platform Purpose:** Manage KSB MCA software community events and track contributions
*   **Access:** Authentication required for most features
*   **Data Management:** 
    * Stores event participation, submissions, ratings
    * Automatic XP calculations and updates
    * Public profiles show verified achievements only
*   **Updates:** Features and rules may be adjusted based on community needs
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