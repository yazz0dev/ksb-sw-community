<template>
    <CContainer maxW="4xl" py="10">
        <CBox>
            <CHeading as="h1" size="2xl" fontWeight="extrabold" color="text-primary" mb="8" pb="3" borderBottomWidth="2px" borderColor="primary">
                Community Transparency & Guidelines
            </CHeading>

            <CStack spacing="8">
                <!-- Community Guidelines Section -->
                <CCard variant="outline" shadow="md">
                    <CCardHeader bg="primary-light" borderBottomWidth="1px" borderColor="primary">
                        <CFlex align="center">
                            <CIcon name="fa-user-shield" mr="3" color="primary-text" />
                            <CHeading size="lg" color="primary-text">Community Guidelines</CHeading>
                        </CFlex>
                    </CCardHeader>
                    <CCardBody>
                        <CProse v-html="renderSection(introductionContent)" />
                    </CCardBody>
                </CCard>

                <!-- Roles Section -->
                <CCard variant="outline" shadow="md">
                    <CCardHeader bg="primary-light" borderBottomWidth="1px" borderColor="primary">
                        <CFlex align="center">
                            <CIcon name="fa-users" mr="3" color="primary-text" />
                            <CHeading size="lg" color="primary-text">Community Roles</CHeading>
                        </CFlex>
                    </CCardHeader>
                    <CCardBody>
                        <CProse v-html="renderSection(rolesContent)" />
                    </CCardBody>
                </CCard>

                <!-- Event System Section -->
                <CCard variant="outline" shadow="md">
                    <CCardHeader bg="primary-light" borderBottomWidth="1px" borderColor="primary">
                        <CFlex align="center">
                            <CIcon name="fa-tasks" mr="3" color="primary-text" />
                            <CHeading size="lg" color="primary-text">Event System</CHeading>
                        </CFlex>
                    </CCardHeader>
                    <CCardBody>
                        <CProse v-html="renderSection(eventLifecycleContent)" />
                    </CCardBody>
                </CCard>

                <!-- Rating & XP System Section -->
                <CCard variant="outline" shadow="md">
                    <CCardHeader bg="primary-light" borderBottomWidth="1px" borderColor="primary">
                        <CFlex align="center">
                            <CIcon name="fa-star" mr="3" color="primary-text" />
                            <CHeading size="lg" color="primary-text">Rating & XP System</CHeading>
                        </CFlex>
                    </CCardHeader>
                    <CCardBody>
                        <CProse v-html="renderSection(ratingContent)" />
                        <CDivider my="6" />
                        <CProse v-html="renderSection(xpContent)" />
                    </CCardBody>
                </CCard>

                <!-- General Guidelines Section -->
                <CCard variant="outline" shadow="md">
                    <CCardHeader bg="primary-light" borderBottomWidth="1px" borderColor="primary">
                        <CFlex align="center">
                            <CIcon name="fa-book" mr="3" color="primary-text" />
                            <CHeading size="lg" color="primary-text">General Guidelines</CHeading>
                        </CFlex>
                    </CCardHeader>
                    <CCardBody>
                        <CProse v-html="renderSection(generalContent)" />
                    </CCardBody>
                </CCard>
            </CStack>
        </CBox>
    </CContainer>
</template>

<script setup>
import { ref } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
    Container as CContainer,
    Box as CBox,
    Heading as CHeading,
    Stack as CStack,
    Card as CCard,
    CardHeader as CCardHeader,
    CardBody as CCardBody,
    Flex as CFlex,
    Icon as CIcon,
    Divider as CDivider,
    Box as CProse
} from '@chakra-ui/vue-next';

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

const introductionContent = `
## Welcome to KSB Tech Community

Our community is dedicated to fostering collaboration, learning, and growth among MCA students through hands-on software development projects and events. This transparency page outlines our community structure, guidelines, and processes.

### Our Mission
- 💡 Create opportunities for practical software development experience
- 🤝 Encourage peer learning and mentorship
- 📁 Build a portfolio of real-world projects
- 🚀 Develop professional and technical skills`;

const rolesContent = `
## Community Roles

### 🎓 Students
- Participate in events and projects
- Request and organize events
- Submit project work
- Provide peer feedback and ratings
- Earn XP and build portfolios

### 🧑‍🏫 Team Leaders
- Guide team members during events
- Facilitate team communication
- Ensure project deliverables
- Help resolve team challenges

### 🗓️ Organizers
- Plan and manage events
- Set up project requirements
- Monitor team progress
- Provide technical support
- Evaluate submissions

### 🛡️ Administrators
- Oversee community operations
- Review and approve event requests
- Manage user roles and permissions
- Ensure platform functionality
- Maintain community guidelines`;

const eventLifecycleContent = `
## Event Lifecycle

### 1️⃣ Event Creation
- 🙋 Students can request events
- ✅ Admins review and approve requests
- 📝 Event details are finalized

### 2️⃣ Registration
- 👤 Solo or 👥 team participation options
- 🤝 Team formation process
- 🏷️ Role assignments

### 3️⃣ Active Phase
- 💻 Project development period
- 📊 Regular progress updates
- 💬 Collaboration opportunities
- 🆘 Technical support available

### 4️⃣ Completion
- 🎉 Project submissions
- ⭐ Peer evaluations
- ✨ XP distribution
- 🏆 Results announcement`;

const ratingContent = `
## Rating System

### ⭐ Rating Criteria
- 💻 Technical implementation
- 🎤 Project presentation
- ✨ Code quality
- 📄 Documentation
- 🤝 Team collaboration

### 📝 Rating Process
- Peer evaluations after completion
- Rating scale of 1-5 stars
- Multiple rating categories
- Anonymous feedback system

### 👍 Rating Guidelines
- Be objective and fair
- Provide constructive feedback
- Rate based on defined criteria
- Consider team/individual effort`;

const xpContent = `
## Experience Points (XP) System

### ✨ Earning XP
- Event participation: 1-2 XP
- Project completion: 5-20 XP
- High ratings: Bonus XP
- Team leadership: Extra XP
- Event organization: 10-50 XP

### 🏷️ XP Categories
- Fullstack Development
- Frontend Design
- Backend Implementation
- Project Management
- Team Collaboration

### 🚀 Level System
- Levels based on total XP
- Role-specific progression
- Special badges for achievements
- XP decay prevention system`;

const generalContent = `
## General Guidelines

### 📜 Code of Conduct
- Professional behavior expected
- Respect for all members
- Academic integrity
- Collaborative spirit

### 💬 Communication
- Clear and timely communication
- Appropriate channel usage
- Professional language
- Constructive feedback

### 🙋 Participation
- Regular engagement encouraged
- Meeting attendance
- Deadline adherence
- Active contribution

### 🆘 Support
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
