Account acc = [SELECT Id, Name FROM Account WHERE Name LIKE '%Burlington%' LIMIT 1];
Deposit__c dep = new Deposit__c(
    Name = 'Burlington Checking 001',
    Account__c = acc.Id,
    Deposit_Type__c = 'Checking',
    Amount__c = 25000.00,
    Account_Number__c = 'DEP-001'
);
insert dep;
System.debug('Created Deposit: ' + dep.Id);
