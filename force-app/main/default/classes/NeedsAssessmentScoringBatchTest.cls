@IsTest
private class NeedsAssessmentScoringBatchTest {
    @TestSetup
    static void setup() {
        insert new Account(Name = 'Batch Score Account');
    }

    @IsTest
    static void test_batch_runs() {
        Test.startTest();
        Id jobId = Database.executeBatch(new NeedsAssessmentScoringBatch(), 200);
        Test.stopTest();

        System.assertNotEquals(null, jobId, 'Batch should be queued');
    }
}
