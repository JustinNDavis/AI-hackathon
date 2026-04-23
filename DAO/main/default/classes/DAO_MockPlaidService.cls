/**
 * Mock Plaid / Swivel funding link flow for DAO wizard development.
 */
public with sharing class DAO_MockPlaidService {
    public class FundingResult {
        @AuraEnabled
        public String linkToken;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String institutionName;
    }

    @AuraEnabled
    public static FundingResult createLinkSession(Id daoApplicationId, String payloadJson) {
        FundingResult r = new FundingResult();
        r.linkToken = 'link-sandbox-mock-' + String.valueOf((Integer) Math.round(Math.random() * 1000000));
        r.status = 'link_created';
        r.institutionName = 'Mock Community Bank';
        return r;
    }

    @AuraEnabled
    public static FundingResult completeFunding(String linkToken) {
        FundingResult r = new FundingResult();
        r.linkToken = linkToken;
        r.status = 'funded';
        r.institutionName = 'Mock Community Bank';
        return r;
    }
}
