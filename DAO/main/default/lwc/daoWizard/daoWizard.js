import { LightningElement, api, track } from 'lwc';
import createApplication from '@salesforce/apex/DAO_ApplicationController.createApplication';
import saveApplication from '@salesforce/apex/DAO_ApplicationController.saveApplication';
import getApplication from '@salesforce/apex/DAO_ApplicationController.getApplication';
import aubBrandLogo from '@salesforce/resourceUrl/DAO_AUB_Logo';

/**
 * Canonical DAO wizard steps (1–10). Step 8 (Chex) is omitted only after the user has passed product selection
 * (step 5+) with no Chex-eligible deposit product. Until then Chex stays in the visible path so step 1 always
 * reads 1/10 — even if the payload already has non-Chex products loaded from a draft (otherwise you get 1/9).
 */
const STEP_SEQUENCE = [
    { id: 1, key: 'CustomerLookup', label: 'Customer' },
    { id: 2, key: 'NeedsAssessment', label: 'Needs assessment' },
    { id: 3, key: 'PartyGather', label: 'Party gather' },
    { id: 4, key: 'ProductSelection', label: 'Product selection' },
    { id: 5, key: 'Confirmation', label: 'Confirmation' },
    { id: 6, key: 'KycStatus', label: 'KYC status' },
    { id: 7, key: 'BankerReview', label: 'Banker review' },
    { id: 8, key: 'ChexSystems', label: 'ChexSystems', skipUnlessChexEligible: true },
    { id: 9, key: 'AncillaryServices', label: 'Ancillary services' },
    { id: 10, key: 'Funding', label: 'Funding' }
];

const PERSIST_DEBOUNCE_MS = 450;

export default class DaoWizard extends LightningElement {
    @api recordId;

    /** Official wordmark PNG from atlanticunionbank.com (static resource DAO_AUB_Logo). */
    aubBrandLogoUrl = aubBrandLogo;

    /** 1–10 canonical step id (step 8 only visited when deposit products are selected). */
    currentStepId = 1;

    _persistDebounceTimer;

    @track applicationData = {
        applicationId: null,
        selectedProducts: []
    };

    get hasDepositProduct() {
        const products = this.applicationData?.selectedProducts;
        return Array.isArray(products) && products.length > 0;
    }

    get hasChexEligibleDepositProduct() {
        const products = this.applicationData?.selectedProducts;
        if (!Array.isArray(products) || products.length === 0) {
            return false;
        }
        return products.some((p) => {
            const c = this.productCategory(p);
            return c === 'checking' || c === 'savings' || c === 'mma' || c === 'cd';
        });
    }

    /** @returns {'checking'|'savings'|'mma'|'cd'|'ira'|'other'} */
    productCategory(p) {
        if (typeof p === 'string') {
            const s = p.toLowerCase();
            if (s.includes('checking')) {
                return 'checking';
            }
            if (s.includes('savings') && !s.includes('market')) {
                return 'savings';
            }
            if (s.includes('mma') || s.includes('money')) {
                return 'mma';
            }
            if (s.includes('cd') || s.includes('certificate')) {
                return 'cd';
            }
            if (s.includes('ira')) {
                return 'ira';
            }
            return 'other';
        }
        const id = (p?.id || '').toLowerCase();
        const name = (p?.productName || p?.name || '').toLowerCase();
        const blob = `${id} ${name}`;
        if (blob.includes('checking')) {
            return 'checking';
        }
        if (blob.includes('savings') && !blob.includes('market')) {
            return 'savings';
        }
        if (blob.includes('money') || blob.includes('mma')) {
            return 'mma';
        }
        if (blob.includes('cd') || blob.includes('certificate')) {
            return 'cd';
        }
        if (blob.includes('ira')) {
            return 'ira';
        }
        return 'other';
    }

    /** Chex is dropped from the path only after step 5+ when products are chosen and none are Chex-eligible. */
    get visibleStepIds() {
        const lockChexSkip = this.currentStepId >= 5 && this.hasDepositProduct;
        return STEP_SEQUENCE.filter((s) => {
            if (s.skipUnlessChexEligible) {
                if (!lockChexSkip) {
                    return true;
                }
                return this.hasChexEligibleDepositProduct;
            }
            return true;
        }).map((s) => s.id);
    }

    get currentStepDef() {
        return STEP_SEQUENCE.find((s) => s.id === this.currentStepId) || STEP_SEQUENCE[0];
    }

    get currentStepTitle() {
        return this.currentStepDef.label;
    }

