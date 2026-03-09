/**
 * Business logic for Universal Case Management: context, duplicate check, priority, queue assignment.
 */
public with sharing class CaseManagerService {
    private static final Integer DUPLICATE_DAYS = 30;
    private static final String DELINQUENT_STATUS = 'Delinquent';
    private static final String CRITICAL_PRIORITY = 'Critical';

    /**
     * Builds record context: object type, name, and flags (e.g. DELINQUENT).
     */
    public static Map<String, Object> buildContext(Id recordId) {
        if (recordId == null) {
            return new Map<String, Object>{ 'objectApiName' => null, 'recordName' => null, 'flags' => new List<String>() };
        }
        String sobjectType = recordId.getSobjectType().getDescribe().getName();
        String recordName = '';
        List<String> flags = new List<String>();

        if (sobjectType == 'Account') {
            List<Account> rows = [SELECT Id, Name FROM Account WHERE Id = :recordId LIMIT 1];
            if (!rows.isEmpty()) {
                recordName = rows[0].Name;
            }
        } else if (sobjectType == 'Loan__c') {
            List<Loan__c> rows = [
                SELECT Id, Name, Loan_Status__c, Status__c
                FROM Loan__c
                WHERE Id = :recordId
                LIMIT 1
            ];
            if (!rows.isEmpty()) {
                recordName = rows[0].Name;
                String loanStatus = rows[0].Loan_Status__c != null ? rows[0].Loan_Status__c : (rows[0].Status__c != null ? rows[0].Status__c : '');
                if (loanStatus == DELINQUENT_STATUS) {
                    flags.add('DELINQUENT');
                }
            }
        } else if (sobjectType == 'Deposit__c') {
            List<Deposit__c> rows = [SELECT Id, Name FROM Deposit__c WHERE Id = :recordId LIMIT 1];
            if (!rows.isEmpty()) {
                recordName = rows[0].Name;
            }
        }

        return new Map<String, Object>{
            'objectApiName' => sobjectType,
            'recordName' => recordName,
            'flags' => flags
        };
    }

    /**
     * Returns true if an open case exists for this account + service category within the duplicate window.
     */
    public static Boolean checkDuplicate(Id accountId, String serviceCategory) {
        if (accountId == null || String.isBlank(serviceCategory)) {
            return false;
        }
        Date since = Date.today().addDays(-DUPLICATE_DAYS);
        Integer count = [
            SELECT COUNT()
            FROM Case
            WHERE AccountId = :accountId
                AND Service_Category__c = :serviceCategory
                AND Status != 'Closed'
                AND CreatedDate >= :since
        ];
        return count > 0;
    }

    /**
     * Resolves priority: escalates to Critical if context has DELINQUENT flag.
     */
    public static String resolvePriority(String metadataPriority, Map<String, Object> context) {
        List<Object> flagsObj = (List<Object>) (context != null && context.containsKey('flags') ? context.get('flags') : new List<Object>());
        List<String> flags = new List<String>();
        for (Object o : flagsObj) {
            if (o != null) flags.add(String.valueOf(o));
        }
        for (String f : flags) {
            if (f == 'DELINQUENT') {
                return CRITICAL_PRIORITY;
            }
        }
        return String.isNotBlank(metadataPriority) ? metadataPriority : 'Medium';
    }

    /**
     * Sets Case.OwnerId to the queue with the given developer name, if found.
     */
    public static void assignToQueue(Case c, String queueApiName) {
        if (c == null || String.isBlank(queueApiName)) {
            return;
        }
        List<Group> queues = [SELECT Id FROM Group WHERE Type = 'Queue' AND DeveloperName = :queueApiName LIMIT 1];
        if (!queues.isEmpty()) {
            c.OwnerId = queues[0].Id;
        }
    }
}