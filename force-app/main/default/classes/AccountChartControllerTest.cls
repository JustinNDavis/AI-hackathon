/**
 * Tests for AccountChartController.
 */
@IsTest
private class AccountChartControllerTest {
    @TestSetup
    static void setup() {
        insert new List<Account>{
            new Account(Name = 'A1', Industry = 'Technology'),
            new Account(Name = 'A2', Industry = 'Technology'),
            new Account(Name = 'B1', Industry = 'Finance'),
            new Account(Name = 'C1', Industry = null)
        };
    }

    @IsTest
    static void test_getIndustryCounts_returnsGrouped() {
        Test.startTest();
        List<AccountChartController.IndustryCount> counts = AccountChartController.getIndustryCounts();
        Test.stopTest();
        System.assert(counts != null);
        System.assert(counts.size() >= 2, 'Expected at least Technology and Finance');
        Integer techCount = 0;
        Integer unknownCount = 0;
        for (AccountChartController.IndustryCount c : counts) {
            if (c.industry == 'Technology') techCount = c.count;
            if (c.industry == 'Unknown') unknownCount = c.count;
        }
        System.assertEquals(2, techCount, 'Technology should have 2 accounts');
        System.assertEquals(1, unknownCount, 'Unknown (null industry) should have 1 account');
    }
}