    get displayStepIndex() {
        const steps = this.visibleStepIds;
        const i = steps.indexOf(this.currentStepId);
        return i >= 0 ? i + 1 : 1;
    }

    get totalVisibleSteps() {
        return this.visibleStepIds.length;
    }

    get progressBarValue() {
        const t = this.totalVisibleSteps;
        if (t < 1) {
            return 0;
        }
        return (this.displayStepIndex / t) * 100;
    }

    get progressFillStyle() {
        return { width: `${this.progressBarValue}%` };
    }

    get progressDisplayPct() {
        return Math.round(this.progressBarValue);
    }

    get isFirstVisibleStep() {
        return this.visibleStepIds[0] === this.currentStepId;
    }

    get isLastVisibleStep() {
        const steps = this.visibleStepIds;
        return steps[steps.length - 1] === this.currentStepId;
    }

    get nextButtonLabel() {
        return this.isLastVisibleStep ? 'Finish' : 'Next';
    }

    get nextButtonDisabled() {
        if (!this.canAdvanceFromCurrentStep) {
            return true;
        }
        if (this.currentStepId === 7 && !this.applicationData?.bankerReviewAccurateConfirmed) {
            return true;
        }
        if (
            this.currentStepId === 8 &&
            this.applicationData?.chexDeclineActive &&
            !this.applicationData?.chexManagerOverrideApproved
        ) {
            return true;
        }
        if (this.currentStepId === 10 && !this.isFundingStepComplete) {
            return true;
        }
        return false;
    }

    /** Next/Finish allowed only when the current step’s required data is present. */
    get canAdvanceFromCurrentStep() {
        const id = this.currentStepId;
        if (id === 1) {
            return this.isStep1Complete;
        }
        if (id === 2) {
            return this.isStep2Complete;
        }
        if (id === 3) {
            return this.isStep3Complete;
        }
        if (id === 4) {
            return this.isStep4Complete;
        }
        if (id === 5) {
            return this.isStep5Complete;
        }
        if (id === 6) {
            return this.isStep6Complete;
        }
        if (id === 8) {
            return this.isStep8Complete;
        }
        return true;
    }

    get isStep1Complete() {
        const cl = this.applicationData?.customerLookup;
        const pid = this.applicationData?.personAccountId;
        return !!(pid && cl?.accountId && String(pid) === String(cl.accountId));
    }

    get isStep2Complete() {
        const n = this.applicationData?.needsAssessment;
        return !!(n?.purposeOfAccount && n?.anticipatedMonthlyDepositsRange && n?.primarySourceOfFunds);
    }

    get isStep3Complete() {
        const parties = this.applicationData?.parties;
        return Array.isArray(parties) && parties.length > 0;
    }

    get isStep4Complete() {
        return this.hasDepositProduct;
    }

    get isStep5Complete() {
        return this.applicationData?.confirmationAcknowledged === true;
    }

    get isStep6Complete() {
        const k = this.applicationData?.alloyKycResult;
        if (!k?.decision) {
            return false;
        }
        if (k.decision === 'declined' || k.decision === 'error') {
            return false;
        }
        if (k.decision === 'approved') {
            return true;
        }
        return !!this.applicationData?.alloyKycReviewAcknowledged;
    }

    get isStep8Complete() {
        if (!this.hasChexEligibleDepositProduct) {
            return true;
        }
        return !!this.applicationData?.chexSystemsResult?.status;
    }

    get isFundingStepComplete() {
        const f = this.applicationData?.funding;
        if (!f || !f.method) {
            return false;
        }
        if (f.method === 'fund_later') {
            return true;
        }
        if (f.method === 'plaid') {
            return f.plaid?.linked === true;
        }
        if (f.method === 'swivel') {
            return String(f.wireReference || '').trim().length > 0;
        }
        return false;
    }

    get applicationIdDisplay() {
        const id = this.applicationData?.applicationId;
        if (!id || String(id).startsWith('(')) {
            return null;
        }
        return id;
    }

    get isStep1() {
        return this.currentStepId === 1;
    }
    get isStep2() {
        return this.currentStepId === 2;
    }
    get isStep3() {
        return this.currentStepId === 3;
    }
    get isStep4() {
        return this.currentStepId === 4;
    }
    get isStep5() {
        return this.currentStepId === 5;
    }
    get isStep6() {
        return this.currentStepId === 6;
    }
    get isStep7() {
        return this.currentStepId === 7;
    }
    get isStep8() {
        return this.currentStepId === 8;
    }
    get isStep9() {
        return this.currentStepId === 9;
    }
    get isStep10() {
        return this.currentStepId === 10;
    }

