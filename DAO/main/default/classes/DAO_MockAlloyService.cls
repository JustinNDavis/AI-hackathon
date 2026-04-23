/**
 * Mock Alloy KYC-style responses for DAO wizard development.
 * <p>
 * Real Alloy Journeys return a "journey application" resource (status, complete_outcome,
 * journey_application_status, _embedded.entity_applications, events). See Alloy public docs:
 * Integration overview and GET Journey Application.
 * </p>
 * <p>
 * The DAO wizard KYC step uses the client mock daoMockApiService.mockAlloyKYC, which
 * synthesizes that response shape for demos. This Apex class supports optional server-side stubs
 * (submit / poll) if you wire them from automation.
 * </p>
 */
public with sharing class DAO_MockAlloyService {
    public class AlloyResult {
        @AuraEnabled
        public String caseId;
        @AuraEnabled
        public String status;
        @AuraEnabled
        public String message;
    }

    @AuraEnabled
    public static AlloyResult submitVerification(Id daoApplicationId, String payloadJson) {
        AlloyResult r = new AlloyResult();
        r.caseId = 'ALY-MOCK-' + UUID.randomUUID().toString().replace('-', '').substring(0, 12);
        r.status = 'pending_review';
        r.message = 'Mock Alloy: verification queued (no external call).';
        return r;
    }

    @AuraEnabled
    public static AlloyResult pollStatus(String caseId) {
        AlloyResult r = new AlloyResult();
        r.caseId = caseId;
        r.status = 'approved';
        r.message = 'Mock Alloy: auto-approved for sandbox.';
        return r;
    }
}
