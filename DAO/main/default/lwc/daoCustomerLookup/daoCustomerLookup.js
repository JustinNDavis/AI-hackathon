import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import searchAccounts from '@salesforce/apex/DAO_ApplicationController.searchAccounts';
import createNetNewPersonAccount from '@salesforce/apex/DAO_CustomerLookupController.createNetNewPersonAccount';
import createNetNewBusinessAccount from '@salesforce/apex/DAO_CustomerLookupController.createNetNewBusinessAccount';

export default class DaoCustomerLookup extends LightningElement {
    @api applicationData;

    /** Individual | Business */
    @track applicantEntityType = 'Individual';

    /** 'existing' | 'new' | undefined — chosen path before showing search or net-new form */
    @track customerPath;

    /** Bound to @wire — set when user runs search (min 2 chars). */
    searchKeyForWire;
    applicantEntityTypeForWire;

    searchInput = '';
    @track hasSearched = false;
    @track selectedRow;
    @track identityVerified = false;

    /** @track Plain object for selected individual summary card (getters alone were not re-rendering the card reliably). */
    @track individualSelectionDetail = null;

    @track newFirstName = '';
    @track newLastName = '';
    newDob;
    newSsn = '';
    @track newStreet = '';
    @track newCity = '';
    @track newState = '';
    @track newPostal = '';
    @track newPhone = '';
    @track newEmail = '';

    @track newLegalName = '';
    @track newDba = '';
    @track newWebsite = '';
    @track newEin = '';

    creating = false;

    connectedCallback() {
        this.hydrateFromApplicationData();
    }

    hydrateFromApplicationData() {
        const savedType = this.applicationData?.applicantEntityType;
        if (savedType === 'Business' || savedType === 'Individual') {
            this.applicantEntityType = savedType;
        }

        const cl = this.applicationData?.customerLookup;
        const accountId = cl?.accountId;
        if (!accountId) {
            this.customerPath = undefined;
            this.individualSelectionDetail = null;
            return;
        }

        const ad = cl.accountData || {};
        if (ad.entityKind === 'BUSINESS' || savedType === 'Business') {
            this.applicantEntityType = 'Business';
        }

        const isNew = cl.isNew === true;
        if (isNew) {
            this.customerPath = 'new';
            this.selectedRow = undefined;
            this.individualSelectionDetail = null;
            this.identityVerified = false;
            this.hasSearched = false;
            this.searchInput = '';
            if (this.applicantEntityType === 'Business') {
                this.newLegalName = ad.name || '';
                this.newDba = ad.dbaName || '';
                this.newWebsite = ad.website || '';
                this.newStreet = ad.billingStreet || '';
                this.newCity = ad.billingCity || '';
                this.newState = ad.billingState || '';
                this.newPostal = ad.billingPostalCode || '';
                this.newPhone = ad.phone || '';
                this.newEmail = ad.personEmail || '';
            } else {
                this.newFirstName = ad.firstName || '';
                this.newLastName = ad.lastName || '';
                this.newDob = ad.personBirthdate || undefined;
                this.newSsn = '';
                this.newStreet = ad.personMailingStreet || '';
                this.newCity = ad.personMailingCity || '';
                this.newState = ad.personMailingState || '';
                this.newPostal = ad.personMailingPostalCode || '';
                this.newPhone = ad.phone || '';
                this.newEmail = ad.personEmail || '';
            }
            return;
        }

        this.customerPath = 'existing';
        const name =
            (ad.name || '').trim() ||
            [ad.firstName, ad.lastName].filter(Boolean).join(' ').trim() ||
            'Customer';
        this.selectedRow = {
            id: accountId,
            entityKind: ad.entityKind || (this.applicantEntityType === 'Business' ? 'BUSINESS' : 'PERSON'),
            firstName: ad.firstName,
            lastName: ad.lastName,
            name,
            personEmail: ad.personEmail,
            phone: ad.phone,
            personMobilePhone: ad.personMobilePhone,
            personHomePhone: ad.personHomePhone,
            personBirthdate: ad.personBirthdate,
            personMailingStreet: ad.personMailingStreet,
            personMailingCity: ad.personMailingCity,
            personMailingState: ad.personMailingState,
            personMailingPostalCode: ad.personMailingPostalCode,
            ssnLast4: ad.ssnLast4,
            einLast4: ad.einLast4,
            dbaName: ad.dbaName,
            billingStreet: ad.billingStreet,
            billingCity: ad.billingCity,
            billingState: ad.billingState,
            billingPostalCode: ad.billingPostalCode,
            accountNumber: ad.accountNumber,
            website: ad.website,
            accountType: ad.accountType
        };
        this.identityVerified = true;
        this.hasSearched = false;
        this.searchInput = '';
        this.syncIndividualSelectionDetail();
    }

