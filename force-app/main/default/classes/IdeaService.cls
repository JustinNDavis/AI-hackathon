public with sharing class IdeaService {

    @AuraEnabled
    public static Id createIdea(String title, String description, String visibility, String improvementType, String customerImpact, String tags) {
        if (String.isBlank(title)) {
            throw new AuraHandledException('Title is required.');
        }
        if (String.isBlank(description)) {
            throw new AuraHandledException('Description is required.');
        }
        if (countWords(description) < 5) {
            throw new AuraHandledException('Description must contain at least five words.');
        }
        if (String.isBlank(improvementType)) {
            throw new AuraHandledException('Improvement type is required.');
        }

        Idea__c idea = new Idea__c();
        idea.Title__c = title;
        idea.Description__c = description;
        idea.Is_Confidential__c = false;
        idea.Visibility__c = String.isBlank(visibility) ? 'Private' : visibility;
        idea.Improvement_Type__c = improvementType;
        idea.Customer_Impact__c = customerImpact;
        idea.Tags__c = tags;
        idea.Status__c = 'Submitted';
        idea.Owner__c = UserInfo.getUserId();
        insert idea;

        notifyAdminsNewIdea(idea);
        return idea.Id;
    }

    @AuraEnabled
    public static Idea__c updateStatus(Id ideaId, String newStatus, String notes) {
        if (ideaId == null || String.isBlank(newStatus)) {
            throw new AuraHandledException('Idea Id and new status are required.');
        }
        Idea__c idea = [
            SELECT Id, Status__c, Resolution_Notes__c, Closed_Date__c, Administrator__c, Owner__c, CreatedById
            FROM Idea__c
            WHERE Id = :ideaId
        ];

        if (!canAdminIdea(idea)) {
            throw new AuraHandledException('You do not have permission to change status for this idea.');
        }

        validateStatusTransition(idea, newStatus, notes);

        idea.Status__c = newStatus;
        idea.Resolution_Notes__c = notes;

        if (newStatus == 'Implemented' || newStatus == 'Not Pursued' || newStatus == 'Acknowledged') {
            if (idea.Closed_Date__c == null) {
                idea.Closed_Date__c = Date.today();
            }
        }

        update idea;
        notifySubmitterStatusChange(idea);
        return idea;
    }

    @AuraEnabled(cacheable=true)
    public static List<Idea__c> listIdeas(String scope) {
        String normalizedScope = String.isBlank(scope) ? 'My' : scope;
        Id userId = UserInfo.getUserId();
        Boolean isAdmin = currentUserIsAdmin();

        List<Idea__c> ideas;
        if (normalizedScope == 'Admin' && isAdmin) {
            ideas = [
                SELECT Id, Name, Title__c, Description__c, Status__c, Owner__c, Owner__r.Name,
                    Tags__c, LastModifiedDate, Visibility__c, Is_Confidential__c,
                    Administrator__c, Administrator__r.Name, Vote_Count__c
                FROM Idea__c
                ORDER BY CreatedDate DESC
                LIMIT 200
            ];
        } else if (normalizedScope == 'Visible') {
            if (isAdmin) {
                ideas = [
                    SELECT Id, Name, Title__c, Description__c, Status__c, Owner__c, Owner__r.Name,
                        Tags__c, LastModifiedDate, Visibility__c, Is_Confidential__c,
                        Administrator__c, Administrator__r.Name, Vote_Count__c
                    FROM Idea__c
                    ORDER BY CreatedDate DESC
                    LIMIT 200
                ];
            } else {
                ideas = [
                    SELECT Id, Name, Title__c, Description__c, Status__c, Owner__c, Owner__r.Name,
                        Tags__c, LastModifiedDate, Visibility__c, Is_Confidential__c,
                        Administrator__c, Administrator__r.Name, CreatedById, Vote_Count__c
                    FROM Idea__c
                    WHERE
                        CreatedById = :userId
                        OR Owner__c = :userId
                        OR Administrator__c = :userId
                        OR (Visibility__c = 'Open' AND Is_Confidential__c = false)
                    ORDER BY CreatedDate DESC
                    LIMIT 200
                ];
            }
        } else {
            ideas = [
                SELECT Id, Name, Title__c, Description__c, Status__c, Owner__c, Owner__r.Name,
                    Tags__c, LastModifiedDate, Visibility__c, Is_Confidential__c,
                    Administrator__c, Administrator__r.Name, CreatedById, Vote_Count__c
                FROM Idea__c
                WHERE CreatedById = :userId OR Owner__c = :userId
                ORDER BY CreatedDate DESC
                LIMIT 200
            ];
        }
        return ideas;
    }

    @AuraEnabled(cacheable=true)
    public static IdeaListResult listIdeasPaginated(String scope, Integer pageNumber, Integer pageSize) {
        Integer pn = (pageNumber == null || pageNumber < 1) ? 1 : pageNumber;
        Integer ps = (pageSize == null || pageSize < 1) ? 10 : Math.min(pageSize, 50);
        Integer offset = (pn - 1) * ps;

        String normalizedScope = String.isBlank(scope) ? 'My' : scope;
        Id userId = UserInfo.getUserId();
        Boolean isAdmin = currentUserIsAdmin();

        String baseFields = 'Id, Name, Title__c, Description__c, Status__c, Owner__c, Owner__r.Name, Tags__c, LastModifiedDate, Visibility__c, Is_Confidential__c, Administrator__c, Administrator__r.Name, Vote_Count__c';
        String whereClause = '';
        if (normalizedScope == 'Admin' && isAdmin) {
            whereClause = '';
        } else if (normalizedScope == 'Visible') {
            if (!isAdmin) {
                whereClause = ' WHERE (CreatedById = :userId OR Owner__c = :userId OR Administrator__c = :userId OR (Visibility__c = \'Open\' AND Is_Confidential__c = false))';
            }
        } else {
            whereClause = ' WHERE (CreatedById = :userId OR Owner__c = :userId)';
        }

        Integer totalCount = 0;
        if (normalizedScope == 'Admin' && isAdmin) {
            totalCount = [SELECT COUNT() FROM Idea__c];
        } else if (normalizedScope == 'Visible' && isAdmin) {
            totalCount = [SELECT COUNT() FROM Idea__c];
        } else if (normalizedScope == 'Visible') {
            totalCount = [SELECT COUNT() FROM Idea__c WHERE CreatedById = :userId OR Owner__c = :userId OR Administrator__c = :userId OR (Visibility__c = 'Open' AND Is_Confidential__c = false)];
        } else {
            totalCount = [SELECT COUNT() FROM Idea__c WHERE CreatedById = :userId OR Owner__c = :userId];
        }

        List<Idea__c> ideas;
        if (normalizedScope == 'Admin' && isAdmin) {
            ideas = Database.query('SELECT ' + baseFields + ' FROM Idea__c ORDER BY CreatedDate DESC LIMIT :ps OFFSET :offset');
        } else if (normalizedScope == 'Visible') {
            if (isAdmin) {
                ideas = Database.query('SELECT ' + baseFields + ' FROM Idea__c ORDER BY CreatedDate DESC LIMIT :ps OFFSET :offset');
            } else {
                ideas = Database.query('SELECT ' + baseFields + ', CreatedById FROM Idea__c' + whereClause + ' ORDER BY CreatedDate DESC LIMIT :ps OFFSET :offset');
            }
        } else {
            ideas = Database.query('SELECT ' + baseFields + ', CreatedById FROM Idea__c' + whereClause + ' ORDER BY CreatedDate DESC LIMIT :ps OFFSET :offset');
        }

        return new IdeaListResult(ideas, totalCount);
    }

    @AuraEnabled
    public static Idea__c updateVisibility(Id ideaId, String visibility) {
        if (ideaId == null || String.isBlank(visibility)) {
            throw new AuraHandledException('Idea Id and visibility are required.');
        }
        Idea__c idea = [
            SELECT Id, CreatedById, Owner__c, Administrator__c, Visibility__c
            FROM Idea__c
            WHERE Id = :ideaId
        ];

        Id userId = UserInfo.getUserId();
        if (userId != idea.CreatedById && userId != idea.Owner__c && !canAdminIdea(idea)) {
            throw new AuraHandledException('You do not have permission to change visibility for this idea.');
        }

        idea.Visibility__c = visibility;
        update idea;
        return idea;
    }

    @AuraEnabled
    public static Id addComment(Id ideaId, String body, Id parentCommentId) {
        if (ideaId == null || String.isBlank(body)) {
            throw new AuraHandledException('Idea Id and comment body are required.');
        }
        if (!canSeeIdea(ideaId)) {
            throw new AuraHandledException('You do not have access to this idea.');
        }

        if (parentCommentId != null) {
            Idea_Comment__c parent = [SELECT Id, Idea__c FROM Idea_Comment__c WHERE Id = :parentCommentId LIMIT 1];
            if (parent.Idea__c != ideaId) {
                throw new AuraHandledException('Parent comment must belong to the same idea.');
            }
        }

        Idea_Comment__c comment = new Idea_Comment__c();
        comment.Idea__c = ideaId;
        comment.Body__c = body;
        comment.Created_By__c = UserInfo.getUserId();
        if (parentCommentId != null) {
            comment.Parent_Comment__c = parentCommentId;
        }
        insert comment;
        return comment.Id;
    }

    @AuraEnabled
    public static List<Idea_Comment__c> listComments(Id ideaId) {
        if (ideaId == null) {
            return new List<Idea_Comment__c>();
        }
        if (!canSeeIdea(ideaId)) {
            return new List<Idea_Comment__c>();
        }
        return [
            SELECT Id, Body__c, CreatedDate, Created_By__c, Created_By__r.Name, Parent_Comment__c
            FROM Idea_Comment__c
            WHERE Idea__c = :ideaId
            ORDER BY CreatedDate ASC
        ];
    }

    @AuraEnabled
    public static void voteIdea(Id ideaId) {
        if (ideaId == null) {
            throw new AuraHandledException('Idea Id is required.');
        }
        if (!canSeeIdea(ideaId)) {
            throw new AuraHandledException('You do not have access to this idea.');
        }
        Id userId = UserInfo.getUserId();
        List<Idea_Vote__c> existing = [
            SELECT Id FROM Idea_Vote__c
            WHERE Idea__c = :ideaId AND Voter__c = :userId
            LIMIT 1
        ];
        if (!existing.isEmpty()) {
            throw new AuraHandledException('You have already liked this idea.');
        }
        Idea_Vote__c vote = new Idea_Vote__c();
        vote.Idea__c = ideaId;
        vote.Voter__c = userId;
        insert vote;
    }

    @AuraEnabled
    public static void unvoteIdea(Id ideaId) {
        if (ideaId == null) {
            throw new AuraHandledException('Idea Id is required.');
        }
        Id userId = UserInfo.getUserId();
        delete [
            SELECT Id FROM Idea_Vote__c
            WHERE Idea__c = :ideaId AND Voter__c = :userId
        ];
    }

    @AuraEnabled
    public static List<Id> getIdeasUserHasVotedFor(List<Id> ideaIds) {
        if (ideaIds == null || ideaIds.isEmpty()) {
            return new List<Id>();
        }
        Id userId = UserInfo.getUserId();
        List<Id> voted = new List<Id>();
        for (Idea_Vote__c v : [
            SELECT Idea__c FROM Idea_Vote__c
            WHERE Idea__c IN :ideaIds AND Voter__c = :userId
        ]) {
            voted.add(v.Idea__c);
        }
        return voted;
    }

    @AuraEnabled(cacheable=true)
    public static List<ChartDataPoint> getIdeasByStatusForChart() {
        Id userId = UserInfo.getUserId();
        Boolean isAdmin = currentUserIsAdmin();
        List<AggregateResult> results;
        if (isAdmin) {
            results = [SELECT Status__c, COUNT(Id) cnt FROM Idea__c GROUP BY Status__c];
        } else {
            results = [
                SELECT Status__c, COUNT(Id) cnt
                FROM Idea__c
                WHERE CreatedById = :userId
                    OR Owner__c = :userId
                    OR Administrator__c = :userId
                    OR (Visibility__c = 'Open' AND Is_Confidential__c = false)
                GROUP BY Status__c
            ];
        }
        List<ChartDataPoint> points = new List<ChartDataPoint>();
        for (AggregateResult ar : results) {
            String status = (String) ar.get('Status__c');
            if (String.isBlank(status)) {
                status = 'Unknown';
            }
            Integer cnt = (Integer) ar.get('cnt');
            points.add(new ChartDataPoint(status, cnt));
        }
        return points;
    }

    @AuraEnabled(cacheable=true)
    public static List<Idea__c> getTopIdeas(Integer limitCount) {
        Integer lim = (limitCount == null || limitCount < 1) ? 5 : Math.min(limitCount, 20);
        Id userId = UserInfo.getUserId();
        Boolean isAdmin = currentUserIsAdmin();
        List<Idea__c> ideas;
        if (isAdmin) {
            ideas = [
                SELECT Id, Name, Title__c, Status__c, Vote_Count__c, Owner__r.Name, Description__c
                FROM Idea__c
                WHERE Vote_Count__c > 0
                ORDER BY Vote_Count__c DESC, LastModifiedDate DESC
                LIMIT :lim
            ];
        } else {
            ideas = [
                SELECT Id, Name, Title__c, Status__c, Vote_Count__c, Owner__r.Name, Description__c
                FROM Idea__c
                WHERE Vote_Count__c > 0
                    AND (CreatedById = :userId OR Owner__c = :userId OR Administrator__c = :userId
                        OR (Visibility__c = 'Open' AND Is_Confidential__c = false))
                ORDER BY Vote_Count__c DESC, LastModifiedDate DESC
                LIMIT :lim
            ];
        }
        return ideas;
    }

    private static Boolean canSeeIdea(Id ideaId) {
        Idea__c idea = [
            SELECT Id, CreatedById, Owner__c, Administrator__c, Visibility__c, Is_Confidential__c
            FROM Idea__c
            WHERE Id = :ideaId
        ];
        Id userId = UserInfo.getUserId();
        if (currentUserIsAdmin()) {
            return true;
        }
        if (userId == idea.CreatedById || userId == idea.Owner__c || userId == idea.Administrator__c) {
            return true;
        }
        if (!idea.Is_Confidential__c && idea.Visibility__c == 'Open') {
            return true;
        }
        return false;
    }

    private static Boolean canAdminIdea(Idea__c idea) {
        Id userId = UserInfo.getUserId();
        if (currentUserIsAdmin()) {
            return true;
        }
        if (idea.Administrator__c == userId) {
            return true;
        }
        return false;
    }

    @AuraEnabled(cacheable=true)
    public static Boolean currentUserIsAdmin() {
        for (PermissionSetAssignment psa : [
            SELECT PermissionSet.Name
            FROM PermissionSetAssignment
            WHERE AssigneeId = :UserInfo.getUserId()
        ]) {
            if (psa.PermissionSet.Name == 'Idea_Admin') {
                return true;
            }
        }
        return false;
    }

    private static void validateStatusTransition(Idea__c idea, String newStatus, String notes) {
        if (newStatus == 'Acknowledged' && idea.Status__c != 'Under Review') {
            throw new AuraHandledException('Acknowledged is only allowed from Under Review.');
        }
        if ((newStatus == 'Implemented' || newStatus == 'Not Pursued') && String.isBlank(notes)) {
            throw new AuraHandledException('Resolution notes are required when closing an idea as Implemented or Not Pursued.');
        }
    }

    private static Integer countWords(String textValue) {
        if (String.isBlank(textValue)) {
            return 0;
        }
        List<String> parts = textValue.trim().split('\\s+');
        Integer count = 0;
        for (String p : parts) {
            if (!String.isBlank(p)) {
                count++;
            }
        }
        return count;
    }

    private static void notifyAdminsNewIdea(Idea__c idea) {
        List<Id> adminUserIds = new List<Id>();
        for (PermissionSetAssignment psa : [
            SELECT AssigneeId, PermissionSet.Name
            FROM PermissionSetAssignment
            WHERE PermissionSet.Name = 'Idea_Admin'
        ]) {
            adminUserIds.add(psa.AssigneeId);
        }
        if (adminUserIds.isEmpty()) {
            return;
        }
        List<User> admins = [
            SELECT Id, Email
            FROM User
            WHERE Id IN :adminUserIds
            AND Email != null
        ];
        if (admins.isEmpty()) {
            return;
        }
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        List<String> toAddresses = new List<String>();
        for (User u : admins) {
            toAddresses.add(u.Email);
        }
        email.setToAddresses(toAddresses);
        email.setSubject('New Idea Submitted: ' + idea.Title__c);
        email.setPlainTextBody('A new idea has been submitted: ' + idea.Title__c + '\n\nDescription:\n' + idea.Description__c);
        Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ email }, false);
    }

    private static void notifySubmitterStatusChange(Idea__c idea) {
        User submitter = [
            SELECT Id, Email
            FROM User
            WHERE Id = :idea.CreatedById
            LIMIT 1
        ];
        if (submitter.Email == null) {
            return;
        }
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new List<String>{ submitter.Email });
        email.setSubject('Your Idea Status Updated: ' + idea.Status__c);
        String body = 'The status of your idea has been updated to ' + idea.Status__c + '.';
        if (!String.isBlank(idea.Resolution_Notes__c)) {
            body += '\n\nResolution notes:\n' + idea.Resolution_Notes__c;
        }
        email.setPlainTextBody(body);
        Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ email }, false);
    }
}

