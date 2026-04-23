/**
 * LWC entry points for loan referral capture and account matching.
 */
public with sharing class ReferralController {
    /**
     * Finds Accounts similar to the referral intake fields.
     */
    @AuraEnabled(cacheable=false)
    public static List<AccountSimilarMatchResult> findSimilarAccounts(
        String firstName,
        String lastName,
        String phone,
        String social
    ) {
        return LoanReferralService.findSimilarAccounts(firstName, lastName, phone, social);
    }

    /**
     * Persists a Loan_Referral__c from the modal, optionally linked to a matched Account and assigned to another user.
     */
    @AuraEnabled
    public static Id saveReferral(
        String firstName,
        String lastName,
        String phone,
        String social,
        Id matchedAccountId,
        Id assigneeUserId
    ) {
        return LoanReferralService.saveReferral(
            firstName,
            lastName,
            phone,
            social,
            matchedAccountId,
            assigneeUserId
        );
    }
}
