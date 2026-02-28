import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import ACCOUNT_NAME_FIELD from '@salesforce/schema/Account.Name';
import createLoanFromAccount from '@salesforce/apex/LoanController.createLoanFromAccount';
import { reduceErrors } from './utils';

const STATUS_OPTIONS = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Active', value: 'Active' },
    { label: 'Paid Off', value: 'Paid Off' },
    { label: 'Defaulted', value: 'Defaulted' }
];

export default class CreateLoanFromAccount extends NavigationMixin(LightningElement) {
    @api recordId;

    accountName = '';
    loanName = '';
    principalAmount = null;
    termMonths = null;
    status = 'Pending';
    startDate = '';
    interestRate = null;
    isLoading = false;

    statusOptions = STATUS_OPTIONS;

    @wire(getRecord, { recordId: '$recordId', fields: [ACCOUNT_NAME_FIELD] })
    wiredAccount({ data, error }) {
        if (data) {
            this.accountName = data.fields.Name?.value ?? '';
        }
        if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading account',
                    message: reduceErrors(error).join(', '),
                    variant: 'error'
                })
            );
        }
    }

    get title() {
        return this.accountName ? `New Loan for ${this.accountName}` : 'New Loan';
    }

    handleLoanNameChange(event) {
        this.loanName = event.target.value;
    }

    handlePrincipalChange(event) {
        const val = event.target.value;
        this.principalAmount = val === '' ? null : parseFloat(val);
    }

    handleTermChange(event) {
        const val = event.target.value;
        this.termMonths = val === '' ? null : parseInt(val, 10);
    }

    handleStatusChange(event) {
        this.status = event.detail.value;
    }

    handleStartDateChange(event) {
        this.startDate = event.target.value;
    }

    handleInterestRateChange(event) {
        const val = event.target.value;
        this.interestRate = val === '' ? null : parseFloat(val);
    }

    get isSubmitDisabled() {
        return !this.loanName?.trim() || this.isLoading;
    }

    async handleSubmit() {
        if (!this.recordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Account context is missing.',
                    variant: 'error'
                })
            );
            return;
        }
        this.isLoading = true;
        try {
            const loanId = await createLoanFromAccount({
                accountId: this.recordId,
                loanName: this.loanName.trim(),
                principalAmount: this.principalAmount,
                termMonths: this.termMonths,
                status: this.status || null,
                startDate: this.startDate || null,
                interestRate: this.interestRate
            });
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Loan and Legal Entity created.',
                    variant: 'success'
                })
            );
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: loanId,
                    objectApiName: 'Loan__c',
                    actionName: 'view'
                }
            });
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating loan',
                    message: reduceErrors(error).join(', '),
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
    }

    handleCancel() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: 'Account',
                actionName: 'view'
            }
        });
    }
}
