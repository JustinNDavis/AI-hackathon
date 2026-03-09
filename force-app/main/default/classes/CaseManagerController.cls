/**
 * Controller for Universal Case Management LWC.
 */
public with sharing class CaseManagerController {
    /**
     * Returns object context: objectApiName, recordName, flags (e.g. DELINQUENT).
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getRecordContext(Id recordId) {
        return CaseManagerService.buildContext(recordId);
    }

    /**
     * Returns active Case_Service_Config__mdt records for the given object.
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getServiceConfigs(String objectApiName) {
        if (String.isBlank(objectApiName)) {
            return new List<Map<String, Object>>();
        }
        List<Case_Service_Config__mdt> configs = [
            SELECT DeveloperName, Service_Category__c, Default_Priority__c, SLA_Hours__c,
                Required_Fields__c, Routing_Queue__c, Is_Active__c
            FROM Case_Service_Config__mdt
            WHERE Object_API_Name__c = :objectApiName
                AND Is_Active__c = true
            ORDER BY Service_Category__c
        ];
        List<Map<String, Object>> result = new List<Map<String, Object>>();
        for (Case_Service_Config__mdt c : configs) {
            result.add(new Map<String, Object>{
                'developerName' => c.DeveloperName,
                'serviceCategory' => c.Service_Category__c,
                'defaultPriority' => c.Default_Priority__c,
                'slaHours' => c.SLA_Hours__c != null ? Integer.valueOf(c.SLA_Hours__c) : null,
                'requiredFields' => c.Required_Fields__c,
                'routingQueue' => c.Routing_Queue__c
            });
        }
        return result;
    }

    /**
     * Creates a service request Case. Throws if duplicate open case within 30 days (same Account + category).
     */
    @AuraEnabled
    public static Id createServiceRequest(
        String recordId,
        String objectApiName,
        String serviceCategory,
        String subject,
        String description,
        String priority
    ) {
        Id recId = (Id) recordId;
        Id accountId = resolveAccountId(recId, objectApiName);
        if (CaseManagerService.checkDuplicate(accountId, serviceCategory)) {
            throw new AuraHandledException('An open case for this service category already exists for this account within the last 30 days.');
        }
        Map<String, Object> context = CaseManagerService.buildContext(recId);
        String resolvedPriority = CaseManagerService.resolvePriority(priority, context);

        Case_Service_Config__mdt config = getConfigForCategory(objectApiName, serviceCategory);
        String queueName = config != null ? config.Routing_Queue__c : null;

        Case c = new Case(
            Subject = subject,
            Description = description,
            Priority = resolvedPriority,
            Status = 'New',
            Origin = 'Web',
            Related_Object_Type__c = objectApiName,
            Related_Record_Id__c = recordId,
            Service_Category__c = serviceCategory,
            AccountId = accountId
        );
        CaseManagerService.assignToQueue(c, queueName);
        insert c;
        return c.Id;
    }

    private static Id resolveAccountId(Id recordId, String objectApiName) {
        if (objectApiName == 'Account') {
            return recordId;
        }
        if (objectApiName == 'Loan__c') {
            List<Loan__c> rows = [SELECT Account__c FROM Loan__c WHERE Id = :recordId LIMIT 1];
            return rows.isEmpty() ? null : rows[0].Account__c;
        }
        if (objectApiName == 'Deposit__c') {
            List<Deposit__c> rows = [SELECT Account__c FROM Deposit__c WHERE Id = :recordId LIMIT 1];
            return rows.isEmpty() ? null : rows[0].Account__c;
        }
        return null;
    }

    private static Case_Service_Config__mdt getConfigForCategory(String objectApiName, String serviceCategory) {
        List<Case_Service_Config__mdt> configs = [
            SELECT Routing_Queue__c
            FROM Case_Service_Config__mdt
            WHERE Object_API_Name__c = :objectApiName
                AND Service_Category__c = :serviceCategory
                AND Is_Active__c = true
            LIMIT 1
        ];
        return configs.isEmpty() ? null : configs[0];
    }

    /**
     * Returns open/recent cases related to the record (by Related_Record_Id__c or AccountId).
     * Not cacheable so the list refreshes after creating or closing a case.
     */
    @AuraEnabled
    public static List<Case> getRelatedCases(Id recordId) {
        if (recordId == null) {
            return new List<Case>();
        }
        return [
            SELECT Id, Subject, Service_Category__c, Status, Priority, CreatedDate
            FROM Case
            WHERE Related_Record_Id__c = :String.valueOf(recordId)
                OR AccountId = :recordId
            ORDER BY CreatedDate DESC
            LIMIT 100
        ];
    }

    @AuraEnabled
    public static void closeCase(Id caseId) {
        if (caseId == null) return;
        Case c = new Case(Id = caseId, Status = 'Closed');
        update c;
    }

    /**
     * Returns related loans and deposits for an account.
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, List<SObject>> getRelatedRecords(Id accountId) {
        Map<String, List<SObject>> result = new Map<String, List<SObject>>();
        result.put('loans', new List<Loan__c>());
        result.put('deposits', new List<Deposit__c>());
        if (accountId == null) return result;
        result.put('loans', [SELECT Id, Name, Principal_Amount__c, Loan_Amount__c, Status__c, Loan_Status__c FROM Loan__c WHERE Account__c = :accountId ORDER BY Name LIMIT 50]);
        result.put('deposits', [SELECT Id, Name, Amount__c, Balance__c, Deposit_Type__c, Account_Type__c, Account_Number__c FROM Deposit__c WHERE Account__c = :accountId ORDER BY Name LIMIT 50]);
        return result;
    }

    /**
     * Returns related collateral for a loan.
     */
    @AuraEnabled(cacheable=true)
    public static List<Collateral__c> getRelatedCollateral(Id loanId) {
        if (loanId == null) return new List<Collateral__c>();
        return [SELECT Id, Name, Type__c, Collateral_Type__c, Value__c, Estimated_Value__c FROM Collateral__c WHERE Loan__c = :loanId ORDER BY Name LIMIT 50];
    }
}