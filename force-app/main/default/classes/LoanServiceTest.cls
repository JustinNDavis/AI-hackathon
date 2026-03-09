/**
 * Test class for LoanService.
 */
@IsTest
private class LoanServiceTest {
    @TestSetup
    static void setup() {
        Account acc = new Account(Name = 'Test Account for Loan');
        insert acc;
    }

    @IsTest
    static void test_createLoanWithLegalEntity_createsLoanAndLegalEntity() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Loan__c loan = new Loan__c(
            Name = 'Test Loan',
            Principal_Amount__c = 100000,
            Term_Months__c = 36,
            Status__c = 'Pending',
            Start_Date__c = Date.today(),
            Interest_Rate__c = 5.5
        );

        Test.startTest();
        Id loanId = LoanService.createLoanWithLegalEntity(acc.Id, loan);
        Test.stopTest();

        System.assertNotEquals(null, loanId, 'Loan Id should be returned.');
        List<Loan__c> loans = [SELECT Id, Account__c, Name FROM Loan__c WHERE Id = :loanId];
        System.assertEquals(1, loans.size(), 'One loan should be created.');
        System.assertEquals(acc.Id, loans[0].Account__c, 'Loan should be linked to account.');

        List<Legal_Entity__c> legalEntities = [
            SELECT Id, Account__c, Loan__c, Role__c
            FROM Legal_Entity__c
            WHERE Loan__c = :loanId
        ];
        System.assertEquals(1, legalEntities.size(), 'One legal entity should be created.');
        System.assertEquals(acc.Id, legalEntities[0].Account__c, 'Legal entity should link account.');
        System.assertEquals(loanId, legalEntities[0].Loan__c, 'Legal entity should link loan.');
        System.assertEquals('Borrower', legalEntities[0].Role__c, 'Role should be Borrower.');
    }

    @IsTest
    static void test_createLoanWithLegalEntity_throwsWhenAccountIdNull() {
        Loan__c loan = new Loan__c(Name = 'Test', Principal_Amount__c = 1000);

        Test.startTest();
        try {
            LoanService.createLoanWithLegalEntity(null, loan);
            System.assert(false, 'Expected AuraHandledException.');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Account Id'), 'Message should mention Account Id.');
        }
        Test.stopTest();
    }
}