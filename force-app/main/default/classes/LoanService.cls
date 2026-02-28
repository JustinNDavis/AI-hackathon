/**
 * Service layer for Loan and Legal Entity business logic.
 * Creates loans and associated legal entity records.
 */
public with sharing class LoanService {
    private static final String DEFAULT_LEGAL_ENTITY_ROLE = 'Borrower';

    /**
     * Creates a Loan__c record for the given account and a Legal_Entity__c linking the account to the loan as Borrower.
     * @param accountId Id of the Account (required)
     * @param loanRecord Loan__c with user-entered fields (Principal_Amount__c, Term_Months__c, Status__c, Start_Date__c, Interest_Rate__c, Name)
     * @return Id of the created Loan__c
     * @throws AuraHandledException if accountId is null or DML fails
     */
    public static Id createLoanWithLegalEntity(Id accountId, Loan__c loanRecord) {
        if (accountId == null) {
            throw new AuraHandledException('Account Id is required.');
        }

        loanRecord.Account__c = accountId;
        insert loanRecord;

        Legal_Entity__c legalEntity = new Legal_Entity__c(
            Account__c = accountId,
            Loan__c = loanRecord.Id,
            Role__c = DEFAULT_LEGAL_ENTITY_ROLE
        );
        insert legalEntity;

        return loanRecord.Id;
    }
}