    get isBusinessEntityPath() {
        return this.applicantEntityType === 'Business';
    }

    get isIndividualEntityPath() {
        return this.applicantEntityType === 'Individual';
    }

    get entityIndividualSegClass() {
        const base = 'lookup-mode-seg';
        return this.applicantEntityType === 'Individual' ? `${base} lookup-mode-seg_active` : base;
    }

    get entityBusinessSegClass() {
        const base = 'lookup-mode-seg';
        return this.applicantEntityType === 'Business' ? `${base} lookup-mode-seg_active` : base;
    }

    get showExistingPath() {
        return this.customerPath === 'existing';
    }

    get showNewPath() {
        return this.customerPath === 'new';
    }

    get customerRecordCommitted() {
        return !!(this.applicationData?.customerLookup?.accountId);
    }

    get customerPathSegmentExistingClass() {
        const base = 'lookup-mode-seg';
        return this.customerPath === 'existing' ? `${base} lookup-mode-seg_active` : base;
    }

    get customerPathSegmentNewClass() {
        const base = 'lookup-mode-seg';
        return this.customerPath === 'new' ? `${base} lookup-mode-seg_active` : base;
    }

    get customerPathHint() {
        if (this.customerPath === 'new') {
            return this.isBusinessEntityPath
                ? 'Enter legal business details to create a business Account for this application.'
                : 'Enter the individual’s details to create a Person Account (or person-style Account).';
        }
        if (this.customerPath === 'existing') {
            return this.isBusinessEntityPath
                ? 'Search by legal name, DBA, email, account number, address, website, type, or EIN last four.'
                : 'Search by name, email, account number, address, website, type, or SSN last four.';
        }
        return 'Choose Existing or Create new to open the search or new-account form.';
    }

    get customerPathRowLabel() {
        return this.isBusinessEntityPath ? 'Business account' : 'Customer account';
    }

    get continueWithSelectedLabel() {
        return this.isBusinessEntityPath ? 'Continue with selected business' : 'Continue with selected customer';
    }

    get linkedAccountBanner() {
        return this.isBusinessEntityPath
            ? 'A business Account is already linked to this application. Review the details below or choose Next to continue.'
            : 'A customer Account is already linked to this application. You can review the details below or use Next to continue.';
    }

    get createButtonLabel() {
        return this.customerRecordCommitted ? 'Customer created' : 'Create and continue';
    }

    get creatingOrCommitted() {
        return this.creating || this.customerRecordCommitted;
    }

    @wire(searchAccounts, { searchTerm: '$searchKeyForWire', applicantEntityType: '$applicantEntityTypeForWire' })
    wiredSearch;

    get searchResults() {
        return this.wiredSearch?.data || [];
    }

    get searchError() {
        return this.wiredSearch?.error;
    }

    get searchErrorMessage() {
        const e = this.searchError;
        return e?.body?.message || e?.message || 'Search failed.';
    }

    get hasResults() {
        return this.searchResults.length > 0;
    }

    get showNoResultsPanel() {
        return this.showExistingPath && this.hasSearched && !this.hasResults;
    }

    get isExistingReady() {
        return this.selectedRow && this.identityVerified;
    }

    get existingContinueDisabled() {
        return !this.isExistingReady || this.customerRecordCommitted;
    }

    get identityConfirmLabel() {
        return this.isBusinessEntityPath
            ? 'I confirm verification of this business and its authorized representatives'
            : 'I confirm identity verification for this customer';
    }

    get searchPlaceholder() {
        return this.isBusinessEntityPath
            ? 'Legal name, DBA, email, account #, website, billing city, EIN last 4…'
            : 'Name, email, account #, website, billing city, SSN last 4…';
    }

