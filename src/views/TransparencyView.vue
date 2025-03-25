// /src/views/TransparencyView.vue
<template>
    <div class="container">
      <div v-html="renderedMarkdown"></div>
    </div>
  </template>

  <script>
  import {  computed } from 'vue';
  import { marked } from 'marked';

  export default {
    setup() {
      // Hardcoded Markdown content about project/community transparency
      const content = `
  # Transparency in Our Community

  This page outlines how our community and projects operate, emphasizing transparency in decision-making, resource allocation, and overall processes.

  ## Project Governance

  ### Decision-Making Process

  *   **Proposals:** New projects or significant changes to existing projects start with a proposal.  Proposals should clearly outline the goals, scope, resources required, and expected impact.
  *   **Community Feedback:** Proposals are shared with the community for feedback and discussion.  We use [mention your platform, e.g., GitHub Discussions, a dedicated forum, etc.] for this purpose.
  *   **Voting (if applicable):** For major decisions, a voting process may be used.  Voting rules (who can vote, what constitutes a majority, etc.) are clearly defined in advance.
  *   **Teacher Approval:** Final approval for project proposals rests with the teaching staff, who ensure alignment with course objectives and resource availability.
  *   **Documentation:** All decisions, along with the rationale behind them, are documented publicly [link to your documentation, e.g., on a wiki, in GitHub Issues, etc.].

  ### Roles and Responsibilities

  *   **Students:**  Students are responsible for proposing, developing, and presenting projects.  They are expected to collaborate effectively and contribute to the community.
  *   **Teachers:** Teachers provide guidance, mentorship, and oversight.  They evaluate project proposals, provide feedback, and assess student performance.
  *   **Community Members (if applicable):**  External community members (e.g., alumni, industry professionals) may participate by providing feedback, mentorship, or resources.

  ## Resource Management

  ### Resource Allocation

  *   **Requests:**  Requests for resources (e.g., software licenses, cloud credits, hardware) are made through [describe the process, e.g., a form, a dedicated channel].
  *   **Justification:**  Requests must include a clear justification for the resources needed and how they will contribute to the project's success.
  *   **Transparency:**  Information about resource availability and allocation decisions is made publicly available [link to relevant information].

  ### Code of Conduct
  *   **Ethical behavior:** The community upholds high standards of ethical conduct in all project activities.
  *  **Contribution guidelines:** All contributors are expected to read and follow contribution guidelines.

  ## Communication

  *   **Regular Updates:** Project teams provide regular updates on their progress, challenges, and any changes to the original proposal.
  *   **Open Communication Channels:**  We maintain open communication channels [list your channels, e.g., Discord, Slack, email lists] for questions, feedback, and general discussion.
  *   **Meeting Minutes (if applicable):**  Minutes from any project meetings are made publicly available [link to minutes].

  ## Event Organization

  *   **Event Proposals:**  Proposals for new events follow a similar process to project proposals, with clear goals, target audience, budget, and logistical details.
  *   **Team Formation:**  Information about team formation (how teams are formed, how members are selected) is clearly communicated.
  *   **Evaluation Criteria:**  The criteria used to evaluate projects and events are published in advance.
  *   **Feedback Mechanisms:**  We provide mechanisms for participants to provide feedback on events, which is used to improve future events.

  ## Data and Privacy

  *   **Data Collection:**  We clearly state what data we collect, why we collect it, and how we use it.  We comply with all relevant data privacy regulations.
  *   **Data Security:**  We take appropriate measures to protect the security of any data we collect.

  ## Conflict Resolution

  *   **Reporting:**  Any conflicts or disagreements should be reported to [specify who to report to, e.g., the teaching staff, a designated mediator].
  *   **Mediation:**  We strive to resolve conflicts through mediation and open communication.
  * **Escalation (if necessary):** If mediation is unsuccessful, a clear escalation path is defined.
      `;

      const renderedMarkdown = computed(() => {
        return marked(content);
      });

      return {
        renderedMarkdown,
      };
    },
  };
  </script>