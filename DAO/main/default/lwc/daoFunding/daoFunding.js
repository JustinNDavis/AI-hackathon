import { LightningElement, api, track } from 'lwc';
import { mockPlaidLink } from 'c/daoMockApiService';

export default class DaoFunding extends LightningElement {
    @api applicationData;

    get isBusinessApplicant() {
        return this.applicationData?.applicantEntityType === 'Business';
    }

    get fundingLede() {
        return this.isBusinessApplicant
            ? 'Choose how this business account will be funded. The same mock Plaid and wire flows are used for this demo; link an external account or note wire details as appropriate for your process.'
            : 'Choose how the new account will be funded. Options below integrate with mock Plaid and Swivel flows for this demo.';
    }

    get plaidHelperText() {
        return this.isBusinessApplicant
            ? 'Link an external bank account to transfer initial funds (mock). In production, policy may require a signer’s personal or business account.'
            : 'Securely link an external bank account to transfer initial funds (mock Plaid Link).';
    }

    @track plaidLoading = false;

    @track plaidError;

    get funding() {
        return this.applicationData?.funding || {};
    }

    get method() {
        return this.funding.method || '';
    }

    get isPlaid() {
        return this.method === 'plaid';
    }

    get isSwivel() {
        return this.method === 'swivel';
    }

    get isFundLater() {
        return this.method === 'fund_later';
    }

    get wireReference() {
        return this.funding.wireReference ?? '';
    }

    get plaidResult() {
        return this.funding.plaid;
    }

    get showPlaidDetails() {
        return this.isPlaid && this.plaidResult?.linked;
    }

    get plaidCardClass() {
        return this.cardClass(this.isPlaid);
    }

    get swivelCardClass() {
        return this.cardClass(this.isSwivel);
    }

    get fundLaterCardClass() {
        return this.cardClass(this.isFundLater);
    }

    cardClass(selected) {
        const base = 'fund-card slds-box slds-m-bottom_small';
        return selected ? `${base} fund-card_selected` : base;
    }

    selectPlaid() {
        this.applyMethod('plaid');
    }

    selectSwivel() {
        this.applyMethod('swivel');
    }

    selectFundLater() {
        this.applyMethod('fund_later');
    }

    applyMethod(m) {
        this.plaidError = undefined;
        const now = new Date().toISOString();
        const next = {
            method: m,
            plaid: m === 'plaid' ? this.funding.plaid : null,
            wireReference: m === 'swivel' ? this.funding.wireReference || '' : null,
            completedAt: m === 'fund_later' ? now : null
        };
        this.patchAndMaybeComplete(next);
    }

    handlePlaidRadio(event) {
        if (event.target.checked) {
            this.selectPlaid();
        }
    }

    handleSwivelRadio(event) {
        if (event.target.checked) {
            this.selectSwivel();
        }
    }

    handleFundLaterRadio(event) {
        if (event.target.checked) {
            this.selectFundLater();
        }
    }

    handleCardKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const fn = event.currentTarget.dataset.select;
            if (fn === 'plaid') {
                this.selectPlaid();
            } else if (fn === 'swivel') {
                this.selectSwivel();
            } else if (fn === 'fund_later') {
                this.selectFundLater();
            }
        }
    }

    async handleMockPlaidLink() {
        this.plaidError = undefined;
        this.plaidLoading = true;
        try {
            const result = await mockPlaidLink({
                applicationId: this.applicationData?.applicationId,
                customerLookup: this.applicationData?.customerLookup
            });
            const next = {
                method: 'plaid',
                plaid: result,
                wireReference: null,
                completedAt: new Date().toISOString()
            };
            this.patchFunding(next);
            this.emitFundingComplete(next);
        } catch (e) {
            this.plaidError = e?.body?.message || e?.message || 'Plaid Link failed (mock).';
        } finally {
            this.plaidLoading = false;
        }
    }

    handleWireChange(event) {
        const value = event.target.value;
        const next = {
            method: 'swivel',
            plaid: null,
            wireReference: value,
            completedAt: String(value || '').trim() ? new Date().toISOString() : null
        };
        this.patchAndMaybeComplete(next);
    }

    patchAndMaybeComplete(nextFunding) {
        this.patchFunding(nextFunding);
        if (this.isPathComplete(nextFunding)) {
            this.emitFundingComplete(nextFunding);
        }
    }

    /** @param {Record<string, unknown>} f */
    isPathComplete(f) {
        if (!f?.method) {
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

    patchFunding(funding) {
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail: { funding }
            })
        );
    }

    emitFundingComplete(funding) {
        this.dispatchEvent(
            new CustomEvent('daowizardfundingcomplete', {
                bubbles: true,
                composed: true,
                detail: { funding }
            })
        );
    }
}
