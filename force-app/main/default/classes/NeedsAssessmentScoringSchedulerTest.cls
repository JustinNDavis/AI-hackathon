@IsTest
private class NeedsAssessmentScoringSchedulerTest {

    @IsTest
    static void test_scheduler_runs() {
        Test.startTest();
        String cron = '0 0 2 * * ?'; // 2 AM daily
        String jobId = System.schedule('Needs Assessment Scoring', cron, new NeedsAssessmentScoringScheduler());
        Test.stopTest();

        System.assertNotEquals(null, jobId, 'Schedule job should be created');
    }
}
