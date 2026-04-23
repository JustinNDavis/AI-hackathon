import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import F_NAME from '@salesforce/schema/DAO_Application__c.Name';
import F_STATUS from '@salesforce/schema/DAO_Application__c.Status__c';
import F_STEP from '@salesforce/schema/DAO_Application__c.Current_Step__c';
import F_DATE from '@salesforce/schema/DAO_Application__c.Application_Date__c';
import F_KYC from '@salesforce/schema/DAO_Application__c.KYC_Status__c';
import F_CHEX from '@salesforce/schema/DAO_Application__c.ChexSystems_Status__c';
import F_FUNDING from '@salesforce/schema/DAO_Application__c.Funding_Method__c';
import F_CUST from '@salesforce/schema/DAO_Application__c.Customer_Type__c';

const FIELDS = [F_NAME, F_STATUS, F_STEP, F_DATE, F_KYC, F_CHEX, F_FUNDING, F_CUST];

export default class DaoApplicationWizardLauncher extends LightningElement {
    @api recordId;

    @track showModal = false;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    appRecord;

    get wiredLoading() {
        return this.appRecord === undefined;
    }

    get wiredError() {
        return this.appRecord?.error;
    }

    get hasRecord() {
        return this.appRecord?.data;
    }

    get nameVal() {
        return getFieldValue(this.appRecord.data, F_NAME);
    }

    get statusVal() {
        return getFieldValue(this.appRecord.data, F_STATUS);
    }

    get stepVal() {
        const v = getFieldValue(this.appRecord.data, F_STEP);
        return v != null ? String(v) : '—';
    }

    get dateVal() {
        return getFieldValue(this.appRecord.data, F_DATE);
    }

    get kycVal() {
        return getFieldValue(this.appRecord.data, F_KYC) || '—';
    }

    get chexVal() {
        return getFieldValue(this.appRecord.data, F_CHEX) || '—';
    }

    get fundingVal() {
        return getFieldValue(this.appRecord.data, F_FUNDING) || '—';
    }

    get custVal() {
        return getFieldValue(this.appRecord.data, F_CUST) || '—';
    }

    get errorMessage() {
        const e = this.wiredError;
        return e?.body?.message || e?.message || 'Unable to load record.';
    }

    openModal() {
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
    }

    handleWizardComplete() {
        this.showModal = false;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Application updated',
                message: 'Wizard finished. Refresh the page if field values look stale.',
                variant: 'success'
            })
        );
    }
}