    async connectedCallback() {
        let id = this.recordId || null;
        if (id) {
            try {
                const json = await getApplication({ applicationId: id });
                const parsed = JSON.parse(json);
                const step = Number(parsed.currentStepId);
                this.applicationData = { ...this.applicationData, ...parsed };
                if (Number.isInteger(step) && step >= 1 && step <= 10) {
                    this.currentStepId = step;
                }
                this.reconcileCurrentStep();
            } catch (e) {
                this.applicationData = {
                    ...this.applicationData,
                    applicationId: id,
                    loadError: e?.body?.message || e?.message || 'Failed to load application'
                };
            }
            return;
        }
        try {
            id = await createApplication();
        } catch (e) {
            id = '(create failed — check permissions)';
        }
        this.applicationData = {
            ...this.applicationData,
            applicationId: id
        };
    }

    handleDataPatch(event) {
        const patch = event.detail || {};
        this.applicationData = { ...this.applicationData, ...patch };
        this.reconcileCurrentStep();
        this.schedulePersistApplication();
    }

    schedulePersistApplication() {
        if (this._persistDebounceTimer) {
            clearTimeout(this._persistDebounceTimer);
        }
        this._persistDebounceTimer = setTimeout(() => {
            this._persistDebounceTimer = null;
            this.persistApplication();
        }, PERSIST_DEBOUNCE_MS);
    }

    disconnectedCallback() {
        if (this._persistDebounceTimer) {
            clearTimeout(this._persistDebounceTimer);
        }
    }

    handleCustomerComplete(event) {
        const { isNew, accountId, accountData, applicantEntityType } = event.detail || {};
        this.applicationData = {
            ...this.applicationData,
            customerLookup: { isNew, accountId, accountData },
            personAccountId: accountId,
            applicantEntityType: applicantEntityType || 'Individual'
        };
        this.schedulePersistApplication();
    }

    handleProductSelectionComplete(event) {
        const selectedProducts = event.detail?.selectedProducts ?? [];
        this.applicationData = {
            ...this.applicationData,
            selectedProducts
        };
        this.reconcileCurrentStep();
        this.schedulePersistApplication();
    }

    handleFundingComplete(event) {
        const funding = event.detail?.funding;
        if (funding && typeof funding === 'object') {
            this.applicationData = {
                ...this.applicationData,
                funding
            };
            this.schedulePersistApplication();
        }
    }

    handleWizardRequestNav(event) {
        const direction = event.detail?.direction;
        if (direction === 'next') {
            this.navigate('next');
        } else if (direction === 'back') {
            this.navigate('back');
        }
    }

    async handleGotoStep(event) {
        const step = Number(event.detail?.step);
        if (Number.isInteger(step) && step >= 1 && step <= 10) {
            this.applicationData = {
                ...this.applicationData,
                bankerReviewAccurateConfirmed: false
            };
            this.currentStepId = step;
            await this.persistApplication();
        }
    }

    reconcileCurrentStep() {
        const steps = this.visibleStepIds;
        if (!steps.includes(this.currentStepId)) {
            const forward = steps.filter((id) => id > this.currentStepId);
            this.currentStepId = forward.length ? forward[0] : steps[steps.length - 1] || 1;
        }
    }

    handleBack() {
        this.navigate('back');
    }

    async handleNext() {
        if (this.isLastVisibleStep) {
            await this.persistApplication();
            this.dispatchEvent(
                new CustomEvent('daowizardcomplete', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        applicationId: this.applicationData?.applicationId,
                        applicationData: { ...this.applicationData }
                    }
                })
            );
            return;
        }
        await this.navigate('next');
    }

    async navigate(direction) {
        const steps = this.visibleStepIds;
        let idx = steps.indexOf(this.currentStepId);
        if (idx < 0) {
            this.currentStepId = steps[0] || 1;
            idx = 0;
        }
        const delta = direction === 'next' ? 1 : -1;
        const newIdx = idx + delta;
        if (newIdx < 0 || newIdx >= steps.length) {
            return;
        }
        this.currentStepId = steps[newIdx];
        await this.persistApplication();
    }

    async persistApplication() {
        const id = this.applicationData?.applicationId;
        if (!id || String(id).startsWith('(')) {
            return;
        }
        try {
            const payload = { ...this.applicationData, currentStepId: this.currentStepId };
            delete payload.loadError;
            await saveApplication({ applicationJson: JSON.stringify(payload) });
        } catch (e) {
            /* non-blocking — client state remains; optional: toast */
        }
    }
}
