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
import { ref } from 'vue';
import { marked } from 'marked';

const introductionContent = `
### Welcome to Our Community

This platform is designed to foster collaboration, learning, and growth within our software development community. We believe in transparency and fair recognition of contributions.
`;

const rolesContent = `
### Community Roles & Permissions

#### Student
- Can participate in events
- Can join or leave teams
- Can submit projects
- Can rate other participants' work
- Earns XP through participation and achievements

#### Event Organizer
- Can create and manage events
- Can form and manage teams
- Can open/close rating periods
- Responsible for event execution and fairness

#### Administrator
- Full system management capabilities
- Can approve or reject event requests
- Can manage all events and users
- Oversees community guidelines
`;

const eventLifecycleContent = `
### Event Lifecycle

1. **Request/Creation**
   - Students can request events
   - Admins can directly create events
   - Requires event details, dates, and XP allocation

2. **Approval Process**
   - Admin reviews event requests
   - Checks for date conflicts
   - Verifies XP allocation and roles

3. **Event States**
   - **Pending**: Awaiting admin approval
   - **Approved**: Ready to begin
   - **In Progress**: Event is running
   - **Completed**: Event has ended
   - **Cancelled**: Event terminated early

4. **Rating Phase**
   - Opens after event completion
   - 30-minute cooldown period
   - Can be opened maximum twice
   - Participants rate based on defined criteria
`;

const teamsContent = `
### Team Management

- Events can be individual or team-based
- Teams have unique names and member lists
- Team size is flexible based on event needs
- Members can submit projects as a team
- Teams receive collective ratings
`;

const ratingContent = `
### Rating System

- Rating period opens after event completion
- Based on predefined criteria per role
- Scores range from 0-5 for each criterion
- Criteria linked to specific roles (e.g., Design, Problem Solving)
- Winner selection based on average scores
- Automatic winner calculation available after sufficient ratings
`;

const xpContent = `
### Experience Points (XP) System

#### XP Categories
- Full Stack Development
- Presentation
- Design
- Organization
- Problem Solving

#### XP Earning Methods
- Event participation
- High ratings from peers
- Winner bonus (+100 XP)
- Points distributed based on event criteria

#### XP Calculation
- Base XP from average ratings
- Multiplied by role-specific points
- Winner bonus added if applicable
- XP updates after event completion
`;

const portfolioContent = `
### Portfolio & Projects

- Submit project links and descriptions
- Projects linked to specific events
- Visible on public profiles
- Showcases skills and achievements
- Helps track community contributions
`;

const leaderboardContent = `
### Leaderboard System

- Overall and role-specific rankings
- Based on total XP earned
- Filtered by different roles
- Updates automatically after events
- Shows top performers in each category
`;

const generalContent = `
### Additional Information

#### Project Links
- All project submissions must include valid URLs
- Links should point to accessible resources
- GitHub repositories or live demos preferred

#### Rating Guidelines
- Rate objectively based on criteria
- Consider quality and completion
- Provide fair assessments
- Ratings affect XP distribution

#### Timeline Management
- Events cannot overlap
- Minimum one-day duration
- Rating periods have cooldown periods
- Automatic status transitions based on dates
`;

// Utility function to render markdown content
const renderSection = (content) => {
    return marked(content);
};
</script>

<style scoped>
.transparency-content .card-header {
    background: var(--color-background-soft);
    border-bottom: 1px solid var(--color-border);
}

.transparency-content .card-header h3 { 
    font-size: 1.15rem;
    color: var(--color-heading);
    font-weight: 600;
}

.transparency-content .card-body { 
    color: var(--color-text-secondary);
    padding: var(--space-5);
}

/* Enhanced markdown styling */
:deep(.card-body) {
    line-height: 1.6;
}

:deep(.card-body h3) {
    color: var(--color-heading);
    font-weight: 600;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-2);
}

:deep(.card-body h4) {
    color: var(--color-text);
    font-weight: 500;
    margin-top: var(--space-4);
}

:deep(.card-body ul) {
    list-style-type: none;
    padding-left: 0;
}

:deep(.card-body ul li) {
    position: relative;
    padding-left: var(--space-5);
    margin-bottom: var(--space-2);
}

:deep(.card-body ul li::before) {
    content: "•";
    color: var(--color-primary);
    position: absolute;
    left: var(--space-2);
}

:deep(.card-body strong) {
    color: var(--color-text);
    font-weight: 600;
}

:deep(.card-body > *:first-child) {
    margin-top: 0;
}

:deep(.card-body > *:last-child) {
    margin-bottom: 0;
}
</style>