    formatCityStateZip(row) {
        const city = row.personMailingCity;
        const st = row.personMailingState;
        const zip = row.personMailingPostalCode;
        const mid = [city, st].filter(Boolean).join(', ');
        if (mid && zip) {
            return `${mid} ${zip}`;
        }
        return mid || zip || null;
    }

    formatBillingCityStateZip(row) {
        const city = row.billingCity;
        const st = row.billingState;
        const zip = row.billingPostalCode;
        const mid = [city, st].filter(Boolean).join(', ');
        if (mid && zip) {
            return `${mid} ${zip}`;
        }
        return mid || zip || null;
    }

    buildPhoneLines(r) {
        if (!r) {
            return [];
        }
        const seen = new Set();
        const out = [];
        const push = (label, raw) => {
            if (!raw) {
                return;
            }
            const digits = String(raw).replace(/\D/g, '');
            const key = digits.length >= 7 ? digits : String(raw);
            if (seen.has(key)) {
                return;
            }
            seen.add(key);
            out.push({ key: `${label}-${String(raw)}`, label, value: raw });
        };
        if (!this.isBusinessEntityPath) {
            push('Mobile', r.personMobilePhone);
        }
        push('Phone', r.phone);
        if (!this.isBusinessEntityPath) {
            push('Home', r.personHomePhone);
        }
        return out;
    }

    enrichCustomerRow(r) {
        if (!r) {
            return {};
        }
        const isBusiness = r.entityKind === 'BUSINESS';
        return {
            isBusiness,
            cityStateZip: this.formatCityStateZip(r),
            billingCityStateZip: this.formatBillingCityStateZip(r),
            phoneLines: this.buildPhoneLines(r),
            hasStreet: !!r.personMailingStreet,
            hasBillingStreet: !!r.billingStreet,
            hasDob: !isBusiness && !!r.personBirthdate,
            hasEmail: !!r.personEmail,
            hasAccountNumber: !!r.accountNumber,
            hasWebsite: !!r.website,
            accountTypeDisplay:
                r.accountType && String(r.accountType).trim() ? String(r.accountType).trim() : '—',
            hasDba: isBusiness && !!r.dbaName,
            hasEin: isBusiness && !!r.einLast4
        };
    }

    get rowsWithUi() {
        return (this.searchResults || []).map((r) => ({
            ...r,
            ...this.enrichCustomerRow(r),
            itemClass:
                'result-row slds-box slds-box_x-small slds-m-bottom_x-small' +
                (this.selectedRow?.id === r.id ? ' result-row_selected' : '')
        }));
    }

    formatAddressBlock(street, city, state, postal) {
        const line2 = [city, state].filter(Boolean).join(', ');
        const parts = [];
        if (street) {
            parts.push(String(street).trim());
        }
        if (line2 && postal) {
            parts.push(`${line2} ${postal}`.trim());
        } else if (line2) {
            parts.push(line2);
        } else if (postal) {
            parts.push(String(postal).trim());
        }
        return parts.length ? parts.join('\n') : null;
    }

    billingMatchesMailing(row) {
        if (!row) {
            return true;
        }
        const n = (v) => String(v || '').trim().toLowerCase();
        return (
            n(row.billingStreet) === n(row.personMailingStreet) &&
            n(row.billingCity) === n(row.personMailingCity) &&
            n(row.billingState) === n(row.personMailingState) &&
            n(row.billingPostalCode) === n(row.personMailingPostalCode)
        );
    }

    syncIndividualSelectionDetail() {
        this.individualSelectionDetail = this.buildIndividualSelectionDetail();
    }

