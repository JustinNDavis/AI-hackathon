/**
 * Tests for referral matching and Loan_Referral__c persistence.
 */
@IsTest
private class ReferralControllerTest {
    @TestSetup
    static void setup() {
        insert new List<Account>{
            new Account(Name = 'Alex Alpha', Phone = '(555) 111-2222'),
            new Account(Name = 'Sam Beta', Phone = '5559876543')
        };
    }

    @IsTest
    static void test_findSimilarAccounts_returnsScoredMatches() {
        Test.startTest();
        List<AccountSimilarMatchResult> matches = ReferralController.findSimilarAccounts(
            'Alex',
            'Alpha',
            '5551112222',
            null
        );
        Test.stopTest();

        System.assert(!matches.isEmpty(), 'Expected at least one match');
        System.assert(matches[0].matchScore >= 40, 'Strong match should rank first');
        System.assertEquals('Alex Alpha', matches[0].name);
    }

    @IsTest
    static void test_findSimilarAccounts_emptyWhenNoCriteria() {
        List<AccountSimilarMatchResult> matches = ReferralController.findSimilarAccounts(null, null, null, null);
        System.assertEquals(0, matches.size());
    }

    @IsTest
    static void test_saveReferral_createsRecordWithMatch() {
        Account acc = [SELECT Id FROM Account WHERE Name = 'Sam Beta' LIMIT 1];

        Test.startTest();
        Id refId = ReferralController.saveReferral('Sam', 'Beta', '5559876543', '0000005432', acc.Id, null);
        Test.stopTest();

        Loan_Referral__c rec = [
            SELECT Id, Matched_Account__c, Status__c, SSN_Last_4__c
            FROM Loan_Referral__c
            WHERE Id = :refId
        ];
        System.assertEquals(acc.Id, rec.Matched_Account__c);
        System.assertEquals('Matched', rec.Status__c);
        System.assertEquals('5432', rec.SSN_Last_4__c);
    }

    @IsTest
    static void test_saveReferral_withoutMatch() {
        Test.startTest();
        Id refId = ReferralController.saveReferral('New', 'Person', '5550000000', '', null, null);
        Test.stopTest();

        Loan_Referral__c rec = [SELECT Status__c, Matched_Account__c FROM Loan_Referral__c WHERE Id = :refId];
        System.assertEquals('New', rec.Status__c);
        System.assertEquals(null, rec.Matched_Account__c);
    }
}
