@IsTest
private class NeedsAssessmentScoringServiceTest {
    @TestSetup
    static void setup() {
        insert new List<Account>{ new Account(Name = 'Test One'), new Account(Name = 'Test Two') };
    }

    @IsTest
    static void test_updateNeedsAssessmentScoresForAccounts_nullInput() {
        NeedsAssessmentScoringService.updateNeedsAssessmentScoresForAccounts(null);
        System.assert(true);
    }

    @IsTest
    static void test_updateNeedsAssessmentScoresForAccounts_emptyInput() {
        NeedsAssessmentScoringService.updateNeedsAssessmentScoresForAccounts(new List<Id>());
        System.assert(true);
    }

    @IsTest
    static void test_updateNeedsAssessmentScoresForAccounts_nameOnly() {
        Account a = [SELECT Id FROM Account WHERE Name = 'Test One' LIMIT 1];
        NeedsAssessmentScoringService.updateNeedsAssessmentScoresForAccounts(new List<Id>{ a.Id });
        a = [SELECT Needs_Assessment_Score__c, Needs_Assessment_Score_Summary__c FROM Account WHERE Id = :a.Id];
        System.assertNotEquals(null, a.Needs_Assessment_Score__c);
        System.assert(
            a.Needs_Assessment_Score_Summary__c.contains('Account Information: 1 / 10'),
            'Name only scores 1'
        );
    }

    @IsTest
    static void test_updateNeedsAssessmentScoresForAccounts_nameAndPhone() {
        Account a = [SELECT Id FROM Account WHERE Name = 'Test One' LIMIT 1];
        a.Phone = '5551234567';
        update a;
        NeedsAssessmentScoringService.updateNeedsAssessmentScoresForAccounts(new List<Id>{ a.Id });
        a = [SELECT Needs_Assessment_Score_Summary__c FROM Account WHERE Id = :a.Id];
        System.assert(a.Needs_Assessment_Score_Summary__c.contains('Account Information: 3 / 10'));
    }

    @IsTest
    static void test_updateNeedsAssessmentScoresForAccounts_summaryFormat() {
        Account a = [SELECT Id FROM Account LIMIT 1];
        NeedsAssessmentScoringService.updateNeedsAssessmentScoresForAccounts(new List<Id>{ a.Id });
        a = [SELECT Needs_Assessment_Score_Summary__c FROM Account WHERE Id = :a.Id];
        System.assert(a.Needs_Assessment_Score_Summary__c.contains('Housing: 0 / 20'));
        System.assert(a.Needs_Assessment_Score_Summary__c.contains('Outside Assets and Liabilities: 0 / 30'));
    }

    @IsTest
    static void test_updateNeedsAssessmentScoresForAccounts_multipleAccounts() {
        List<Account> accts = [SELECT Id FROM Account];
        NeedsAssessmentScoringService.updateNeedsAssessmentScoresForAccounts(
            new List<Id>{ accts[0].Id, accts[1].Id }
        );
        for (Account a : [SELECT Needs_Assessment_Score__c FROM Account WHERE Id IN :accts]) {
            System.assertNotEquals(null, a.Needs_Assessment_Score__c);
        }
    }

    @IsTest
    static void test_scheduler_execute() {
        Test.startTest();
        String jobId = System.schedule('Needs Assessment Scoring Test', '0 0 2 * * ?', new NeedsAssessmentScoringScheduler());
        Test.stopTest();
        System.assertNotEquals(null, jobId);
    }
}