    /** Rich summary for the individual path when a search row is selected (confirmation card). */
    buildIndividualSelectionDetail() {
        if (!this.selectedRow || !this.isIndividualEntityPath) {
            return null;
        }
        const ek = String(this.selectedRow.entityKind || 'PERSON').toUpperCase();
        if (ek === 'BUSINESS') {
            return null;
        }
        const r = this.selectedRow;
        const ui = this.enrichCustomerRow(r);
        const mailing = this.formatAddressBlock(
            r.personMailingStreet,
            r.personMailingCity,
            r.personMailingState,
            r.personMailingPostalCode
        );
        const billing = this.formatAddressBlock(r.billingStreet, r.billingCity, r.billingState, r.billingPostalCode);
        const billingSame = !billing || this.billingMatchesMailing(r);
        const fn = (r.firstName || '').trim();
        const ln = (r.lastName || '').trim();
        return {
            displayName: (r.name || [fn, ln].filter(Boolean).join(' ') || 'Customer').trim(),
            hasFirstName: !!fn,
            firstName: fn || null,
            hasLastName: !!ln,
            lastName: ln || null,
            hasAccountNumber: ui.hasAccountNumber,
            accountNumber: r.accountNumber || null,
            accountTypeDisplay: ui.accountTypeDisplay,
            hasWebsite: ui.hasWebsite,
            website: r.website || null,
            hasEmail: ui.hasEmail,
            personEmail: r.personEmail || null,
            hasDob: ui.hasDob,
            personBirthdate: r.personBirthdate || null,
            ssnLast4: r.ssnLast4 || null,
            phoneLines: ui.phoneLines || [],
            mailingFormatted: mailing,
            hasMailing: !!mailing,
            billingFormatted: billing,
            hasBillingDistinct: !!billing && !billingSame,
            billingSameAsMailing: !!mailing && !!billing && billingSame
        };
    }

    resetExistingPathState() {
        this.hasSearched = false;
        this.searchInput = '';
        this.searchKeyForWire = undefined;
        this.applicantEntityTypeForWire = undefined;
        this.selectedRow = undefined;
        this.identityVerified = false;
        this.syncIndividualSelectionDetail();
    }

    resetNewPathState() {
        this.newFirstName = '';
        this.newLastName = '';
        this.newDob = undefined;
        this.newSsn = '';
        this.newStreet = '';
        this.newCity = '';
        this.newState = '';
        this.newPostal = '';
        this.newPhone = '';
        this.newEmail = '';
        this.newLegalName = '';
        this.newDba = '';
        this.newWebsite = '';
        this.newEin = '';
    }

    selectExistingPath() {
        this.customerPath = 'existing';
        this.resetNewPathState();
    }

    selectNewPath() {
        this.customerPath = 'new';
        this.resetExistingPathState();
    }

