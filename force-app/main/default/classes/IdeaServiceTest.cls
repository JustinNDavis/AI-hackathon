@IsTest
private class IdeaServiceTest {

    @TestSetup
    static void setup() {
        // Create an admin user with the Idea_Admin permission set if it exists.
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User adminUser = new User(
            Alias = 'idadmin',
            Email = 'idea.admin@example.com',
            EmailEncodingKey = 'UTF-8',
            LastName = 'Admin',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey = 'en_US',
            TimeZoneSidKey = 'America/Los_Angeles',
            Username = 'idea.admin.' + System.currentTimeMillis() + '@example.com',
            ProfileId = p.Id
        );
        insert adminUser;

        PermissionSet ideaAdminPs = null;
        try {
            ideaAdminPs = [SELECT Id, Name FROM PermissionSet WHERE Name = 'Idea_Admin' LIMIT 1];
        } catch (Exception e) {
            // Permission set may not exist in some test contexts; ignore.
        }
        if (ideaAdminPs != null) {
            insert new PermissionSetAssignment(
                AssigneeId = adminUser.Id,
                PermissionSetId = ideaAdminPs.Id
            );
        }
    }

    @IsTest
    static void test_createIdea_and_listIdeasMy() {
        Test.startTest();
        Id ideaId = IdeaService.createIdea(
            'Improve onboarding emails',
            'This is a test idea to improve the onboarding email experience.',
            'Open',
            'Process;Digital',
            'Reduces time to value for new customers',
            'onboarding;email'
        );
        Test.stopTest();

        System.assertNotEquals(null, ideaId, 'Idea Id should not be null');

        List<Idea__c> myIdeas = IdeaService.listIdeas('My');
        System.assertEquals(1, myIdeas.size(), 'Current user should see their own idea in My scope');
    }

    @IsTest
    static void test_updateStatus_requiresNotes_forImplemented() {
        Id ideaId = IdeaService.createIdea('Improve support response times', 'Another idea description with enough words for validation.', 'Open', null, null, null);

        // Elevate to admin for status changes
        User adminUser = [SELECT Id FROM User WHERE Alias = 'idadmin' LIMIT 1];
        System.runAs(adminUser) {
            Boolean threw = false;
            try {
                Test.startTest();
                IdeaService.updateStatus(ideaId, 'Implemented', null);
                Test.stopTest();
            } catch (AuraHandledException e) {
                threw = true;
            }
            System.assert(threw, 'Expected validation error when closing as Implemented without notes');

            Test.startTest();
            Idea__c updated = IdeaService.updateStatus(ideaId, 'Implemented', 'Shipped in latest release.');
            Test.stopTest();
            System.assertEquals('Implemented', updated.Status__c);
            System.assertNotEquals(null, updated.Closed_Date__c, 'Closed date should be set when implemented.');
        }
    }

    @IsTest
    static void test_statusTransition_acknowledged_only_from_under_review() {
        Id ideaId = IdeaService.createIdea('Improve invoice layout', 'This is a third test idea description that should pass word count.', 'Open', null, null, null);

        User adminUser = [SELECT Id FROM User WHERE Alias = 'idadmin' LIMIT 1];
        System.runAs(adminUser) {
            // Move to Under Review first
            Test.startTest();
            Idea__c underReview = IdeaService.updateStatus(ideaId, 'Under Review', null);
            Test.stopTest();
            System.assertEquals('Under Review', underReview.Status__c);

            // Now Acknowledged is allowed
            Test.startTest();
            Idea__c acknowledged = IdeaService.updateStatus(ideaId, 'Acknowledged', 'Reviewed but not prioritized currently.');
            Test.stopTest();
            System.assertEquals('Acknowledged', acknowledged.Status__c);
        }
    }

