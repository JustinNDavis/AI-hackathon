/**
 * Read-only data for loan dashboard chart (Loan__c).
 */
public with sharing class LoanReportController {
    private static final Integer ROW_CAP = 2000;

    @AuraEnabled(cacheable=true)
    public static List<LoanChartRow> getLoans() {
        List<Loan__c> rows = [
            SELECT
                Id,
                Name,
                Principal_Amount__c,
                Status__c,
                Term_Months__c,
                Start_Date__c,
                Interest_Rate__c,
                Account__r.Name
            FROM Loan__c
            ORDER BY CreatedDate DESC
            LIMIT :ROW_CAP
        ];

        List<LoanChartRow> result = new List<LoanChartRow>();
        for (Loan__c l : rows) {
            LoanChartRow r = new LoanChartRow();
            r.id = l.Id;
            r.name = l.Name;
            r.principalAmount = l.Principal_Amount__c;
            r.status = l.Status__c;
            r.termMonths = l.Term_Months__c;
            r.startDateIso = l.Start_Date__c == null ? null : String.valueOf(l.Start_Date__c);
            r.interestRate = l.Interest_Rate__c;
            r.accountName = l.Account__r == null ? null : l.Account__r.Name;
            result.add(r);
        }
        return result;
    }
}
