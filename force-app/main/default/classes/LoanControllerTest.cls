/**
 * Test class for LoanController (Create Loan from Account LWC).
 */
@IsTest
private class LoanControllerTest {
    @TestSetup
    static void setup() {
        Account acc = new Account(Name = 'Test Account');
        insert acc;
    }

    @IsTest
    static void test_createLoanFromAccount_createsLoanAndLegalEntity() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        Id loanId = LoanController.createLoanFromAccount(
            acc.Id,
            'My New Loan',
            50000,
            24,
            'Active',
            String.valueOf(Date.today()),
            4.25
        );
        Test.stopTest();

        System.assertNotEquals(null, loanId);
        Loan__c loan = [SELECT Id, Name, Principal_Amount__c, Term_Months__c, Status__c, Interest_Rate__c, Account__c FROM Loan__c WHERE Id = :loanId];
        System.assertEquals('My New Loan', loan.Name);
        System.assertEquals(50000, loan.Principal_Amount__c);
        System.assertEquals(24, loan.Term_Months__c);
        System.assertEquals('Active', loan.Status__c);
        System.assertEquals(4.25, loan.Interest_Rate__c);
        System.assertEquals(acc.Id, loan.Account__c);

        List<Legal_Entity__c> legalEntities = [SELECT Id FROM Legal_Entity__c WHERE Loan__c = :loanId];
        System.assertEquals(1, legalEntities.size());
    }

    @IsTest
    static void test_createLoanFromAccount_withOptionalBlanks() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        Id loanId = LoanController.createLoanFromAccount(acc.Id, 'Minimal Loan', null, null, null, null, null);
        Test.stopTest();

        System.assertNotEquals(null, loanId);
        Loan__c loan = [SELECT Id, Name FROM Loan__c WHERE Id = :loanId];
        System.assertEquals('Minimal Loan', loan.Name);
    }
}