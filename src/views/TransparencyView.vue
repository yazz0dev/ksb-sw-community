<template>
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-3xl font-bold text-text-primary mb-6 pb-2 border-b border-border">Community Transparency & Guidelines</h1>

        <div class="space-y-6">
            <!-- Community Guidelines -->
            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-user-shield h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Community Guidelines</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(introductionContent)"></div>
            </div>

            <!-- Roles Section - Now Visible to All -->
            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-users h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Community Roles</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(rolesContent)"></div>
            </div>

            <!-- Add other sections -->
            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-tasks h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Event System</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed" v-html="renderSection(eventLifecycleContent)"></div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-star h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">Rating & XP System</h2>
                </div>
                <div class="p-5 prose prose-sm max-w-none text-text-secondary leading-relaxed">
                    <div v-html="renderSection(ratingContent)"></div>
                    <div class="mt-6" v-html="renderSection(xpContent)"></div>
                </div>
            </div>

            <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                <div class="px-5 py-4 bg-primary-extraLight border-b border-primary-light flex items-center">
                    <i class="fas fa-book h-5 w-5 mr-3 text-primary-dark"></i>
                    <h2 class="text-lg font-semibold text-primary-dark">General Guidelines</h2>
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
## Welcome to KSB MCA S/W Community

Our community is dedicated to fostering collaboration, learning, and growth among MCA students through hands-on software development projects and events. This transparency page outlines our community structure, guidelines, and processes.

### Our Mission
- Create opportunities for practical software development experience
- Encourage peer learning and mentorship
- Build a portfolio of real-world projects
- Develop professional and technical skills`;

const rolesContent = `
## Community Roles

### Students
- Participate in events and projects
- Request and organize events
- Submit project work
- Provide peer feedback and ratings
- Earn XP and build portfolios

### Team Leaders
- Guide team members during events
- Facilitate team communication
- Ensure project deliverables
- Help resolve team challenges

### Organizers
- Plan and manage events
- Set up project requirements
- Monitor team progress
- Provide technical support
- Evaluate submissions

### Administrators
- Oversee community operations
- Review and approve event requests
- Manage user roles and permissions
- Ensure platform functionality
- Maintain community guidelines`;

const eventLifecycleContent = `
## Event Lifecycle

### 1. Event Creation
- Students can request events
- Admins review and approve requests
- Event details are finalized

### 2. Registration
- Solo or team participation options
- Team formation process
- Role assignments

### 3. Active Phase
- Project development period
- Regular progress updates
- Collaboration opportunities
- Technical support available

### 4. Completion
- Project submissions
- Peer evaluations
- XP distribution
- Results announcement`;

const teamsContent = `
## Team Formation & Collaboration

### Team Structure
- Teams typically consist of 2-5 members
- Each team has a designated team leader
- Members can have specific role assignments
- Balanced skill distribution encouraged

### Formation Process
- Self-organized teams allowed
- Random team assignment available
- Team changes require admin approval
- Maximum team size varies by event type

### Collaboration Guidelines
- Regular team meetings recommended
- Use provided collaboration tools
- Document contributions clearly
- Share knowledge within team`;

const ratingContent = `
## Rating System

### Rating Criteria
- Technical implementation
- Project presentation
- Code quality
- Documentation
- Team collaboration

### Rating Process
- Peer evaluations after completion
- Rating scale of 1-5 stars
- Multiple rating categories
- Anonymous feedback system

### Rating Guidelines
- Be objective and fair
- Provide constructive feedback
- Rate based on defined criteria
- Consider team/individual effort`;

const xpContent = `
## Experience Points (XP) System

### Earning XP
- Event participation: 1-2 XP
- Project completion: 5-20 XP
- High ratings: Bonus XP
- Team leadership: Extra XP
- Event organization: 10-50 XP

### XP Categories
- Fullstack Development
- Frontend Design
- Backend Implementation
- Project Management
- Team Collaboration

### Level System
- Levels based on total XP
- Role-specific progression
- Special badges for achievements
- XP decay prevention system`;

const portfolioContent = `
## Portfolio Development

### Project Documentation
- Technical specifications
- Role and contributions
- Technologies used
- Project outcomes

### Portfolio Features
- Automatic project tracking
- XP progress visualization
- Skills assessment
- Achievement badges

### Visibility Options
- Public/private settings
- Customizable layout
- Project highlights
- Team acknowledgments`;

const leaderboardContent = `
## Leaderboard System

### Rankings
- Overall XP ranking
- Role-specific rankings
- Monthly top performers
- Team achievements

### Scoring Factors
- Event participation
- Project ratings
- Contribution quality
- Leadership points

### Recognition
- Top performer badges
- Role specialist titles
- Achievement milestones
- Special mentions`;

const generalContent = `
## General Guidelines

### Code of Conduct
- Professional behavior expected
- Respect for all members
- Academic integrity
- Collaborative spirit

### Communication
- Clear and timely communication
- Appropriate channel usage
- Professional language
- Constructive feedback

### Participation
- Regular engagement encouraged
- Meeting attendance
- Deadline adherence
- Active contribution

### Support
- Technical assistance available
- Mentorship opportunities
- Resource access
- Issue resolution process`;

// Utility function to render markdown content safely
const renderSection = (content) => {
    const rawHtml = marked(content);
    // Sanitize the HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml);
};
</script>