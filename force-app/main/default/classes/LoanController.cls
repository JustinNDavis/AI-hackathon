/**
 * Thin controller for Create Loan from Account LWC.
 * Delegates to LoanService for business logic.
 */
public with sharing class LoanController {
    /**
     * Creates a Loan__c for the given account with the provided field values, and a Legal_Entity__c linking the account to the loan.
     * @param accountId Id of the Account record page context
     * @param loanName Name for the new Loan__c
     * @param principalAmount Principal_Amount__c (optional)
     * @param termMonths Term_Months__c (optional)
     * @param status Status__c picklist value (optional)
     * @param startDate Start_Date__c (optional, YYYY-MM-DD)
     * @param interestRate Interest_Rate__c (optional)
     * @return Id of the created Loan__c
     */
    @AuraEnabled
    public static Id createLoanFromAccount(
        Id accountId,
        String loanName,
        Decimal principalAmount,
        Integer termMonths,
        String status,
        String startDate,
        Decimal interestRate
    ) {
        Loan__c loan = new Loan__c(
            Name = loanName,
            Principal_Amount__c = principalAmount,
            Term_Months__c = termMonths,
            Status__c = status,
            Interest_Rate__c = interestRate
        );
        if (String.isNotBlank(startDate)) {
            loan.Start_Date__c = Date.valueOf(startDate);
        }
        return LoanService.createLoanWithLegalEntity(accountId, loan);
    }
}