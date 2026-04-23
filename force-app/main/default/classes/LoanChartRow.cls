/**
 * Serializable row for loan report / chart LWC.
 */
public class LoanChartRow {
    @AuraEnabled
    public Id id;
    @AuraEnabled
    public String name;
    @AuraEnabled
    public Decimal principalAmount;
    @AuraEnabled
    public String status;
    @AuraEnabled
    public Decimal termMonths;
    @AuraEnabled
    public String startDateIso;
    @AuraEnabled
    public Decimal interestRate;
    @AuraEnabled
    public String accountName;
}
