/**
 * Computes Needs Assessment score summaries from standard Account fields only (Name, Phone).
 */
public with sharing class NeedsAssessmentScoringService {
    private static final Integer MAX_ACCOUNT_INFO = 10;
    private static final Integer MAX_HOUSING = 20;
    private static final Integer MAX_EMPLOYMENT = 10;
    private static final Integer MAX_ASSETS = 30;
    private static final Integer MAX_GOALS = 30;

    public static void updateNeedsAssessmentScoresForAccounts(List<Id> accountIds) {
        if (accountIds == null || accountIds.isEmpty()) {
            return;
        }

        Set<Id> idSet = new Set<Id>(accountIds);
        Map<Id, Account> accountById = new Map<Id, Account>();
        for (Account a : [SELECT Id, Name, Phone FROM Account WHERE Id IN :idSet]) {
            accountById.put(a.Id, a);
        }

        List<Account> accountsToUpdate = new List<Account>();
        for (Id accId : idSet) {
            Account row = accountById.get(accId);
            Integer accountInfo = row == null ? 0 : scoreRelationshipDetails(row);
            Integer housing = 0;
            Integer employment = 0;
            Integer assets = 0;
            Integer goals = 0;

            Integer totalScore = accountInfo + housing + employment + assets + goals;
            String summary = buildScoreSummary(accountInfo, housing, employment, assets, goals);

            accountsToUpdate.add(
                new Account(
                    Id = accId,
                    Needs_Assessment_Score__c = totalScore,
                    Needs_Assessment_Score_Summary__c = summary
                )
            );
        }
        update accountsToUpdate;
    }

    private static String buildScoreSummary(
        Integer accountInfo,
        Integer housing,
        Integer employment,
        Integer assets,
        Integer goals
    ) {
        List<String> lines = new List<String>{
            'Account Information: ' + accountInfo + ' / ' + MAX_ACCOUNT_INFO,
            'Housing: ' + housing + ' / ' + MAX_HOUSING,
            'Employment: ' + employment + ' / ' + MAX_EMPLOYMENT,
            'Outside Assets and Liabilities: ' + assets + ' / ' + MAX_ASSETS,
            'Client Financial Goals: ' + goals + ' / ' + MAX_GOALS
        };
        return String.join(lines, '\n');
    }

    private static Integer scoreRelationshipDetails(Account a) {
        Integer s = 0;
        if (isFilled(a.Name)) {
            s += 1;
        }
        if (isFilled(a.Phone)) {
            s += 2;
        }
        return s;
    }

    private static Boolean isFilled(Object val) {
        return val != null && String.isNotBlank(String.valueOf(val));
    }
}
