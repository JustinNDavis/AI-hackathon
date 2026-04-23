/**
 * Finds candidate Account matches for referral intake and persists Loan_Referral__c rows.
 * Account matching uses only standard Name and Phone on Account.
 */
public with sharing class LoanReferralService {
    private static final Integer MIN_SCORE_TO_SHOW = 12;
    private static final Integer MAX_RESULTS = 24;

    /**
     * Returns scored Account matches for the supplied referral fields.
     * Parameters firstName, lastName, and phone drive the query; social is not used for Account lookup.
     */
    public static List<AccountSimilarMatchResult> findSimilarAccounts(
        String firstName,
        String lastName,
        String phone,
        String social
    ) {
        String fn = firstName == null ? '' : firstName.trim();
        String ln = lastName == null ? '' : lastName.trim();
        String phoneDigits = digitsOnly(phone);

        Map<String, Object> bindMap = new Map<String, Object>();
        List<String> orClauses = new List<String>();

        if (String.isNotBlank(ln)) {
            orClauses.add('(Name LIKE :lnLike)');
            bindMap.put('lnLike', '%' + ln + '%');
        }
        if (String.isNotBlank(fn)) {
            orClauses.add('(Name LIKE :fnLike)');
            bindMap.put('fnLike', '%' + fn + '%');
        }
        if (phoneDigits.length() >= 4) {
            orClauses.add('(Phone LIKE :phonePat)');
            bindMap.put('phonePat', '%' + phoneDigits.right(4) + '%');
        }

        if (orClauses.isEmpty()) {
            return new List<AccountSimilarMatchResult>();
        }

        String soql =
            'SELECT Id, Name, Phone FROM Account WHERE (' +
            String.join(orClauses, ' OR ') +
            ') LIMIT 200';

        List<Account> accounts = Database.queryWithBinds(soql, bindMap, AccessLevel.USER_MODE);

        String fullName = buildFullName(fn, ln);
        List<AccountSimilarMatchResult> scored = new List<AccountSimilarMatchResult>();
        for (Account acc : accounts) {
            AccountSimilarMatchResult row = scoreMatch(acc, fn, ln, fullName, phoneDigits);
            if (row.matchScore >= MIN_SCORE_TO_SHOW) {
                scored.add(row);
            }
        }

        scored.sort();
        if (scored.size() > MAX_RESULTS) {
            List<AccountSimilarMatchResult> top = new List<AccountSimilarMatchResult>();
            for (Integer i = 0; i < MAX_RESULTS; i++) {
                top.add(scored[i]);
            }
            return top;
        }
        return scored;
    }

    private static String buildFullName(String fn, String ln) {
        if (String.isNotBlank(fn) && String.isNotBlank(ln)) {
            return (fn + ' ' + ln).trim();
        }
        if (String.isNotBlank(ln)) {
            return ln;
        }
        return fn;
    }

    /**
     * Inserts a referral row; only last four SSN digits are stored when derivable from social.
     * @param assigneeUserId Optional User Id to set as owner; null keeps the running user as owner.
     */
    public static Id saveReferral(
        String firstName,
        String lastName,
        String phone,
        String social,
        Id matchedAccountId,
        Id assigneeUserId
    ) {
        Loan_Referral__c rec = new Loan_Referral__c();
        rec.First_Name__c = firstName == null ? null : firstName.trim();
        rec.Last_Name__c = lastName == null ? null : lastName.trim();
        rec.Phone__c = phone;
        String four = lastFourDigitsFromSocial(social);
        rec.SSN_Last_4__c = String.isBlank(four) ? null : four;
        rec.Matched_Account__c = matchedAccountId;
        rec.Status__c = matchedAccountId != null ? 'Matched' : 'New';
        if (assigneeUserId != null) {
            if (assigneeUserId.getSobjectType() != User.SObjectType) {
                throw new AuraHandledException('Assignee must be a user.');
            }
            List<User> assignees = [
                SELECT Id FROM User WHERE Id = :assigneeUserId AND IsActive = true LIMIT 1
            ];
            if (assignees.isEmpty()) {
                throw new AuraHandledException('Choose an active user to assign the referral.');
            }
            rec.OwnerId = assigneeUserId;
        }
        insert rec;
        return rec.Id;
    }

    private static AccountSimilarMatchResult scoreMatch(
        Account acc,
        String fn,
        String ln,
        String fullName,
        String phoneDigits
    ) {
        AccountSimilarMatchResult r = new AccountSimilarMatchResult();
        r.accountId = acc.Id;
        r.name = acc.Name;
        r.phone = acc.Phone;

        Integer score = 0;
        List<String> reasons = new List<String>();
        String accName = acc.Name == null ? '' : acc.Name.trim();
        String accNameLower = accName.toLowerCase();
        String fnLower = fn.toLowerCase();
        String lnLower = ln.toLowerCase();
        String fullLower = fullName == null ? '' : fullName.toLowerCase();

        if (String.isNotBlank(fullName) && String.isNotBlank(accName)) {
            if (accName.equalsIgnoreCase(fullName)) {
                score += 50;
                reasons.add('Full name');
            } else if (accNameLower.contains(fullLower)) {
                score += 30;
                reasons.add('Name contains full name');
            }
        }

        if (String.isNotBlank(ln) && String.isNotBlank(accName) && accNameLower.contains(lnLower)) {
            if (!reasons.contains('Full name') && !reasons.contains('Name contains full name')) {
                score += 28;
                reasons.add('Last name in account name');
            }
        }

        if (String.isNotBlank(fn) && String.isNotBlank(accName) && accNameLower.contains(fnLower)) {
            Boolean alreadyName = reasons.contains('Full name') || reasons.contains('Name contains full name');
            if (!alreadyName && !reasons.contains('Last name in account name')) {
                score += 22;
                reasons.add('First name in account name');
            }
        }

        String accPhoneDigits = digitsOnly(acc.Phone);
        if (phoneDigits.length() >= 4 && accPhoneDigits.length() >= 4) {
            if (accPhoneDigits == phoneDigits || accPhoneDigits.endsWith(phoneDigits.right(4))) {
                score += 35;
                reasons.add('Phone');
            }
        }

        r.matchScore = score;
        r.matchSummary = reasons.isEmpty() ? 'Possible match' : String.join(reasons, ' · ');
        return r;
    }

    private static String digitsOnly(String raw) {
        if (String.isBlank(raw)) {
            return '';
        }
        String digits = '';
        for (Integer i = 0; i < raw.length(); i++) {
            String c = raw.substring(i, i + 1);
            if (c >= '0' && c <= '9') {
                digits += c;
            }
        }
        return digits;
    }

    private static String lastFourDigitsFromSocial(String social) {
        String d = digitsOnly(social);
        if (d.length() >= 4) {
            return d.substring(d.length() - 4, d.length());
        }
        return '';
    }
}
