/**
 * Controller for Account Industry Chart LWC. Returns account counts by industry.
 */
public with sharing class AccountChartController {
    /**
     * Returns account count per industry for bar chart. Cacheable for wire adapter.
     */
    @AuraEnabled(cacheable=true)
    public static List<IndustryCount> getIndustryCounts() {
        List<IndustryCount> result = new List<IndustryCount>();
        for (AggregateResult ar : [
            SELECT Industry industry, COUNT(Id) cnt
            FROM Account
            WHERE Industry != null
            GROUP BY Industry
            ORDER BY COUNT(Id) DESC
        ]) {
            result.add(new IndustryCount(
                (String) ar.get('industry'),
                (Integer) ar.get('cnt')
            ));
        }
        List<AggregateResult> nullIndustry = [
            SELECT COUNT(Id) cnt FROM Account WHERE Industry = null
        ];
        if (!nullIndustry.isEmpty() && (Integer) nullIndustry[0].get('cnt') > 0) {
            result.add(new IndustryCount('Unknown', (Integer) nullIndustry[0].get('cnt')));
        }
        return result;
    }

    public class IndustryCount {
        @AuraEnabled public String industry;
        @AuraEnabled public Integer count;
        public IndustryCount(String industry, Integer count) {
            this.industry = industry;
            this.count = count;
        }
    }
}