    @IsTest
    static void test_updateVisibility_and_comments() {
        Id ideaId = IdeaService.createIdea('Improve search experience', 'This idea is to improve search so that users can find things faster.', 'Private', null, null, null);

        Test.startTest();
        // Creator changes visibility
        Idea__c visible = IdeaService.updateVisibility(ideaId, 'Open');
        System.assertEquals('Open', visible.Visibility__c);

        // Add a comment
        Id commentId = IdeaService.addComment(ideaId, 'Great idea, we should prioritize this.', null);
        System.assertNotEquals(null, commentId);

        List<Idea_Comment__c> comments = IdeaService.listComments(ideaId);
        Test.stopTest();

        System.assertEquals(1, comments.size(), 'Expected one comment for this idea.');
        System.assertEquals('Great idea, we should prioritize this.', comments[0].Body__c);

        // Add a reply (nested comment)
        Id replyId = IdeaService.addComment(ideaId, 'I agree, let us prioritize.', commentId);
        System.assertNotEquals(null, replyId);

        List<Idea_Comment__c> commentsWithReply = IdeaService.listComments(ideaId);
        System.assertEquals(2, commentsWithReply.size(), 'Expected two comments (parent + reply).');
        Idea_Comment__c reply = null;
        for (Idea_Comment__c c : commentsWithReply) {
            if (c.Parent_Comment__c != null) {
                reply = c;
                break;
            }
        }
        System.assertNotEquals(null, reply, 'Expected one reply with Parent_Comment__c set.');
        System.assertEquals(commentId, reply.Parent_Comment__c);
        System.assertEquals('I agree, let us prioritize.', reply.Body__c);
    }

    @IsTest
    static void test_voteAndUnvote() {
        Id ideaId = IdeaService.createIdea('Vote test idea', 'This idea tests the voting feature with enough words.', 'Open', null, null, null);

        Test.startTest();
        IdeaService.voteIdea(ideaId);
        List<Id> voted = IdeaService.getIdeasUserHasVotedFor(new List<Id>{ ideaId });
        System.assertEquals(1, voted.size(), 'User should have voted for the idea');
        System.assertEquals(ideaId, voted[0]);

        IdeaService.unvoteIdea(ideaId);
        voted = IdeaService.getIdeasUserHasVotedFor(new List<Id>{ ideaId });
        System.assertEquals(0, voted.size(), 'User should have no votes after unvote');
        Test.stopTest();
    }

    @IsTest
    static void test_voteTwiceThrows() {
        Id ideaId = IdeaService.createIdea('Double vote test', 'This idea tests that double voting is prevented.', 'Open', null, null, null);
        IdeaService.voteIdea(ideaId);

        Boolean threw = false;
        try {
            IdeaService.voteIdea(ideaId);
        } catch (AuraHandledException e) {
            threw = true;
        }
        System.assert(threw, 'Expected error when voting twice');
    }

    @IsTest
    static void test_getTopIdeas() {
        Id ideaId = IdeaService.createIdea('Top idea test', 'This idea has votes for top ideas test.', 'Open', null, null, null);
        insert new Idea_Vote__c(Idea__c = ideaId, Voter__c = UserInfo.getUserId());

        List<Idea__c> top = IdeaService.getTopIdeas(5);
        System.assert(top.size() >= 1, 'Should return at least one top idea');
    }

    @IsTest
    static void test_getIdeasByStatusForChart() {
        IdeaService.createIdea('Chart test idea', 'This idea is for testing the chart data aggregation.', 'Open', null, null, null);

        List<ChartDataPoint> points = IdeaService.getIdeasByStatusForChart();
        System.assert(points != null, 'Chart data should not be null');
        System.assert(points.size() >= 1, 'Should return at least one status (Submitted)');
        ChartDataPoint submitted = null;
        for (ChartDataPoint p : points) {
            if (p.label == 'Submitted') {
                submitted = p;
                break;
            }
        }
        System.assertNotEquals(null, submitted, 'Should have Submitted status');
        System.assert(submitted.value >= 1, 'Submitted count should be at least 1');
    }
}

