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
This page outlines how our KSB MCA Software Community platform operates, providing transparency about event management, XP allocation, ratings, and participation tracking. Understanding these mechanics helps members participate effectively and track their growth in the community.
`;

const rolesContent = `
*   **Student:**
    * View and participate in events
    * Submit one event request at a time (pending/approved)
    * Submit projects during 'In Progress' events
    * Rate other participants/teams in completed events
    * Manage profile (skills, preferred roles)
    * Generate PDF portfolio
    * Leave upcoming/approved events
    * View public profiles and leaderboard
*   **Admin:**
    * Create events directly (auto-approved)
    * Manage event requests (approve/reject)
    * Manage event lifecycle and status
    * Toggle ratings availability
    * Calculate/set winners
    * Manage teams and event details
    * View all platform data
`;

const eventLifecycleContent = `
1.  **Event States:**
    * **Pending:** Initial state for student requests
    * **Approved:** Scheduled but not yet started
    * **In Progress:** Active event accepting submissions
    * **Completed:** Finished events open for ratings
    * **Cancelled:** Terminated events
    * **Rejected:** Declined requests

2.  **Event Creation:**
    * **Student Request:** Uses request form with desired dates
    * **Admin Creation:** Direct creation with immediate approval
    * **Required Fields:** Name, type, description, dates
    * **Optional:** Team format, co-organizers, rating criteria

3.  **Status Transitions:**
    * Pending → Approved/Rejected (Admin action)
    * Approved → In Progress (At start date)
    * In Progress → Completed (At end date)
    * Approved/In Progress → Cancelled (Admin action)
`;

const teamsContent = `
*   **Team Event Features:**
    * Available when event is marked as "team event"
    * Teams can be managed by admins/organizers
    * Students limited to one team per event
    * Team composition can be modified until event starts
    * Team submissions handled collectively
    * Team ratings applied to all members equally

*   **Team Management:**
    * Create/Edit team names
    * Add/Remove team members
    * View team submissions
    * Track team participation
`;

const ratingContent = `
*   **Rating System:**
    * Available for completed events only
    * Must be enabled by admin/organizer
    * Self-rating not allowed
    * Rating constraints customizable per event
    * Default criteria:
      * Design (Implementation quality)
      * Presentation (Communication)
      * Problem Solving (Solution approach)
      * Execution (Completeness)
      * Technology (Tool usage)
    * Scale: 1-5 stars per criterion
    * Final score: Weighted average of criteria
`;

const xpContent = `
*   **XP Calculation:**
    * Triggered automatically on:
      * Event completion
      * Winner updates
      * Rating submissions
    
*   **Base XP Formula:**
    * Regular Participant: Rating Score × 10
    * Event Winner: Base XP + 100 bonus
    
*   **Role Categories:**
    * Fullstack Development
    * Presentation Skills
    * Design Expertise
    * Organization Ability
    * Problem Solving
    
*   **Distribution:**
    * XP split across relevant role categories
    * Categories determined by event constraints
    * Equal distribution if no specific allocation
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