    handleEntityTypeClick(event) {
        if (this.customerRecordCommitted) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Customer already linked',
                    message: 'You cannot change entity type after a customer is linked. Start a new application for a different entity type.',
                    variant: 'warning'
                })
            );
            return;
        }
        const t = event.currentTarget.dataset.entity;
        if (t === 'Business' || t === 'Individual') {
            this.applicantEntityType = t;
            this.customerPath = undefined;
            this.resetExistingPathState();
            this.resetNewPathState();
        }
    }

    handleCustomerPathSegmentClick(event) {
        const path = event.currentTarget.dataset.path;
        if (path === 'existing') {
            this.selectExistingPath();
        } else if (path === 'new') {
            this.selectNewPath();
        }
    }

    handleSearchInput(event) {
        this.searchInput = event.target.value;
    }

    handleSearchKeyUp(event) {
        if (event.key === 'Enter') {
            this.handleSearch();
        }
    }

    handleSearch() {
        if (!this.showExistingPath) {
            return;
        }
        const v = (this.searchInput || '').trim();
        if (v.length < 2) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Search',
                    message: this.isBusinessEntityPath
                        ? 'Enter at least 2 characters (legal name, DBA, email, account #, website, billing city, or 4-digit EIN tail).'
                        : 'Enter at least 2 characters (name, email, account #, website, billing city, or 4-digit SSN tail).',
                    variant: 'warning'
                })
            );
            return;
        }
        this.hasSearched = true;
        this.selectedRow = undefined;
        this.identityVerified = false;
        this.syncIndividualSelectionDetail();
        this.applicantEntityTypeForWire = this.applicantEntityType;
        this.searchKeyForWire = v;
    }

    handleSelectRow(event) {
        const id = event.currentTarget.dataset.id;
        const row = this.searchResults.find((r) => String(r.id) === String(id));
        this.selectedRow = row ? { ...row } : undefined;
        this.identityVerified = false;
        this.syncIndividualSelectionDetail();
    }

    handleIdentityChange(event) {
        this.identityVerified = event.target.checked;
    }

    handleNewFieldChange(event) {
        const host = event.currentTarget;
        const f = host.dataset.field;
        const v = host.value;
        if (f === 'firstName') {
            this.newFirstName = v;
        } else if (f === 'lastName') {
            this.newLastName = v;
        } else if (f === 'dob') {
            this.newDob = v;
        } else if (f === 'ssn') {
            this.newSsn = v;
        } else if (f === 'street') {
            this.newStreet = v;
        } else if (f === 'city') {
            this.newCity = v;
        } else if (f === 'state') {
            this.newState = v;
        } else if (f === 'postal') {
            this.newPostal = v;
        } else if (f === 'phone') {
            this.newPhone = v;
        } else if (f === 'email') {
            this.newEmail = v;
        } else if (f === 'legalName') {
            this.newLegalName = v;
        } else if (f === 'dba') {
            this.newDba = v;
        } else if (f === 'website') {
            this.newWebsite = v;
        } else if (f === 'ein') {
            this.newEin = v;
        }
    }

    buildAccountDataFromRow(row) {
        if (!row) {
            return {};
        }
        const isBusiness = row.entityKind === 'BUSINESS';
        const phone =
            row.personMobilePhone || row.phone || row.personHomePhone || null;
        if (isBusiness) {
            return {
                entityKind: 'BUSINESS',
                firstName: null,
                lastName: null,
                name: row.name,
                dbaName: row.dbaName || null,
                personEmail: row.personEmail,
                phone: row.phone || null,
                personMobilePhone: null,
                personHomePhone: null,
                personBirthdate: null,
                personMailingStreet: row.personMailingStreet,
                personMailingCity: row.personMailingCity,
                personMailingState: row.personMailingState,
                personMailingPostalCode: row.personMailingPostalCode,
                ssnLast4: null,
                einLast4: row.einLast4 || null,
                billingStreet: row.billingStreet || null,
                billingCity: row.billingCity || null,
                billingState: row.billingState || null,
                billingPostalCode: row.billingPostalCode || null,
                accountNumber: row.accountNumber || null,
                website: row.website || null,
                accountType: row.accountType || null
            };
        }
        return {
            entityKind: 'PERSON',
            firstName: row.firstName,
            lastName: row.lastName,
            name: row.name,
            personEmail: row.personEmail,
            phone,
            personMobilePhone: row.personMobilePhone || null,
            personHomePhone: row.personHomePhone || null,
            personBirthdate: row.personBirthdate,
            personMailingStreet: row.personMailingStreet,
            personMailingCity: row.personMailingCity,
            personMailingState: row.personMailingState,
            personMailingPostalCode: row.personMailingPostalCode,
            ssnLast4: row.ssnLast4,
            billingStreet: row.billingStreet || null,
            billingCity: row.billingCity || null,
            billingState: row.billingState || null,
            billingPostalCode: row.billingPostalCode || null,
            accountNumber: row.accountNumber || null,
            website: row.website || null,
            accountType: row.accountType || null
        };
    }

    emitComplete(isNew, accountId, accountData) {
        const applicantEntityType = this.applicantEntityType === 'Business' ? 'Business' : 'Individual';
        this.dispatchEvent(
            new CustomEvent('daocustomercomplete', {
                bubbles: true,
                composed: true,
                detail: { isNew, accountId, accountData, applicantEntityType }
            })
        );
    }

    handleConfirmExisting() {
        if (!this.isExistingReady || this.customerRecordCommitted) {
            return;
        }
        const accountData = this.buildAccountDataFromRow(this.selectedRow);
        this.emitComplete(false, this.selectedRow.id, accountData);
    }

    readInputValue(field) {
        const el = this.template.querySelector(`lightning-input[data-field="${field}"]`);
        if (!el || el.value === undefined || el.value === null || el.value === '') {
            return null;
        }
        return el.value;
    }

    async handleCreateNetNew() {
        if (this.customerRecordCommitted) {
            return;
        }
        if (this.isBusinessEntityPath) {
            await this.handleCreateNetNewBusiness();
            return;
        }
        const lastNameDom = this.readInputValue('lastName');
        const lastName = String(lastNameDom != null ? lastNameDom : this.newLastName || '').trim();
        if (!lastName) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Required field',
                    message: 'Last name is required.',
                    variant: 'warning'
                })
            );
            return;
        }
        this.creating = true;
        try {
            const form = {
                firstName: this.readInputValue('firstName') || this.newFirstName || null,
                lastName,
                personEmail: this.readInputValue('email') || this.newEmail || null,
                phone: this.readInputValue('phone') || this.newPhone || null,
                personBirthdate: this.readInputValue('dob') || this.newDob || null,
                personMailingStreet: this.readInputValue('street') || this.newStreet || null,
                personMailingCity: this.readInputValue('city') || this.newCity || null,
                personMailingState: this.readInputValue('state') || this.newState || null,
                personMailingPostalCode: this.readInputValue('postal') || this.newPostal || null,
                ssnInput: this.readInputValue('ssn') || this.newSsn || null
            };
            const accountId = await createNetNewPersonAccount({
                lastName: form.lastName,
                firstName: form.firstName,
                personEmail: form.personEmail,
                phone: form.phone,
                personBirthdateStr: form.personBirthdate || null,
                personMailingStreet: form.personMailingStreet,
                personMailingCity: form.personMailingCity,
                personMailingState: form.personMailingState,
                personMailingPostalCode: form.personMailingPostalCode,
                ssnInput: form.ssnInput
            });
            const digits = (form.ssnInput || '').replace(/\D/g, '');
            const ssnLast4 = digits.length >= 4 ? digits.slice(-4) : digits || null;
            const accountData = {
                entityKind: 'PERSON',
                firstName: form.firstName,
                lastName: form.lastName,
                name: [form.firstName, form.lastName].filter(Boolean).join(' ').trim() || form.lastName,
                personEmail: form.personEmail,
                phone: form.phone,
                personBirthdate: form.personBirthdate,
                personMailingStreet: form.personMailingStreet,
                personMailingCity: form.personMailingCity,
                personMailingState: form.personMailingState,
                personMailingPostalCode: form.personMailingPostalCode,
                ssnLast4
            };
            this.emitComplete(true, accountId, accountData);
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Create failed',
                    message: e?.body?.message || e.message,
                    variant: 'error'
                })
            );
        } finally {
            this.creating = false;
        }
    }

    async handleCreateNetNewBusiness() {
        const legalDom = this.readInputValue('legalName');
        const legalName = String(legalDom != null ? legalDom : this.newLegalName || '').trim();
        if (!legalName) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Required field',
                    message: 'Legal business name is required.',
                    variant: 'warning'
                })
            );
            return;
        }
        this.creating = true;
        try {
            const dba = this.readInputValue('dba') || this.newDba || null;
            const businessEmail = this.readInputValue('email') || this.newEmail || null;
            const phone = this.readInputValue('phone') || this.newPhone || null;
            const website = this.readInputValue('website') || this.newWebsite || null;
            const street = this.readInputValue('street') || this.newStreet || null;
            const city = this.readInputValue('city') || this.newCity || null;
            const state = this.readInputValue('state') || this.newState || null;
            const postal = this.readInputValue('postal') || this.newPostal || null;
            const einInput = this.readInputValue('ein') || this.newEin || null;

            const accountId = await createNetNewBusinessAccount({
                legalName,
                dbaName: dba,
                businessEmail,
                phone,
                website,
                billingStreet: street,
                billingCity: city,
                billingState: state,
                billingPostalCode: postal,
                einInput
            });
            const einDigits = (einInput || '').replace(/\D/g, '');
            const einLast4 = einDigits.length >= 4 ? einDigits.slice(-4) : einDigits || null;
            const accountData = {
                entityKind: 'BUSINESS',
                name: legalName,
                dbaName: dba || null,
                personEmail: businessEmail,
                phone,
                website: website || null,
                billingStreet: street,
                billingCity: city,
                billingState: state,
                billingPostalCode: postal,
                einLast4,
                personMailingStreet: street,
                personMailingCity: city,
                personMailingState: state,
                personMailingPostalCode: postal
            };
            this.emitComplete(true, accountId, accountData);
        } catch (e) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Create failed',
                    message: e?.body?.message || e.message,
                    variant: 'error'
                })
            );
        } finally {
            this.creating = false;
        }
    }
}
