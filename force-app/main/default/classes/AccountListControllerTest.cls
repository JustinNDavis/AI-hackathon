/**
 * Tests for AccountListController.
 */
@IsTest
private class AccountListControllerTest {
    @TestSetup
    static void setup() {
        insert new List<Account>{
            new Account(Name = 'Alpha Corp', Industry = 'Technology', AnnualRevenue = 1000000, Phone = '555-0100'),
            new Account(Name = 'Beta Inc', Industry = 'Finance', AnnualRevenue = 2500000, Website = 'https://beta.com')
        };
    }

    @IsTest
    static void test_getAccounts_returnsAll() {
        Test.startTest();
        List<Account> accounts = AccountListController.getAccounts();
        Test.stopTest();
        System.assertEquals(2, accounts.size(), 'Should return both accounts');
        Set<String> names = new Set<String>();
        for (Account a : accounts) {
            names.add(a.Name);
            System.assert(a.Id != null);
        }
        System.assert(names.contains('Alpha Corp'));
        System.assert(names.contains('Beta Inc'));
    }

    @IsTest
    static void test_getAccounts_fieldsPresent() {
        List<Account> accounts = AccountListController.getAccounts();
        System.assert(!accounts.isEmpty());
        Account a = accounts[0];
        System.assert(a.Name != null);
        System.assertNotEquals(null, a.Industry, 'Industry may be set');
        System.assertNotEquals(null, a.AnnualRevenue, 'AnnualRevenue may be set');
    }
}