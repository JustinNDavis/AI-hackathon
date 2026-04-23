public with sharing class NeedsAssessmentScoringBatch implements Database.Batchable<Id> {
    public Iterable<Id> start(Database.BatchableContext bc) {
        List<Id> accountIds = new List<Id>();
        for (Account a : [SELECT Id FROM Account WHERE LastModifiedDate = LAST_N_DAYS:5]) {
            accountIds.add(a.Id);
        }
        return accountIds;
    }

    public void execute(Database.BatchableContext bc, List<Id> scope) {
        NeedsAssessmentScoringService.updateNeedsAssessmentScoresForAccounts(scope);
    }

    public void finish(Database.BatchableContext bc) {
    }
}
