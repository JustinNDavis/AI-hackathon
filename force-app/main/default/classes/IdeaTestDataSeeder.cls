/**
 * Run from Execute Anonymous to seed test ideas and votes.
 * Execute: IdeaTestDataSeeder.seed();
 *
 * Report-ready data: varied Status, Improvement_Type, Visibility, Customer_Impact,
 * vote counts, and Closed_Date for Implemented/Not Pursued ideas.
 */
public with sharing class IdeaTestDataSeeder {

    public static void seed() {
        Id userId = UserInfo.getUserId();
        Date today = Date.today();

        List<Idea__c> ideas = new List<Idea__c>{
            new Idea__c(
                Title__c = 'Improve search with filters',
                Description__c = 'Add filter options to the global search so users can narrow results by type and date.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Faster discovery of relevant content',
                Tags__c = 'search;ux'
            ),
            new Idea__c(
                Title__c = 'Streamline approval workflow',
                Description__c = 'Reduce the number of approval steps for standard requests to speed up processing.',
                Visibility__c = 'Open',
                Status__c = 'Under Review',
                Owner__c = userId,
                Improvement_Type__c = 'Process',
                Customer_Impact__c = 'Faster turnaround for customers',
                Tags__c = 'process;approval'
            ),
            new Idea__c(
                Title__c = 'Mobile app dark mode',
                Description__c = 'Add a dark mode option to the mobile app for better usability in low light.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Improved accessibility and battery life',
                Tags__c = 'mobile;ux'
            ),
            new Idea__c(
                Title__c = 'Weekly digest email',
                Description__c = 'Send a weekly summary email with key updates and action items for each user.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Better awareness of changes',
                Tags__c = 'email;communication'
            ),
            new Idea__c(
                Title__c = 'Flexible PTO policy',
                Description__c = 'Allow employees to take partial days and carry over unused PTO with limits.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Policy',
                Customer_Impact__c = 'Improved work-life balance',
                Tags__c = 'policy;hr'
            ),
            new Idea__c(
                Title__c = 'Dashboard customization',
                Description__c = 'Let users customize their home dashboard with widgets and layout options.',
                Visibility__c = 'Open',
                Status__c = 'In Progress',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Personalized experience',
                Tags__c = 'dashboard;ux'
            ),
            new Idea__c(
                Title__c = 'SSO for partner portal',
                Description__c = 'Enable single sign-on for external partners to reduce login friction and improve security.',
                Visibility__c = 'Open',
                Status__c = 'Implemented',
                Owner__c = userId,
                Improvement_Type__c = 'Digital;Process',
                Customer_Impact__c = 'Reduced support tickets and faster partner onboarding',
                Tags__c = 'sso;security;partners',
                Closed_Date__c = today.addDays(-45),
                Resolution_Notes__c = 'Deployed Okta integration in Q1.'
            ),
            new Idea__c(
                Title__c = 'Automated invoice reminders',
                Description__c = 'Send automated email reminders for overdue invoices with configurable schedules.',
                Visibility__c = 'Open',
                Status__c = 'Implemented',
                Owner__c = userId,
                Improvement_Type__c = 'Digital;Process',
                Customer_Impact__c = 'Improved cash flow and fewer manual follow-ups',
                Tags__c = 'billing;automation',
                Closed_Date__c = today.addDays(-30),
                Resolution_Notes__c = 'Flow-based solution live in production.'
            ),
            new Idea__c(
                Title__c = 'Remote work equipment stipend',
                Description__c = 'Provide annual stipend for home office equipment to support remote employees.',
                Visibility__c = 'Open',
                Status__c = 'Implemented',
                Owner__c = userId,
                Improvement_Type__c = 'Policy',
                Customer_Impact__c = 'Higher productivity and retention',
                Tags__c = 'policy;remote;hr',
                Closed_Date__c = today.addDays(-60),
                Resolution_Notes__c = 'Policy approved; $500 annual stipend.'
            ),
            new Idea__c(
                Title__c = 'API rate limit increase',
                Description__c = 'Increase API rate limits for enterprise tier to support high-volume integrations.',
                Visibility__c = 'Open',
                Status__c = 'In Progress',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Fewer integration failures and better scalability',
                Tags__c = 'api;enterprise'
            ),
            new Idea__c(
                Title__c = 'Bulk export to Excel',
                Description__c = 'Add one-click export of list views to Excel with formatting preserved.',
                Visibility__c = 'Open',
                Status__c = 'Under Review',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Faster reporting and data sharing',
                Tags__c = 'export;reporting'
            ),
            new Idea__c(
                Title__c = 'Customer feedback widget',
                Description__c = 'Embed a feedback widget on key pages to capture NPS and comments in context.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Higher response rates and actionable insights',
                Tags__c = 'feedback;nps;ux'
            ),
            new Idea__c(
                Title__c = 'Expense report auto-categorization',
                Description__c = 'Use AI to suggest expense categories based on receipt text and merchant.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital;Process',
                Customer_Impact__c = 'Faster expense submission and fewer errors',
                Tags__c = 'expense;ai;automation'
            ),
            new Idea__c(
                Title__c = 'Mandatory security training',
                Description__c = 'Require annual security awareness training for all employees with tracking.',
                Visibility__c = 'Open',
                Status__c = 'Implemented',
                Owner__c = userId,
                Improvement_Type__c = 'Policy;Process',
                Customer_Impact__c = 'Reduced phishing incidents and compliance readiness',
                Tags__c = 'security;training;compliance',
                Closed_Date__c = today.addDays(-90),
                Resolution_Notes__c = 'LMS integration complete; 98% completion rate.'
            ),
            new Idea__c(
                Title__c = 'Slack integration for alerts',
                Description__c = 'Send critical system alerts and approval requests to Slack channels.',
                Visibility__c = 'Open',
                Status__c = 'In Progress',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Faster incident response and approvals',
                Tags__c = 'slack;integrations;alerts'
            ),
            new Idea__c(
                Title__c = 'Self-service password reset',
                Description__c = 'Allow users to reset passwords via email/SMS without calling support.',
                Visibility__c = 'Open',
                Status__c = 'Implemented',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = '50% reduction in password-related support tickets',
                Tags__c = 'auth;self-service',
                Closed_Date__c = today.addDays(-120),
                Resolution_Notes__c = 'Azure AD self-service enabled.'
            ),
            new Idea__c(
                Title__c = 'Four-day work week pilot',
                Description__c = 'Pilot a compressed work week for eligible teams to improve work-life balance.',
                Visibility__c = 'Private',
                Status__c = 'Not Pursued',
                Owner__c = userId,
                Improvement_Type__c = 'Policy',
                Customer_Impact__c = 'Potential retention and productivity gains',
                Tags__c = 'policy;hr;work-life',
                Closed_Date__c = today.addDays(-15),
                Resolution_Notes__c = 'Deferred; revisit after headcount stabilizes.'
            ),
            new Idea__c(
                Title__c = 'Legacy system sunset',
                Description__c = 'Retire the legacy CRM module and migrate remaining users to the new platform.',
                Visibility__c = 'Open',
                Status__c = 'Under Review',
                Owner__c = userId,
                Improvement_Type__c = 'Digital;Process',
                Customer_Impact__c = 'Lower maintenance cost and unified experience',
                Tags__c = 'migration;legacy'
            ),
            new Idea__c(
                Title__c = 'Contract template library',
                Description__c = 'Centralize approved contract templates with version control and e-sign.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital;Process',
                Customer_Impact__c = 'Faster deal closure and legal consistency',
                Tags__c = 'contracts;legal;templates'
            ),
            new Idea__c(
                Title__c = 'Onboarding checklist automation',
                Description__c = 'Auto-create and track onboarding tasks for new hires based on role and department.',
                Visibility__c = 'Open',
                Status__c = 'Under Review',
                Owner__c = userId,
                Improvement_Type__c = 'Process;Digital',
                Customer_Impact__c = 'Consistent onboarding and faster time-to-productivity',
                Tags__c = 'onboarding;hr;automation'
            ),
            new Idea__c(
                Title__c = 'Multi-currency support',
                Description__c = 'Support multiple currencies in quotes and invoices for global customers.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Expanded international sales and fewer manual conversions',
                Tags__c = 'billing;international'
            ),
            new Idea__c(
                Title__c = 'Document versioning',
                Description__c = 'Track document versions with diff view and rollback for key files.',
                Visibility__c = 'Open',
                Status__c = 'In Progress',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Reduced confusion and audit trail',
                Tags__c = 'documents;versioning'
            ),
            new Idea__c(
                Title__c = 'Pet-friendly office policy',
                Description__c = 'Allow well-behaved pets in designated office areas on certain days.',
                Visibility__c = 'Creator Selected',
                Status__c = 'Not Pursued',
                Owner__c = userId,
                Improvement_Type__c = 'Policy',
                Customer_Impact__c = 'Improved morale for pet owners',
                Tags__c = 'policy;office;culture',
                Closed_Date__c = today.addDays(-20),
                Resolution_Notes__c = 'Allergy and liability concerns; not feasible.'
            ),
            new Idea__c(
                Title__c = 'In-app help center',
                Description__c = 'Embed contextual help articles and videos directly in the product UI.',
                Visibility__c = 'Open',
                Status__c = 'Under Review',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Lower support volume and better adoption',
                Tags__c = 'help;documentation;ux'
            ),
            new Idea__c(
                Title__c = 'Quarterly innovation hackathon',
                Description__c = 'Host quarterly hackathons for employees to prototype new ideas.',
                Visibility__c = 'Open',
                Status__c = 'Implemented',
                Owner__c = userId,
                Improvement_Type__c = 'Process;Policy',
                Customer_Impact__c = 'Increased innovation and cross-team collaboration',
                Tags__c = 'culture;innovation;events',
                Closed_Date__c = today.addDays(-75),
                Resolution_Notes__c = 'First hackathon held; 12 projects submitted.'
            ),
            new Idea__c(
                Title__c = 'Role-based dashboard defaults',
                Description__c = 'Pre-configure dashboard layouts by role (Sales, Support, Marketing) for faster onboarding.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Reduced setup time for new users',
                Tags__c = 'dashboard;roles;ux'
            ),
            new Idea__c(
                Title__c = 'Meeting-free Fridays',
                Description__c = 'Reserve Fridays for deep work by limiting internal meetings to mornings only.',
                Visibility__c = 'Open',
                Status__c = 'Under Review',
                Owner__c = userId,
                Improvement_Type__c = 'Policy',
                Customer_Impact__c = 'More focus time and reduced meeting fatigue',
                Tags__c = 'policy;productivity;meetings'
            ),
            new Idea__c(
                Title__c = 'Audit log export',
                Description__c = 'Allow admins to export audit logs for compliance and security reviews.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Easier compliance audits and incident investigation',
                Tags__c = 'audit;compliance;security'
            ),
            new Idea__c(
                Title__c = 'Keyboard shortcuts',
                Description__c = 'Add keyboard shortcuts for power users to navigate and act without mouse.',
                Visibility__c = 'Open',
                Status__c = 'In Progress',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Faster workflows for heavy users',
                Tags__c = 'ux;accessibility;productivity'
            ),
            new Idea__c(
                Title__c = 'Vendor evaluation scorecard',
                Description__c = 'Standardize vendor evaluation with weighted scorecards and historical tracking.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Process',
                Customer_Impact__c = 'Data-driven vendor decisions and risk reduction',
                Tags__c = 'procurement;process'
            ),
            new Idea__c(
                Title__c = 'Green office initiative',
                Description__c = 'Reduce office waste with recycling programs, LED lighting, and paperless defaults.',
                Visibility__c = 'Open',
                Status__c = 'Implemented',
                Owner__c = userId,
                Improvement_Type__c = 'Policy;Process',
                Customer_Impact__c = 'Lower carbon footprint and cost savings',
                Tags__c = 'sustainability;policy',
                Closed_Date__c = today.addDays(-100),
                Resolution_Notes__c = 'Phase 1 complete; 30% reduction in paper use.'
            ),
            new Idea__c(
                Title__c = 'Mobile offline mode',
                Description__c = 'Allow mobile app to work offline for key tasks and sync when back online.',
                Visibility__c = 'Open',
                Status__c = 'Under Review',
                Owner__c = userId,
                Improvement_Type__c = 'Digital',
                Customer_Impact__c = 'Usability in low-connectivity environments',
                Tags__c = 'mobile;offline;sync'
            ),
            new Idea__c(
                Title__c = 'Mentorship program',
                Description__c = 'Formalize mentorship matching for new hires and career development.',
                Visibility__c = 'Open',
                Status__c = 'Submitted',
                Owner__c = userId,
                Improvement_Type__c = 'Policy;Process',
                Customer_Impact__c = 'Higher retention and faster skill development',
                Tags__c = 'hr;mentorship;culture'
            )
        };
        insert ideas;

        List<Idea_Vote__c> votes = new List<Idea_Vote__c>();
        votes.add(new Idea_Vote__c(Idea__c = ideas[0].Id, Voter__c = userId));
        votes.add(new Idea_Vote__c(Idea__c = ideas[0].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[0].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[1].Id, Voter__c = userId));
        votes.add(new Idea_Vote__c(Idea__c = ideas[1].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[2].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[2].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[2].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[2].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[3].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[3].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[5].Id, Voter__c = userId));
        votes.add(new Idea_Vote__c(Idea__c = ideas[5].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[6].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[6].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[6].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[6].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[6].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[7].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[7].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[7].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[8].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[8].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[9].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[9].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[9].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[9].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[9].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[10].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[10].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[10].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[11].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[11].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[11].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[11].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[12].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[12].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[13].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[13].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[13].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[14].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[14].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[14].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[14].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[15].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[16].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[16].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[17].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[17].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[17].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[18].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[19].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[19].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[19].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[20].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[21].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[21].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[22].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[22].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[22].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[22].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[22].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[23].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[23].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[24].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[24].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[24].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[25].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[25].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[26].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[26].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[26].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[26].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[27].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[27].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[28].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[28].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[28].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[28].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[28].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[29].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[29].Id));
        votes.add(new Idea_Vote__c(Idea__c = ideas[30].Id));

        insert votes;

        System.debug('Seeded ' + ideas.size() + ' ideas and ' + votes.size() + ' votes. Report-ready: Status, Improvement_Type, Visibility, Customer_Impact, Closed_Date.');
    }
}
