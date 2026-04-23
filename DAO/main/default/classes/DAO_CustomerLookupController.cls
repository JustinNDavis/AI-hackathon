/**
 * Customer search: Person Accounts (individual) or business Accounts; net-new creation for each path.
 */
public with sharing class DAO_CustomerLookupController {
    public class PersonAccountResult {
        @AuraEnabled
        public String id;
        /** PERSON | BUSINESS — drives UI and downstream wizard behavior. */
        @AuraEnabled
        public String entityKind;
        @AuraEnabled
        public String firstName;
        @AuraEnabled
        public String lastName;
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String personEmail;
        @AuraEnabled
        public String phone;
        /** Person Account mobile (distinct from Phone / home when populated). */
        @AuraEnabled
        public String personMobilePhone;
        @AuraEnabled
        public String personHomePhone;
        @AuraEnabled
        public String personBirthdate;
        @AuraEnabled
        public String personMailingStreet;
        @AuraEnabled
        public String personMailingCity;
        @AuraEnabled
        public String personMailingState;
        @AuraEnabled
        public String personMailingPostalCode;
        @AuraEnabled
        public String ssnLast4;
        /** Last four of EIN for business entities (DAO field). */
        @AuraEnabled
        public String einLast4;
        @AuraEnabled
        public String dbaName;
        /** Account billing (may differ from person mailing). */
        @AuraEnabled
        public String billingStreet;
        @AuraEnabled
        public String billingCity;
        @AuraEnabled
        public String billingState;
        @AuraEnabled
        public String billingPostalCode;
        @AuraEnabled
        public String accountNumber;
        @AuraEnabled
        public String website;
        /** Account.Type picklist API value. */
        @AuraEnabled
        public String accountType;
    }

    public class PersonAccountForm {
        @AuraEnabled
        public String firstName;
        @AuraEnabled
        public String lastName;
        @AuraEnabled
        public String personEmail;
        @AuraEnabled
        public String phone;
        @AuraEnabled
        public Date personBirthdate;
        @AuraEnabled
        public String personMailingStreet;
        @AuraEnabled
        public String personMailingCity;
        @AuraEnabled
        public String personMailingState;
        @AuraEnabled
        public String personMailingPostalCode;
        @AuraEnabled
        public String ssnInput;
    }

    @AuraEnabled(cacheable=true)
    public static List<PersonAccountResult> searchPersonAccounts(String searchKey) {
        return searchCustomers(searchKey, 'Individual');
    }

    /**
     * @param applicantEntityType Individual | Business (case-insensitive). Defaults to Individual when blank.
     */
    @AuraEnabled(cacheable=true)
    public static List<PersonAccountResult> searchCustomers(String searchKey, String applicantEntityType) {
        if (String.isBlank(searchKey) || searchKey.trim().length() < 2) {
            return new List<PersonAccountResult>();
        }

        String raw = searchKey.trim();
        String likeTerm = buildLikeTerm(raw);
        Boolean fourDigits = raw.length() == 4 && Pattern.compile('^[0-9]{4}$').matcher(raw).matches();

        Boolean forBusiness =
            String.isNotBlank(applicantEntityType) && applicantEntityType.trim().equalsIgnoreCase('Business');

        if (forBusiness) {
            return searchBusinessEntityAccounts(likeTerm, raw, fourDigits);
        }

        if (orgHasPersonAccountFields()) {
            return searchPersonAccountsImpl(likeTerm, raw, fourDigits);
        }
        return searchBusinessStyleAccounts(likeTerm, raw, fourDigits);
    }

    private static Boolean orgHasPersonAccountFields() {
        Map<String, Schema.SObjectField> m = Account.SObjectType.getDescribe().fields.getMap();
        return m.containsKey('firstname') && m.containsKey('lastname') && m.containsKey('personemail');
    }

    /** True when Account has IsPersonAccount (Person Accounts / typical FSC orgs). Omit from SOQL when false. */
    private static Boolean accountHasIsPersonAccountField() {
        return Account.SObjectType.getDescribe().fields.getMap().containsKey('ispersonaccount');
    }

    private static List<PersonAccountResult> searchPersonAccountsImpl(String likeTerm, String raw, Boolean fourDigits) {
        if (!accountHasIsPersonAccountField()) {
            return searchBusinessStyleAccounts(likeTerm, raw, fourDigits);
        }
        String soql =
            'SELECT Id, FirstName, LastName, Name, PersonEmail, Phone, PersonMobilePhone, PersonHomePhone, PersonBirthdate, ' +
            'PersonMailingStreet, PersonMailingCity, PersonMailingState, PersonMailingPostalCode, ' +
            'BillingStreet, BillingCity, BillingState, BillingPostalCode, AccountNumber, Website, Type, DAO_SSN_Last_4__c ' +
            'FROM Account WHERE IsPersonAccount = TRUE AND (Name LIKE :likeTerm OR FirstName LIKE :likeTerm OR ' +
            'LastName LIKE :likeTerm OR PersonEmail LIKE :likeTerm OR AccountNumber LIKE :likeTerm OR Website LIKE :likeTerm OR ' +
            'Type LIKE :likeTerm OR BillingStreet LIKE :likeTerm OR BillingCity LIKE :likeTerm';
        if (fourDigits) {
            soql += ' OR DAO_SSN_Last_4__c = :raw';
        }
        soql += ') ORDER BY LastName, FirstName LIMIT 50';

        List<SObject> rows = Database.query(soql);

        List<PersonAccountResult> out = new List<PersonAccountResult>();
        for (SObject row : rows) {
            out.add(toPersonResult(row));
        }
        return out;
    }

    private static List<PersonAccountResult> searchBusinessEntityAccounts(String likeTerm, String raw, Boolean fourDigits) {
        String paFilter = '';
        if (accountHasIsPersonAccountField()) {
            paFilter = 'IsPersonAccount = FALSE AND ';
        }
        String soql =
            'SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState, BillingPostalCode, AccountNumber, Website, Type, ' +
            'DAO_Person_Email__c, DAO_EIN_Last_4__c, DAO_DBA_Name__c ' +
            'FROM Account WHERE ' +
            paFilter;
        if (fourDigits) {
            soql +=
                '(Name LIKE :likeTerm OR Phone LIKE :likeTerm OR DAO_Person_Email__c LIKE :likeTerm OR AccountNumber LIKE :likeTerm OR ' +
                'Website LIKE :likeTerm OR Type LIKE :likeTerm OR BillingStreet LIKE :likeTerm OR BillingCity LIKE :likeTerm OR ' +
                'DAO_DBA_Name__c LIKE :likeTerm OR DAO_EIN_Last_4__c = :raw)';
        } else {
            soql +=
                '(Name LIKE :likeTerm OR Phone LIKE :likeTerm OR DAO_Person_Email__c LIKE :likeTerm OR AccountNumber LIKE :likeTerm OR ' +
                'Website LIKE :likeTerm OR Type LIKE :likeTerm OR BillingStreet LIKE :likeTerm OR BillingCity LIKE :likeTerm OR ' +
                'DAO_DBA_Name__c LIKE :likeTerm)';
        }
        soql += ' ORDER BY Name LIMIT 50';

        List<SObject> rows = Database.query(soql);

        List<PersonAccountResult> out = new List<PersonAccountResult>();
        for (SObject row : rows) {
            out.add(toBusinessEntityResult(row));
        }
        return out;
    }

    private static List<PersonAccountResult> searchBusinessStyleAccounts(String likeTerm, String raw, Boolean fourDigits) {
        String soql =
            'SELECT Id, Name, Phone, BillingStreet, BillingCity, BillingState, BillingPostalCode, AccountNumber, Website, Type, ' +
            'DAO_SSN_Last_4__c, DAO_Person_Email__c ' +
            'FROM Account WHERE ';
        if (fourDigits) {
            soql +=
                '(Name LIKE :likeTerm OR Phone LIKE :likeTerm OR DAO_Person_Email__c LIKE :likeTerm OR AccountNumber LIKE :likeTerm OR ' +
                'Website LIKE :likeTerm OR Type LIKE :likeTerm OR BillingStreet LIKE :likeTerm OR BillingCity LIKE :likeTerm OR ' +
                'DAO_SSN_Last_4__c = :raw)';
        } else {
            soql +=
                '(Name LIKE :likeTerm OR Phone LIKE :likeTerm OR DAO_Person_Email__c LIKE :likeTerm OR AccountNumber LIKE :likeTerm OR ' +
                'Website LIKE :likeTerm OR Type LIKE :likeTerm OR BillingStreet LIKE :likeTerm OR BillingCity LIKE :likeTerm)';
        }
        soql += ' ORDER BY Name LIMIT 50';

        List<SObject> rows = Database.query(soql);

        List<PersonAccountResult> out = new List<PersonAccountResult>();
        for (SObject row : rows) {
            out.add(toBusinessStyleResult(row));
        }
        return out;
    }

    private static String buildLikeTerm(String raw) {
        String cleaned = raw.replace('%', '').replace('_', '');
        return '%' + cleaned + '%';
    }

    private static PersonAccountResult toPersonResult(SObject a) {
        PersonAccountResult r = new PersonAccountResult();
        r.entityKind = 'PERSON';
        r.id = a.get('Id') != null ? String.valueOf(a.get('Id')) : null;
        r.firstName = (String) a.get('FirstName');
        r.lastName = (String) a.get('LastName');
        r.name = (String) a.get('Name');
        r.personEmail = (String) a.get('PersonEmail');
        r.personMobilePhone = (String) a.get('PersonMobilePhone');
        r.personHomePhone = (String) a.get('PersonHomePhone');
        r.phone = (String) a.get('Phone');
        Object bd = a.get('PersonBirthdate');
        r.personBirthdate = bd != null ? String.valueOf(bd) : null;
        r.personMailingStreet = (String) a.get('PersonMailingStreet');
        r.personMailingCity = (String) a.get('PersonMailingCity');
        r.personMailingState = (String) a.get('PersonMailingState');
        r.personMailingPostalCode = (String) a.get('PersonMailingPostalCode');
        r.ssnLast4 = (String) a.get('DAO_SSN_Last_4__c');
        r.einLast4 = null;
        r.dbaName = null;
        r.billingStreet = (String) a.get('BillingStreet');
        r.billingCity = (String) a.get('BillingCity');
        r.billingState = (String) a.get('BillingState');
        r.billingPostalCode = (String) a.get('BillingPostalCode');
        r.accountNumber = (String) a.get('AccountNumber');
        r.website = (String) a.get('Website');
        r.accountType = (String) a.get('Type');
        return r;
    }

    private static PersonAccountResult toBusinessStyleResult(SObject a) {
        PersonAccountResult r = new PersonAccountResult();
        r.entityKind = 'PERSON';
        r.id = a.get('Id') != null ? String.valueOf(a.get('Id')) : null;
        r.firstName = null;
        r.lastName = null;
        r.name = (String) a.get('Name');
        r.personEmail = (String) a.get('DAO_Person_Email__c');
        r.phone = (String) a.get('Phone');
        r.personBirthdate = null;
        r.personMailingStreet = (String) a.get('BillingStreet');
        r.personMailingCity = (String) a.get('BillingCity');
        r.personMailingState = (String) a.get('BillingState');
        r.personMailingPostalCode = (String) a.get('BillingPostalCode');
        r.ssnLast4 = (String) a.get('DAO_SSN_Last_4__c');
        r.einLast4 = null;
        r.dbaName = null;
        r.billingStreet = (String) a.get('BillingStreet');
        r.billingCity = (String) a.get('BillingCity');
        r.billingState = (String) a.get('BillingState');
        r.billingPostalCode = (String) a.get('BillingPostalCode');
        r.accountNumber = (String) a.get('AccountNumber');
        r.website = (String) a.get('Website');
        r.accountType = (String) a.get('Type');
        return r;
    }

    private static PersonAccountResult toBusinessEntityResult(SObject a) {
        PersonAccountResult r = new PersonAccountResult();
        r.entityKind = 'BUSINESS';
        r.id = a.get('Id') != null ? String.valueOf(a.get('Id')) : null;
        r.firstName = null;
        r.lastName = null;
        r.name = (String) a.get('Name');
        r.personEmail = (String) a.get('DAO_Person_Email__c');
        r.phone = (String) a.get('Phone');
        r.personBirthdate = null;
        r.personMailingStreet = (String) a.get('BillingStreet');
        r.personMailingCity = (String) a.get('BillingCity');
        r.personMailingState = (String) a.get('BillingState');
        r.personMailingPostalCode = (String) a.get('BillingPostalCode');
        r.ssnLast4 = null;
        r.einLast4 = (String) a.get('DAO_EIN_Last_4__c');
        r.dbaName = (String) a.get('DAO_DBA_Name__c');
        r.billingStreet = (String) a.get('BillingStreet');
        r.billingCity = (String) a.get('BillingCity');
        r.billingState = (String) a.get('BillingState');
        r.billingPostalCode = (String) a.get('BillingPostalCode');
        r.accountNumber = (String) a.get('AccountNumber');
        r.website = (String) a.get('Website');
        r.accountType = (String) a.get('Type');
        return r;
    }

    /**
     * Primitive parameters avoid LWC→Apex DTO deserialization issues with nested types.
     * personBirthdateStr: ISO date yyyy-MM-dd from lightning-input type="date", or null.
     */
    @AuraEnabled
    public static Id createNetNewPersonAccount(
        String lastName,
        String firstName,
        String personEmail,
        String phone,
        String personBirthdateStr,
        String personMailingStreet,
        String personMailingCity,
        String personMailingState,
        String personMailingPostalCode,
        String ssnInput
    ) {
        if (String.isBlank(lastName)) {
            throw new AuraHandledException('Last name is required.');
        }

        PersonAccountForm form = new PersonAccountForm();
        form.lastName = lastName.trim();
        form.firstName = firstName;
        form.personEmail = personEmail;
        form.phone = phone;
        form.personMailingStreet = personMailingStreet;
        form.personMailingCity = personMailingCity;
        form.personMailingState = personMailingState;
        form.personMailingPostalCode = personMailingPostalCode;
        form.ssnInput = ssnInput;
        if (String.isNotBlank(personBirthdateStr)) {
            try {
                form.personBirthdate = Date.valueOf(personBirthdateStr.trim());
            } catch (Exception e) {
                form.personBirthdate = null;
            }
        }

        String last4 = deriveSsnLast4(form.ssnInput);

        if (orgHasPersonAccountFields()) {
            return insertPersonAccount(form, last4);
        }
        return insertBusinessStyleAccount(form, last4);
    }

    /**
     * Creates a business Account (IsPersonAccount = false). Requires a non–Person Account record type when Person Accounts are enabled.
     */
    @AuraEnabled
    public static Id createNetNewBusinessAccount(
        String legalName,
        String dbaName,
        String businessEmail,
        String phone,
        String website,
        String billingStreet,
        String billingCity,
        String billingState,
        String billingPostalCode,
        String einInput
    ) {
        if (String.isBlank(legalName)) {
            throw new AuraHandledException('Legal business name is required.');
        }

        String einLast4 = deriveSsnLast4(einInput);

        Id rtId = resolveBusinessAccountRecordTypeId();
        if (orgHasPersonAccountFields() && rtId == null) {
            throw new AuraHandledException(
                'No business Account record type found. Add or expose a non–Person Account record type for business customers.'
            );
        }

        SObject a = Account.SObjectType.newSObject(null, true);
        if (rtId != null) {
            a.put('RecordTypeId', rtId);
        }
        a.put('Name', legalName.trim());
        putIfFieldExists(a, 'Phone', phone);
        putIfFieldExists(a, 'Website', website);
        putIfFieldExists(a, 'BillingStreet', billingStreet);
        putIfFieldExists(a, 'BillingCity', billingCity);
        putIfFieldExists(a, 'BillingState', billingState);
        putIfFieldExists(a, 'BillingPostalCode', billingPostalCode);
        putIfFieldExists(a, 'DAO_Person_Email__c', businessEmail);
        putIfFieldExists(a, 'DAO_EIN_Last_4__c', einLast4);
        putIfFieldExists(a, 'DAO_DBA_Name__c', dbaName);
        insert a;
        return (Id) a.get('Id');
    }

    private static Id insertPersonAccount(PersonAccountForm form, String last4) {
        Id rtId = resolvePersonAccountRecordTypeId();
        if (rtId == null) {
            throw new AuraHandledException('No Person Account record type found (DeveloperName PersonAccount).');
        }

        SObject a = Account.SObjectType.newSObject(null, true);
        a.put('RecordTypeId', rtId);
        putIfFieldExists(a, 'FirstName', form.firstName);
        putIfFieldExists(a, 'LastName', form.lastName);
        putIfFieldExists(a, 'PersonEmail', form.personEmail);
        putIfFieldExists(a, 'Phone', form.phone);
        putIfFieldExists(a, 'PersonBirthdate', form.personBirthdate);
        putIfFieldExists(a, 'PersonMailingStreet', form.personMailingStreet);
        putIfFieldExists(a, 'PersonMailingCity', form.personMailingCity);
        putIfFieldExists(a, 'PersonMailingState', form.personMailingState);
        putIfFieldExists(a, 'PersonMailingPostalCode', form.personMailingPostalCode);
        putIfFieldExists(a, 'DAO_SSN_Last_4__c', last4);
        insert a;
        return (Id) a.get('Id');
    }

    private static void putIfFieldExists(SObject record, String apiName, Object value) {
        if (value == null || (value instanceof String && String.isBlank((String) value))) {
            return;
        }
        Map<String, Schema.SObjectField> fm = record.getSObjectType().getDescribe().fields.getMap();
        if (fm.containsKey(apiName.toLowerCase())) {
            record.put(apiName, value);
        }
    }

    private static Id insertBusinessStyleAccount(PersonAccountForm form, String last4) {
        String fn = String.isBlank(form.firstName) ? '' : form.firstName.trim();
        String ln = form.lastName.trim();
        String acctName = (fn + ' ' + ln).trim();

        SObject a = Account.SObjectType.newSObject(null, true);
        a.put('Name', acctName);
        putIfFieldExists(a, 'Phone', form.phone);
        putIfFieldExists(a, 'BillingStreet', form.personMailingStreet);
        putIfFieldExists(a, 'BillingCity', form.personMailingCity);
        putIfFieldExists(a, 'BillingState', form.personMailingState);
        putIfFieldExists(a, 'BillingPostalCode', form.personMailingPostalCode);
        putIfFieldExists(a, 'DAO_Person_Email__c', form.personEmail);
        putIfFieldExists(a, 'DAO_SSN_Last_4__c', last4);
        insert a;
        return (Id) a.get('Id');
    }

    private static Id resolvePersonAccountRecordTypeId() {
        Map<String, Schema.RecordTypeInfo> byDevName = Account.SObjectType.getDescribe().getRecordTypeInfosByDeveloperName();
        if (byDevName.containsKey('PersonAccount') && byDevName.get('PersonAccount').isAvailable()) {
            return byDevName.get('PersonAccount').getRecordTypeId();
        }
        for (Schema.RecordTypeInfo rti : Account.SObjectType.getDescribe().getRecordTypeInfos()) {
            if (rti.isAvailable() && rti.getName() != null && rti.getName().toLowerCase().contains('person')) {
                return rti.getRecordTypeId();
            }
        }
        return null;
    }

    private static Id resolveBusinessAccountRecordTypeId() {
        if (!orgHasPersonAccountFields()) {
            return null;
        }

        Id personRt = resolvePersonAccountRecordTypeId();
        List<Schema.RecordTypeInfo> rtis = Account.SObjectType.getDescribe().getRecordTypeInfos();

        for (Schema.RecordTypeInfo rti : rtis) {
            if (!rti.isAvailable()) {
                continue;
            }
            if (personRt != null && rti.getRecordTypeId() == personRt) {
                continue;
            }
            if (rti.getName() != null && rti.getName().toLowerCase().contains('person')) {
                continue;
            }
            if (rti.isMaster()) {
                return rti.getRecordTypeId();
            }
        }

        for (Schema.RecordTypeInfo rti : rtis) {
            if (!rti.isAvailable()) {
                continue;
            }
            if (personRt != null && rti.getRecordTypeId() == personRt) {
                continue;
            }
            if (rti.getName() != null && rti.getName().toLowerCase().contains('person')) {
                continue;
            }
            return rti.getRecordTypeId();
        }
        return null;
    }

    private static String deriveSsnLast4(String ssnInput) {
        if (String.isBlank(ssnInput)) {
            return null;
        }
        String digits = ssnInput.replaceAll('[^0-9]', '');
        if (digits.length() >= 4) {
            return digits.substring(digits.length() - 4, digits.length());
        }
        if (digits.length() > 0) {
            return digits;
        }
        return null;
    }
}
