public with sharing class NeedsAssessmentScoringScheduler implements Schedulable {

    public void execute(SchedulableContext sc) {
        Database.executeBatch(new NeedsAssessmentScoringBatch(), 200);
    }
}
