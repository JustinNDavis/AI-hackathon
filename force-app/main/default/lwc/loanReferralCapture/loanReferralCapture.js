import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import findSimilarAccounts from '@salesforce/apex/ReferralController.findSimilarAccounts';
import saveReferral from '@salesforce/apex/ReferralController.saveReferral';

function reduceErrors(error) {
    if (!error) {
        return ['Unknown error'];
    }
    if (Array.isArray(error.body)) {
        return error.body.map((e) => e.message);
    }
    if (error.body?.output?.errors?.length) {
        return error.body.output.errors.map((e) => e.message);
    }
    if (error.body?.fieldErrors) {
        const fieldErrors = error.body.fieldErrors;
        return Object.keys(fieldErrors).flatMap((field) => fieldErrors[field].map((e) => e.message));
    }
    if (error.body?.pageErrors?.length) {
        return error.body.pageErrors.map((e) => e.message);
    }
    return [error.body?.message || error.message || String(error)];
}

export default class LoanReferralCapture extends NavigationMixin(LightningElement) {
    @track firstName = '';
    @track lastName = '';
    @track phone = '';
    @track social = '';

    showModal = false;
    searching = false;
    saving = false;
    matches = [];
    selectedAccountId;
    assigneeUserId;
    hasSearched = false;

    userPickerFilter = {
        criteria: [{ fieldPath: 'IsActive', operator: 'eq', value: true }]
    };

    userPickerDisplayInfo = {
        primaryField: 'Name',
        additionalFields: ['Email']
    };

    openModal() {
        this.showModal = true;
        this.hasSearched = false;
        this.matches = [];
        this.selectedAccountId = undefined;
        this.assigneeUserId = undefined;
    }

    closeModal() {
        if (this.searching || this.saving) {
            return;
        }
        this.showModal = false;
    }

    handleModalKeydown(event) {
        if (event.key === 'Escape') {
            event.stopPropagation();
            this.closeModal();
        }
    }

    handleFirstNameChange(event) {
        this.firstName = event.target.value;
    }

    handleLastNameChange(event) {
        this.lastName = event.target.value;
    }

    handlePhoneChange(event) {
        this.phone = event.target.value;
    }

    handleSocialChange(event) {
        this.social = event.target.value;
    }

    handleAssigneeChange(event) {
        const rid = event.detail?.recordId;
        this.assigneeUserId = rid || undefined;
    }

    get matchCards() {
        return (this.matches || []).map((m, i) => ({
            ...m,
            key: m.accountId || `row-${i}`,
            cardClass: this.cardClassFor(m.accountId),
            scoreLabel: m.matchScore != null ? String(m.matchScore) : '0',
            displayName: m.name || 'Account',
            phoneLine: m.phone || '—'
        }));
    }

    cardClassFor(accountId) {
        const base = 'match-card';
        const selected = accountId && accountId === this.selectedAccountId;
        return selected ? `${base} match-card_selected` : base;
    }

    async handleSearch() {
        if (!this.hasMinimumSearchInput()) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Add more detail',
                    message: 'Enter at least two characters for a first or last name, or at least four phone digits.',
                    variant: 'warning'
                })
            );
            return;
        }
        this.searching = true;
        this.hasSearched = true;
        this.selectedAccountId = undefined;
        try {
            const rows = await findSimilarAccounts({
                firstName: this.firstName,
                lastName: this.lastName,
                phone: this.phone,
                social: this.social
            });
            this.matches = rows || [];
            if (this.matches.length === 0) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'No strong matches',
                        message: 'Try adjusting the account name or phone details.',
                        variant: 'info'
                    })
                );
            }
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Search failed',
                    message: reduceErrors(error).join(', '),
                    variant: 'error'
                })
            );
            this.matches = [];
        } finally {
            this.searching = false;
        }
    }

    hasMinimumSearchInput() {
        const fn = (this.firstName || '').trim();
        const ln = (this.lastName || '').trim();
        const digits = (this.phone || '').replace(/\D/g, '');
        return fn.length >= 2 || ln.length >= 2 || digits.length >= 4;
    }

    handleSelectMatch(event) {
        const id = event.currentTarget.dataset.id;
        this.selectedAccountId = id || undefined;
    }

    async handleSave() {
        const fn = (this.firstName || '').trim();
        const ln = (this.lastName || '').trim();
        if (!fn || !ln) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Required fields',
                    message: 'First and last name are required to save a referral.',
                    variant: 'error'
                })
            );
            return;
        }
        this.saving = true;
        try {
            const refId = await saveReferral({
                firstName: this.firstName,
                lastName: this.lastName,
                phone: this.phone,
                social: this.social,
                matchedAccountId: this.selectedAccountId || null,
                assigneeUserId: this.assigneeUserId || null
            });
            const msgParts = [];
            msgParts.push(
                this.selectedAccountId
                    ? 'Linked to the selected account.'
                    : 'Saved as a new referral without an account link.'
            );
            if (this.assigneeUserId) {
                msgParts.push('Owner set to the selected user.');
            }
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Referral saved',
                    message: msgParts.join(' '),
                    variant: 'success'
                })
            );
            this.resetForm();
            this.showModal = false;
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: refId,
                    objectApiName: 'Loan_Referral__c',
                    actionName: 'view'
                }
            });
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Save failed',
                    message: reduceErrors(error).join(', '),
                    variant: 'error'
                })
            );
        } finally {
            this.saving = false;
        }
    }

    resetForm() {
        this.firstName = '';
        this.lastName = '';
        this.phone = '';
        this.social = '';
        this.matches = [];
        this.selectedAccountId = undefined;
        this.assigneeUserId = undefined;
        this.hasSearched = false;
    }

    get disableSearch() {
        return this.searching || this.saving;
    }

    get disableSave() {
        return this.saving || this.searching;
    }

    get showResultsSection() {
        return this.hasSearched;
    }
}
