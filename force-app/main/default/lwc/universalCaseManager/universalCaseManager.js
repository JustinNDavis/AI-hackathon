import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getRecordContext from '@salesforce/apex/CaseManagerController.getRecordContext';
import getServiceConfigs from '@salesforce/apex/CaseManagerController.getServiceConfigs';
import createServiceRequest from '@salesforce/apex/CaseManagerController.createServiceRequest';
import getRelatedCases from '@salesforce/apex/CaseManagerController.getRelatedCases';
import closeCase from '@salesforce/apex/CaseManagerController.closeCase';
import getRelatedRecords from '@salesforce/apex/CaseManagerController.getRelatedRecords';
import getRelatedCollateral from '@salesforce/apex/CaseManagerController.getRelatedCollateral';
import { reduceErrors } from './utils';

const PRIORITY_OPTIONS = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' },
    { label: 'Critical', value: 'Critical' }
];

export default class UniversalCaseManager extends NavigationMixin(LightningElement) {
    @api recordId;

    @track context = { objectApiName: null, recordName: '', flags: [] };
    @track serviceConfigs = [];
    @track selectedConfig = null;
    @track subject = '';
    @track description = '';
    @track priority = 'Medium';
    @track dynamicFieldValues = {};
    @track relatedCases = [];
    @track relatedLoans = [];
    @track relatedDeposits = [];
    @track relatedCollateral = [];
    @track isLoading = false;
    @track casesLoading = true;

    priorityOptions = PRIORITY_OPTIONS;

