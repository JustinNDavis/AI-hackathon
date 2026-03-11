trigger IdeaVoteTrigger on Idea_Vote__c (after insert, after update, after delete, after undelete) {
    if (trigger.isAfter) {
        if (trigger.isInsert) {
            IdeaVoteTriggerHandler.afterInsert(trigger.new);
        } else if (trigger.isUpdate) {
            IdeaVoteTriggerHandler.afterUpdate(trigger.new, trigger.oldMap);
        } else if (trigger.isDelete) {
            IdeaVoteTriggerHandler.afterDelete(trigger.old);
        } else if (trigger.isUndelete) {
            IdeaVoteTriggerHandler.afterUndelete(trigger.new);
        }
    }
}
