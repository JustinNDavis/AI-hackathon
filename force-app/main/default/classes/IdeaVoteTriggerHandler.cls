public with sharing class IdeaVoteTriggerHandler {

    public static void afterInsert(List<Idea_Vote__c> newList) {
        updateVoteCounts(collectIdeaIds(newList));
    }

    public static void afterUpdate(List<Idea_Vote__c> newList, Map<Id, Idea_Vote__c> oldMap) {
        Set<Id> ideaIds = new Set<Id>();
        for (Idea_Vote__c v : newList) {
            Idea_Vote__c oldV = oldMap.get(v.Id);
            if (oldV != null && v.Idea__c != oldV.Idea__c) {
                if (v.Idea__c != null) ideaIds.add(v.Idea__c);
                if (oldV.Idea__c != null) ideaIds.add(oldV.Idea__c);
            }
        }
        updateVoteCounts(ideaIds);
    }

    public static void afterDelete(List<Idea_Vote__c> oldList) {
        updateVoteCounts(collectIdeaIds(oldList));
    }

    public static void afterUndelete(List<Idea_Vote__c> newList) {
        updateVoteCounts(collectIdeaIds(newList));
    }

    private static Set<Id> collectIdeaIds(List<Idea_Vote__c> votes) {
        Set<Id> ideaIds = new Set<Id>();
        for (Idea_Vote__c v : votes) {
            if (v.Idea__c != null) {
                ideaIds.add(v.Idea__c);
            }
        }
        return ideaIds;
    }

    private static void updateVoteCounts(Set<Id> ideaIds) {
        if (ideaIds.isEmpty()) return;

        Map<Id, Integer> countByIdea = new Map<Id, Integer>();
        for (Id ideaId : ideaIds) {
            countByIdea.put(ideaId, 0);
        }

        for (AggregateResult ar : [
            SELECT Idea__c ideaId, COUNT(Id) cnt
            FROM Idea_Vote__c
            WHERE Idea__c IN :ideaIds
            GROUP BY Idea__c
        ]) {
            Id ideaId = (Id) ar.get('ideaId');
            Integer cnt = (Integer) ar.get('cnt');
            countByIdea.put(ideaId, cnt);
        }

        List<Idea__c> toUpdate = new List<Idea__c>();
        for (Id ideaId : countByIdea.keySet()) {
            toUpdate.add(new Idea__c(
                Id = ideaId,
                Vote_Count__c = countByIdea.get(ideaId)
            ));
        }
        update toUpdate;
    }
}
