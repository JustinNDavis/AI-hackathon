/**
 * Apex DTO for possible Account matches returned to the loan referral LWC.
 */
public class AccountSimilarMatchResult implements Comparable {
    @AuraEnabled
    public String accountId;
    @AuraEnabled
    public String name;
    @AuraEnabled
    public String phone;
    @AuraEnabled
    public Integer matchScore;
    @AuraEnabled
    public String matchSummary;

    public Integer compareTo(Object other) {
        AccountSimilarMatchResult o = (AccountSimilarMatchResult) other;
        Integer a = this.matchScore == null ? 0 : this.matchScore;
        Integer b = o.matchScore == null ? 0 : o.matchScore;
        return b - a;
    }
}
