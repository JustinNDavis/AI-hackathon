// Seeds billing address, account number, website, and type on a demo Account for DAO customer search UI tests.
// Target record (replace if your org uses a different Id): 001bm00001foFOlAAM
//
// Run: sf apex run --file scripts/apex/dao-seed-customer-search-test-account.apex --target-org <your-alias>
//
// If update fails on Type, comment out a.Type and set a valid picklist value for your org.

Id DEMO_ACCOUNT_ID = '001bm00001foFOlAAM';

Account a = new Account(
    Id = DEMO_ACCOUNT_ID,
    BillingStreet = '100 Atlantic Union Plaza, Suite 500',
    BillingCity = 'Richmond',
    BillingState = 'VA',
    BillingPostalCode = '23219',
    AccountNumber = 'AUB-DAO-10001',
    Website = 'https://atlanticunion.example.com/demo-customer',
    Type = 'Customer'
);

update a;

System.debug(LoggingLevel.INFO, 'DAO seed: updated Account ' + DEMO_ACCOUNT_ID + ' for customer search.');