    @wire(getRecordContext, { recordId: '$recordId' })
    wiredContext({ data, error }) {
        if (data) {
            this.context = data;
            if (this.context.objectApiName) {
                this.loadServiceConfigs();
            }
            this.loadRelatedRecords();
        }
        if (error) {
            this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: reduceErrors(error).join(', '), variant: 'error' }));
        }
    }

    loadServiceConfigs() {
        if (!this.context.objectApiName) return;
        getServiceConfigs({ objectApiName: this.context.objectApiName })
            .then((configs) => {
                this.serviceConfigs = configs || [];
            })
            .catch((error) => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error loading configs', message: reduceErrors(error).join(', '), variant: 'error' }));
            });
    }

    loadRelatedRecords() {
        if (!this.recordId) return;
        if (this.context.objectApiName === 'Account') {
            getRelatedRecords({ accountId: this.recordId })
                .then((map) => {
                    this.relatedLoans = map.loans || [];
                    this.relatedDeposits = map.deposits || [];
                })
                .catch(() => {});
        } else if (this.context.objectApiName === 'Loan__c') {
            getRelatedCollateral({ loanId: this.recordId })
                .then((list) => {
                    this.relatedCollateral = list || [];
                })
                .catch(() => {});
        }
        this.refreshCases();
    }

    refreshCases() {
        if (!this.recordId) return;
        this.casesLoading = true;
        getRelatedCases({ recordId: this.recordId })
            .then((cases) => {
                this.relatedCases = (cases || []).map((c) => ({ ...c, showClose: c.Status !== 'Closed' }));
            })
            .catch(() => {
                this.relatedCases = [];
            })
            .finally(() => {
                this.casesLoading = false;
            });
    }

    get objectApiName() {
        return this.context.objectApiName || '';
    }

    get recordName() {
        return this.context.recordName || 'Record';
    }

    get hasDelinquentFlag() {
        const flags = this.context.flags || [];
        return Array.isArray(flags) && flags.includes('DELINQUENT');
    }

    get isAccountContext() {
        return this.context.objectApiName === 'Account';
    }

    get isLoanContext() {
        return this.context.objectApiName === 'Loan__c';
    }

    get hasRelatedPanel() {
        return this.isAccountContext && (this.relatedLoans.length > 0 || this.relatedDeposits.length > 0) ||
            this.isLoanContext && this.relatedCollateral.length > 0;
    }

    get requiredFieldsList() {
        if (!this.selectedConfig || !this.selectedConfig.requiredFields) return [];
        try {
            const arr = JSON.parse(this.selectedConfig.requiredFields);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }

    get requiredFieldsWithValues() {
        const list = this.requiredFieldsList;
        const values = this.dynamicFieldValues || {};
        return list.map((label) => {
            const inputType = this.inferInputType(label);
            return {
                label,
                value: values[label] || '',
                inputType,
                isDate: inputType === 'date',
                isAddress: inputType === 'address',
                isEmail: inputType === 'email',
                isTel: inputType === 'tel'
            };
        });
    }

    inferInputType(label) {
        if (!label || typeof label !== 'string') return 'text';
        const lower = label.toLowerCase();
        if (lower.includes('date') && !lower.includes('update')) return 'date';
        if (lower.includes('address') || lower.includes('street') || lower.includes('city') || lower.includes('zip')) return 'address';
        if (lower.includes('email')) return 'email';
        if (lower.includes('phone') || lower.includes('tel')) return 'tel';
        return 'text';
    }

    get isFormValid() {
        return this.subject && this.description && this.subject.trim().length > 0 && this.description.trim().length > 0;
    }

    get formInvalid() {
        return !this.subject || !this.description || !this.subject.trim() || !this.description.trim();
    }

    handleSelectService(event) {
        const config = event.currentTarget.dataset.config;
        if (!config) return;
        this.selectedConfig = this.serviceConfigs.find((c) => c.developerName === config);
        if (this.selectedConfig) {
            this.priority = this.selectedConfig.defaultPriority || 'Medium';
            this.dynamicFieldValues = {};
        }
    }

    handleSubjectChange(event) {
        this.subject = event.target.value;
    }

    handleDescriptionChange(event) {
        this.description = event.target.value;
    }

    handlePriorityChange(event) {
        this.priority = event.detail.value;
    }

    handleDynamicFieldChange(event) {
        const label = event.target.dataset.label;
        if (label) this.dynamicFieldValues = { ...this.dynamicFieldValues, [label]: event.target.value };
    }

    handleSubmit() {
        if (!this.isFormValid || !this.recordId || !this.context.objectApiName || !this.selectedConfig) return;
        this.isLoading = true;
        let desc = this.description;
        if (this.requiredFieldsList.length > 0 && Object.keys(this.dynamicFieldValues).length > 0) {
            desc += '\n\nAdditional: ' + JSON.stringify(this.dynamicFieldValues);
        }
        createServiceRequest({
            recordId: this.recordId,
            objectApiName: this.context.objectApiName,
            serviceCategory: this.selectedConfig.serviceCategory,
            subject: this.subject.trim(),
            description: desc,
            priority: this.priority
        })
            .then((caseId) => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'Case created.', variant: 'success' }));
                this.selectedConfig = null;
                this.subject = '';
                this.description = '';
                this.priority = 'Medium';
                this.dynamicFieldValues = {};
                this.refreshCases();
            })
            .catch((error) => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: reduceErrors(error).join(', '), variant: 'error' }));
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    handleCaseNav(event) {
        const caseId = event.currentTarget.dataset.caseId;
        if (!caseId) return;
        event.preventDefault();
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: caseId, objectApiName: 'Case', actionName: 'view' }
        });
    }

    handleCloseCase(event) {
        const caseId = event.currentTarget.dataset.caseId;
        if (!caseId) return;
        closeCase({ caseId })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Case closed', variant: 'success' }));
                this.refreshCases();
            })
            .catch((error) => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: reduceErrors(error).join(', '), variant: 'error' }));
            });
    }

    handleCancelForm() {
        this.selectedConfig = null;
        this.subject = '';
        this.description = '';
        this.priority = 'Medium';
        this.dynamicFieldValues = {};
    }

    formatDate(dateVal) {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? dateVal : d.toLocaleDateString();
    }
}