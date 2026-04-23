/**
 * DAO_Application__c persistence, full wizard JSON snapshot, junction products, and Person Account search.
 */
public with sharing class DAO_ApplicationController {
    @AuraEnabled
    public static Id createApplication() {
        DAO_Application__c app = new DAO_Application__c(
            Status__c = 'Draft',
            Current_Step__c = 1,
            Application_Date__c = Date.today()
        );
        insert app;
        return app.Id;
    }

    /**
     * Deserializes wizard JSON, updates the application header, replaces Application_Product__c rows, stores full payload.
     */
    @AuraEnabled
    public static Id saveApplication(String applicationJson) {
        if (String.isBlank(applicationJson)) {
            throw new AuraHandledException('applicationJson is required.');
        }

        Map<String, Object> root;
        try {
            root = (Map<String, Object>) JSON.deserializeUntyped(applicationJson);
        } catch (Exception e) {
            throw new AuraHandledException('Invalid application JSON: ' + e.getMessage());
        }

        Object idObj = root.get('applicationId');
        if (idObj == null) {
            throw new AuraHandledException('applicationId is required in JSON.');
        }
        Id appId;
        try {
            appId = (Id) String.valueOf(idObj);
        } catch (Exception e) {
            throw new AuraHandledException('Invalid application Id.');
        }

        DAO_Application__c app = new DAO_Application__c(Id = appId);

        Object stepObj = root.get('currentStepId');
        if (stepObj != null) {
            app.Current_Step__c = Decimal.valueOf(String.valueOf(stepObj));
        }

        app.Status__c = 'In Progress';
        app.Wizard_Payload__c = applicationJson;

        Object pa = root.get('personAccountId');
        if (pa != null) {
            try {
                app.Person_Account__c = (Id) String.valueOf(pa);
            } catch (Exception e) {
                /* ignore invalid id */
            }
        }

        Map<String, Object> customerLookup = childMap(root, 'customerLookup');
        if (customerLookup != null && customerLookup.containsKey('isNew')) {
            Boolean isNew = (Boolean) customerLookup.get('isNew');
            app.Customer_Type__c = isNew == true ? 'New' : 'Existing';
        }

        Object aetObj = root.get('applicantEntityType');
        if (aetObj != null) {
            String aet = String.valueOf(aetObj).trim();
            if (aet.equalsIgnoreCase('Business')) {
                app.Applicant_Entity_Type__c = 'Business';
            } else if (aet.equalsIgnoreCase('Individual')) {
                app.Applicant_Entity_Type__c = 'Individual';
            }
        }

        if (root.containsKey('parties')) {
            app.Party_Data__c = JSON.serialize(root.get('parties'));
        }

        Map<String, Object> alloy = childMap(root, 'alloyKycResult');
        String kyc = mapKycDecision(alloy);
        if (kyc != null) {
            app.KYC_Status__c = kyc;
        }

        Map<String, Object> chex = childMap(root, 'chexSystemsResult');
        String chexSt = mapChexStatus(chex);
        if (chexSt != null) {
            app.ChexSystems_Status__c = chexSt;
        }

        Map<String, Object> funding = childMap(root, 'funding');
        String fund = mapFundingMethod(funding);
        if (fund != null) {
            app.Funding_Method__c = fund;
        }

        update app;

        List<DAO_Application_Product__c> existing = [
            SELECT Id FROM DAO_Application_Product__c WHERE DAO_Application__c = :appId
        ];
        if (!existing.isEmpty()) {
            delete existing;
        }

        List<DAO_Application_Product__c> lines = buildProductLines(appId, root.get('selectedProducts'));
        if (!lines.isEmpty()) {
            insert lines;
        }

        return appId;
    }

    /**
     * Full wizard state JSON (Wizard_Payload__c) merged with header + junction when payload is sparse.
     */
    @AuraEnabled(cacheable = true)
    public static String getApplication(String applicationId) {
        if (String.isBlank(applicationId)) {
            throw new AuraHandledException('applicationId is required.');
        }
        Id appId = (Id) applicationId;

        List<DAO_Application__c> rows = [
            SELECT
                Id,
                Name,
                Status__c,
                Current_Step__c,
                Customer_Type__c,
                Applicant_Entity_Type__c,
                Person_Account__c,
                Application_Date__c,
                KYC_Status__c,
                ChexSystems_Status__c,
                Funding_Method__c,
                Wizard_Payload__c,
                Party_Data__c,
                (SELECT Id, Product__c FROM Application_Products__r ORDER BY Id)
            FROM DAO_Application__c
            WHERE Id = :appId
            LIMIT 1
        ];

        if (rows.isEmpty()) {
            throw new AuraHandledException('Application not found.');
        }

        DAO_Application__c rec = rows[0];
        Map<String, Object> root;

        if (String.isNotBlank(rec.Wizard_Payload__c)) {
            try {
                root = (Map<String, Object>) JSON.deserializeUntyped(rec.Wizard_Payload__c);
            } catch (Exception e) {
                root = new Map<String, Object>();
            }
        } else {
            root = new Map<String, Object>();
        }

        root.put('applicationId', rec.Id);

        if (rec.Current_Step__c != null) {
            root.put('currentStepId', rec.Current_Step__c.intValue());
        }

        if (rec.Person_Account__c != null) {
            root.put('personAccountId', rec.Person_Account__c);
        }

        if (String.isNotBlank(rec.Applicant_Entity_Type__c)) {
            root.put('applicantEntityType', rec.Applicant_Entity_Type__c);
        }

        List<Object> sel = asList(root.get('selectedProducts'));
        if (sel == null || sel.isEmpty()) {
            root.put('selectedProducts', buildSelectedProductsFromLines(rec.Application_Products__r));
        }

        if (String.isNotBlank(rec.Party_Data__c) && !root.containsKey('parties')) {
            try {
                root.put('parties', JSON.deserializeUntyped(rec.Party_Data__c));
            } catch (Exception e) {
                /* keep without parties */
            }
        }

        return JSON.serialize(root);
    }

    /**
     * Customer search for lookup: Individual → Person Accounts (or DAO person-shaped Accounts); Business → business Accounts.
     */
    @AuraEnabled(cacheable = true)
    public static List<DAO_CustomerLookupController.PersonAccountResult> searchAccounts(
        String searchTerm,
        String applicantEntityType
    ) {
        String aet = String.isBlank(applicantEntityType) ? 'Individual' : applicantEntityType;
        return DAO_CustomerLookupController.searchCustomers(searchTerm, aet);
    }

    // --- saveApplication helpers ---

    private static Map<String, Object> childMap(Map<String, Object> root, String key) {
        if (root == null || !root.containsKey(key)) {
            return null;
        }
        Object o = root.get(key);
        if (o instanceof Map<String, Object>) {
            return (Map<String, Object>) o;
        }
        return null;
    }

    private static String mapKycDecision(Map<String, Object> alloy) {
        if (alloy == null || !alloy.containsKey('decision')) {
            return null;
        }
        String s = String.valueOf(alloy.get('decision')).toLowerCase();
        if (s == 'approved') {
            return 'Pass';
        }
        if (s == 'review') {
            return 'Review';
        }
        if (s == 'declined' || s == 'denied' || s == 'reject' || s == 'rejected') {
            return 'Fail';
        }
        if (s == 'error') {
            return 'Pending';
        }
        return null;
    }

    private static String mapChexStatus(Map<String, Object> chex) {
        if (chex == null || !chex.containsKey('status')) {
            return null;
        }
        String s = String.valueOf(chex.get('status')).toLowerCase();
        if (s == 'not_applicable') {
            return null;
        }
        if (s == 'clear') {
            return 'Clear';
        }
        if (s == 'review' || s == 'decline') {
            return 'Hit';
        }
        return 'Pending';
    }

    private static String mapFundingMethod(Map<String, Object> funding) {
        if (funding == null || !funding.containsKey('method')) {
            return null;
        }
        String m = String.valueOf(funding.get('method')).toLowerCase();
        if (m == 'plaid') {
            return 'Plaid';
        }
        if (m == 'swivel') {
            return 'Wire';
        }
        if (m == 'fund_later') {
            return 'Other';
        }
        return null;
    }

    private static List<DAO_Application_Product__c> buildProductLines(Id appId, Object selectedRaw) {
        List<DAO_Application_Product__c> lines = new List<DAO_Application_Product__c>();
        List<Object> items = asList(selectedRaw);
        if (items == null) {
            return lines;
        }

        Set<String> seen = new Set<String>();
        for (Object o : items) {
            String pick = null;
            if (o instanceof String) {
                pick = mapProductKeyToPicklist((String) o);
            } else if (o instanceof Map<String, Object>) {
                Map<String, Object> pm = (Map<String, Object>) o;
                Object idObj = pm.get('id');
                String idStr = idObj != null ? String.valueOf(idObj) : '';
                pick = mapProductKeyToPicklist(idStr);
            }
            if (pick != null && !seen.contains(pick)) {
                seen.add(pick);
                lines.add(new DAO_Application_Product__c(DAO_Application__c = appId, Product__c = pick));
            }
        }
        return lines;
    }

    private static String mapProductKeyToPicklist(String key) {
        if (String.isBlank(key)) {
            return null;
        }
        String b = key.toLowerCase();
        if (b.contains('checking')) {
            return 'Checking';
        }
        if (b.contains('savings') && !b.contains('market')) {
            return 'Savings';
        }
        if (b.contains('money') || b.contains('mma')) {
            return 'MMA';
        }
        if (b.contains('cd') || b.contains('certificate')) {
            return 'CD';
        }
        if (b.contains('ira')) {
            return 'IRA';
        }
        return null;
    }

    private static List<Object> asList(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof List<Object>) {
            return (List<Object>) o;
        }
        return null;
    }

    private static List<Map<String, Object>> buildSelectedProductsFromLines(List<DAO_Application_Product__c> lines) {
        List<Map<String, Object>> out = new List<Map<String, Object>>();
        if (lines == null) {
            return out;
        }
        for (DAO_Application_Product__c li : lines) {
            String cid = picklistToCatalogId(li.Product__c);
            if (cid != null) {
                out.add(
                    new Map<String, Object>{
                        'id' => cid,
                        'productName' => catalogDisplayName(cid)
                    }
                );
            }
        }
        return out;
    }

    private static String picklistToCatalogId(String picklistVal) {
        if (picklistVal == 'Checking') {
            return 'Free_Checking';
        }
        if (picklistVal == 'Savings') {
            return 'Regular_Savings';
        }
        if (picklistVal == 'MMA') {
            return 'Money_Market';
        }
        if (picklistVal == 'CD') {
            return 'CD_12_Month';
        }
        if (picklistVal == 'IRA') {
            return 'IRA';
        }
        return null;
    }

    private static String catalogDisplayName(String catalogId) {
        if (catalogId == 'Free_Checking') {
            return 'Free Checking';
        }
        if (catalogId == 'Interest_Checking') {
            return 'Interest Checking';
        }
        if (catalogId == 'Regular_Savings') {
            return 'Regular Savings';
        }
        if (catalogId == 'Money_Market') {
            return 'Money Market';
        }
        if (catalogId == 'CD_12_Month') {
            return '12-Month CD';
        }
        if (catalogId == 'IRA') {
            return 'IRA';
        }
        return catalogId;
    }

    @AuraEnabled
    public static void saveStep(Id applicationId, Decimal stepNumber, String status, String wizardPayloadJson) {
        DAO_Application__c app = new DAO_Application__c(
            Id = applicationId,
            Current_Step__c = stepNumber,
            Status__c = status,
            Wizard_Payload__c = wizardPayloadJson
        );
        update app;
    }

    @AuraEnabled
    public static void saveCustomerType(Id applicationId, String customerType) {
        update new DAO_Application__c(Id = applicationId, Customer_Type__c = customerType);
    }

    @AuraEnabled
    public static void savePersonAccount(Id applicationId, Id personAccountId) {
        update new DAO_Application__c(Id = applicationId, Person_Account__c = personAccountId);
    }

    @AuraEnabled
    public static void savePartyData(Id applicationId, String partyDataJson) {
        update new DAO_Application__c(Id = applicationId, Party_Data__c = partyDataJson);
    }

    @AuraEnabled
    public static void saveIntegrationFlags(
        Id applicationId,
        String kycStatus,
        String chexStatus,
        String fundingMethod
    ) {
        DAO_Application__c app = new DAO_Application__c(Id = applicationId);
        if (String.isNotBlank(kycStatus)) {
            app.KYC_Status__c = kycStatus;
        }
        if (String.isNotBlank(chexStatus)) {
            app.ChexSystems_Status__c = chexStatus;
        }
        if (String.isNotBlank(fundingMethod)) {
            app.Funding_Method__c = fundingMethod;
        }
        update app;
    }
}
