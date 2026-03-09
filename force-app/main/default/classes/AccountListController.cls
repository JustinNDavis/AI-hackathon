/**
 * Controller for Account Cards LWC. Returns accounts for card display.
 */
public with sharing class AccountListController {
    /**
     * Returns all accounts with fields for card front (Name, Industry, AnnualRevenue)
     * and back (Phone, Website, Type, NumberOfEmployees, BillingCity, BillingState).
     */
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts() {
        return [
            SELECT Id, Name, Industry, AnnualRevenue, Phone, Website, Type,
                NumberOfEmployees, BillingCity, BillingState
            FROM Account
            ORDER BY Name
            LIMIT 500
        ];
    }
}