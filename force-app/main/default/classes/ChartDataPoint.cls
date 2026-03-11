/**
 * Wrapper for chart data points (label + value).
 */
public with sharing class ChartDataPoint {
    @AuraEnabled
    public String label;
    @AuraEnabled
    public Integer value;

    public ChartDataPoint(String label, Integer value) {
        this.label = label;
        this.value = value;
    }
}
