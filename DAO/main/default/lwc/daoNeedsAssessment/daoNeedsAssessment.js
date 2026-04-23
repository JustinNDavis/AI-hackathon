import { LightningElement, api, track } from 'lwc';

const PURPOSE_OPTIONS = [
    { label: 'Personal Savings', value: 'Personal_Savings' },
    { label: 'Direct Deposit', value: 'Direct_Deposit' },
    { label: 'Emergency Fund', value: 'Emergency_Fund' },
    { label: 'Business Purposes', value: 'Business_Purposes' },
    { label: 'Other', value: 'Other' }
];

/** Deposit range for anticipated monthly deposits (min/max USD for downstream KYC payloads). */
const DEPOSIT_RANGE_OPTIONS = [
    { label: '$0 – $499', value: '0_499', min: 0, max: 499 },
    { label: '$500 – $2,499', value: '500_2499', min: 500, max: 2499 },
    { label: '$2,500 – $4,999', value: '2500_4999', min: 2500, max: 4999 },
    { label: '$5,000 – $9,999', value: '5000_9999', min: 5000, max: 9999 },
    { label: '$10,000+', value: '10000_plus', min: 10000, max: null },
    { label: 'Prefer not to say', value: 'unspecified', min: null, max: null }
];

const SOURCE_OPTIONS = [
    { label: 'Employment', value: 'Employment' },
    { label: 'Business Income', value: 'Business_Income' },
    { label: 'Investments', value: 'Investments' },
    { label: 'Government Benefits', value: 'Government_Benefits' },
    { label: 'Other', value: 'Other' }
];

const PURPOSE_OPTIONS_BUSINESS = [
    { label: 'Operating / treasury', value: 'Business_Operating' },
    { label: 'Payroll', value: 'Business_Payroll' },
    { label: 'Reserves / savings', value: 'Business_Reserves' },
    { label: 'Other business purpose', value: 'Business_Other' }
];

const SOURCE_OPTIONS_BUSINESS = [
    { label: 'Operating revenue', value: 'Business_Operating_Revenue' },
    { label: 'Owner or member capital', value: 'Business_Owner_Capital' },
    { label: 'Investments / treasury', value: 'Business_Treasury' },
    { label: 'Other', value: 'Other' }
];

export default class DaoNeedsAssessment extends LightningElement {
    @api applicationData;

    depositRangeOptions = DEPOSIT_RANGE_OPTIONS.map(({ label, value }) => ({ label, value }));

    get isBusinessApplicant() {
        return this.applicationData?.applicantEntityType === 'Business';
    }

    get purposeOptions() {
        return this.isBusinessApplicant ? PURPOSE_OPTIONS_BUSINESS : PURPOSE_OPTIONS;
    }

    get sourceOptions() {
        return this.isBusinessApplicant ? SOURCE_OPTIONS_BUSINESS : SOURCE_OPTIONS;
    }

    get needsAssessmentLede() {
        return this.isBusinessApplicant
            ? 'Account purpose and expected cash flow for this business. This data is passed through to business verification (KYB) and risk steps later in the wizard.'
            : 'Account purpose and funding profile. This data is passed through to identity verification (KYC) on a later step.';
    }

    get specialCircumstancesPlaceholder() {
        return this.isBusinessApplicant
            ? 'Optional — e.g. recent ownership change, complex structure, beneficial ownership notes…'
            : 'Optional — e.g. power of attorney, conservatorship, recent life event…';
    }

    @track purposeOfAccount = '';
    @track anticipatedMonthlyDepositsRange = '';
    @track primarySourceOfFunds = '';
    @track specialCircumstances = '';

    connectedCallback() {
        const n = this.applicationData?.needsAssessment;
        if (!n) {
            return;
        }
        this.purposeOfAccount = n.purposeOfAccount || '';
        this.anticipatedMonthlyDepositsRange = n.anticipatedMonthlyDepositsRange || '';
        this.primarySourceOfFunds = n.primarySourceOfFunds || '';
        this.specialCircumstances = n.specialCircumstances || '';
    }

    patchWizardNeeds() {
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail: { needsAssessment: this.buildFormPayload() }
            })
        );
    }

    handlePurposeChange(event) {
        this.purposeOfAccount = event.detail.value;
        this.patchWizardNeeds();
    }

    handleDepositRangeChange(event) {
        this.anticipatedMonthlyDepositsRange = event.detail.value;
        this.patchWizardNeeds();
    }

    handleSourceChange(event) {
        this.primarySourceOfFunds = event.detail.value;
        this.patchWizardNeeds();
    }

    handleCircumstancesChange(event) {
        this.specialCircumstances = event.target.value;
        this.patchWizardNeeds();
    }

    get depositRangeMeta() {
        return DEPOSIT_RANGE_OPTIONS.find((o) => o.value === this.anticipatedMonthlyDepositsRange);
    }

    buildFormPayload() {
        const meta = this.depositRangeMeta;
        return {
            purposeOfAccount: this.purposeOfAccount,
            anticipatedMonthlyDepositsRange: this.anticipatedMonthlyDepositsRange,
            anticipatedMonthlyDepositsMin: meta ? meta.min : null,
            anticipatedMonthlyDepositsMax: meta ? meta.max : null,
            primarySourceOfFunds: this.primarySourceOfFunds,
            specialCircumstances: (this.specialCircumstances || '').trim() || null
        };
    }
}
