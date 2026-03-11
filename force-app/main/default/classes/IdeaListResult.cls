public with sharing class IdeaListResult {
    @AuraEnabled public List<Idea__c> ideas;
    @AuraEnabled public Integer totalCount;

    public IdeaListResult(List<Idea__c> ideas, Integer totalCount) {
        this.ideas = ideas;
        this.totalCount = totalCount;
    }
}
