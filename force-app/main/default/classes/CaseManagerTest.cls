/**
 * Tests for CaseManagerController and CaseManagerService.
 */
@IsTest
private class CaseManagerTest {
    @TestSetup
    static void setup() {
        Account acc = new Account(Name = 'Test Account');
        insert acc;
        Loan__c loan = new Loan__c(Name = 'Test Loan', Account__c = acc.Id, Loan_Status__c = 'Current', Status__c = 'Active');
        insert loan;
        Deposit__c dep = new Deposit__c(Name = 'Test Deposit', Account__c = acc.Id);
        insert dep;
    }

    @IsTest
    static void test_getRecordContext_Account() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Test.startTest();
        Map<String, Object> ctx = CaseManagerController.getRecordContext(acc.Id);
        Test.stopTest();
        System.assertEquals('Account', ctx.get('objectApiName'));
        System.assert(ctx.get('recordName') != null);
    }

    @IsTest
    static void test_getRecordContext_Loan() {
        Loan__c loan = [SELECT Id FROM Loan__c LIMIT 1];
        Test.startTest();
        Map<String, Object> ctx = CaseManagerController.getRecordContext(loan.Id);
        Test.stopTest();
        System.assertEquals('Loan__c', ctx.get('objectApiName'));
    }

    @IsTest
    static void test_getRecordContext_Loan_Delinquent() {
        Loan__c loan = [SELECT Id FROM Loan__c LIMIT 1];
        loan.Loan_Status__c = 'Delinquent';
        update loan;
        Test.startTest();
        Map<String, Object> ctx = CaseManagerController.getRecordContext(loan.Id);
        Test.stopTest();
        List<Object> flags = (List<Object>) ctx.get('flags');
        System.assert(flags.contains('DELINQUENT'), 'Expected DELINQUENT flag');
    }

    @IsTest
    static void test_getRecordContext_null() {
        Test.startTest();
        Map<String, Object> ctx = CaseManagerController.getRecordContext(null);
        Test.stopTest();
        System.assertEquals(null, ctx.get('objectApiName'));
    }

    @IsTest
    static void test_getServiceConfigs() {
        Test.startTest();
        List<Map<String, Object>> configs = CaseManagerController.getServiceConfigs('Account');
        Test.stopTest();
        System.assert(configs != null);
    }

    @IsTest
    static void test_getServiceConfigs_blank() {
        Test.startTest();
        List<Map<String, Object>> configs = CaseManagerController.getServiceConfigs('');
        Test.stopTest();
        System.assertEquals(0, configs.size());
    }

    @IsTest
    static void test_createServiceRequest_success() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Test.startTest();
        Id caseId = CaseManagerController.createServiceRequest(
            acc.Id,
            'Account',
            'Address Change',
            'Test Subject',
            'Test Description',
            'Medium'
        );
        Test.stopTest();
        System.assertNotEquals(null, caseId);
        Case c = [SELECT Id, Subject, Service_Category__c, Related_Record_Id__c, Related_Object_Type__c FROM Case WHERE Id = :caseId];
        System.assertEquals('Test Subject', c.Subject);
        System.assertEquals('Address Change', c.Service_Category__c);
    }

    @IsTest
    static void test_createServiceRequest_duplicate_throws() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        CaseManagerController.createServiceRequest(acc.Id, 'Account', 'Address Change', 'Subj1', 'Desc1', 'Medium');
        Test.startTest();
        try {
            CaseManagerController.createServiceRequest(acc.Id, 'Account', 'Address Change', 'Subj2', 'Desc2', 'Medium');
            System.assert(false, 'Expected AuraHandledException');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('open case'));
        }
        Test.stopTest();
    }

    @IsTest
    static void test_getRelatedCases() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        CaseManagerController.createServiceRequest(acc.Id, 'Account', 'Risk Review', 'R', 'D', 'High');
        Test.startTest();
        List<Case> cases = CaseManagerController.getRelatedCases(acc.Id);
        Test.stopTest();
        System.assert(cases.size() >= 1);
    }

    @IsTest
    static void test_closeCase() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Id caseId = CaseManagerController.createServiceRequest(acc.Id, 'Account', 'KYC Update', 'K', 'D', 'High');
        Test.startTest();
        CaseManagerController.closeCase(caseId);
        Test.stopTest();
        Case c = [SELECT Status FROM Case WHERE Id = :caseId];
        System.assertEquals('Closed', c.Status);
    }

    @IsTest
    static void test_getRelatedRecords() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Test.startTest();
        Map<String, List<SObject>> related = CaseManagerController.getRelatedRecords(acc.Id);
        Test.stopTest();
        System.assert(related.containsKey('loans'));
        System.assert(related.containsKey('deposits'));
        System.assertEquals(1, related.get('loans').size());
        System.assertEquals(1, related.get('deposits').size());
    }

    @IsTest
    static void test_getRelatedCollateral() {
        Loan__c loan = [SELECT Id FROM Loan__c LIMIT 1];
        Test.startTest();
        List<Collateral__c> coll = CaseManagerController.getRelatedCollateral(loan.Id);
        Test.stopTest();
        System.assert(coll != null);
        System.assertEquals(0, coll.size());
    }

    @IsTest
    static void test_service_buildContext() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        Map<String, Object> ctx = CaseManagerService.buildContext(acc.Id);
        System.assertEquals('Account', ctx.get('objectApiName'));
    }

    @IsTest
    static void test_service_checkDuplicate() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        System.assert(!CaseManagerService.checkDuplicate(acc.Id, 'Unknown'));
        CaseManagerController.createServiceRequest(acc.Id, 'Account', 'Officer Assignment', 'S', 'D', 'Medium');
        System.assert(CaseManagerService.checkDuplicate(acc.Id, 'Officer Assignment'));
    }

    @IsTest
    static void test_service_resolvePriority_delinquent() {
        Map<String, Object> ctx = new Map<String, Object>{ 'flags' => new List<String>{ 'DELINQUENT' } };
        System.assertEquals('Critical', CaseManagerService.resolvePriority('High', ctx));
    }

    @IsTest
    static void test_service_resolvePriority_normal() {
        System.assertEquals('High', CaseManagerService.resolvePriority('High', new Map<String, Object>()));
    }

    @IsTest
    static void test_bulk_createServiceRequest() {
        List<Account> accounts = new List<Account>();
        for (Integer i = 0; i < 50; i++) {
            accounts.add(new Account(Name = 'Bulk Acc ' + i));
        }
        insert accounts;
        List<Id> caseIds = new List<Id>();
        Test.startTest();
        for (Integer i = 0; i < 50; i++) {
            caseIds.add(CaseManagerController.createServiceRequest(
                accounts[i].Id,
                'Account',
                'Address Change',
                'Bulk Subject ' + i,
                'Desc',
                'Medium'
            ));
        }
        Test.stopTest();
        System.assertEquals(50, caseIds.size());
        System.assertEquals(50, [SELECT COUNT() FROM Case]);
    }
}