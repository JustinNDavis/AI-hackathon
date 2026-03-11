@IsTest
private class IdeaVoteTriggerHandlerTest {

    @TestSetup
    static void setup() {
        Idea__c idea = new Idea__c(
            Title__c = 'Test Idea',
            Description__c = 'Test',
            Status__c = 'New',
            Visibility__c = 'Open'
        );
        insert idea;
    }

    @IsTest
    static void test_afterInsert_updatesVoteCount() {
        Idea__c idea = [SELECT Id FROM Idea__c LIMIT 1];
        Test.startTest();
        insert new Idea_Vote__c(Idea__c = idea.Id, Voter__c = UserInfo.getUserId());
        Test.stopTest();
        idea = [SELECT Vote_Count__c FROM Idea__c WHERE Id = :idea.Id];
        System.assertEquals(1, idea.Vote_Count__c, 'Vote count should be 1');
    }

    @IsTest
    static void test_afterDelete_updatesVoteCount() {
        Idea__c idea = [SELECT Id FROM Idea__c LIMIT 1];
        Idea_Vote__c vote = new Idea_Vote__c(Idea__c = idea.Id, Voter__c = UserInfo.getUserId());
        insert vote;
        Test.startTest();
        delete vote;
        Test.stopTest();
        idea = [SELECT Vote_Count__c FROM Idea__c WHERE Id = :idea.Id];
        System.assertEquals(0, idea.Vote_Count__c, 'Vote count should be 0 after delete');
    }
}
