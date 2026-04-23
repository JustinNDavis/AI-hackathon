/**
 * Mock ChexSystems-style screening for DAO wizard development.
 */
public with sharing class DAO_MockChexService {
    public class ChexResult {
        @AuraEnabled
        public String inquiryId;
        @AuraEnabled
        public String resultCode;
        @AuraEnabled
        public String narrative;
    }

    @AuraEnabled
    public static ChexResult runInquiry(Id daoApplicationId, String payloadJson) {
        ChexResult r = new ChexResult();
        r.inquiryId = 'CHX-MOCK-' + String.valueOf((Integer) Math.round(Math.random() * 1000000));
        r.resultCode = 'CLEAR';
        r.narrative = 'Mock ChexSystems: no records found (sandbox).';
        return r;
    }
}
