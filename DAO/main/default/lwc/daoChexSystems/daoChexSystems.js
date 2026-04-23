import { LightningElement, api, track } from 'lwc';
import { mockChexSystems } from 'c/daoMockApiService';

function categoryForProduct(p) {
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
    return 'other';
}

export default class DaoChexSystems extends LightningElement {
    @api applicationData;

    historyColumns = [
        { label: 'Date', fieldName: 'date', type: 'text' },
        { label: 'Institution', fieldName: 'institution', type: 'text' },
        { label: 'Code', fieldName: 'code', type: 'text' },
        { label: 'Detail', fieldName: 'detail', type: 'text', wrapText: true }
    ];

    /** loading | result | skipped | error */
    @track phase = 'loading';

    @track chexResult;

    connectedCallback() {
        if (!this.isChexEligibleSelection()) {
            this.phase = 'skipped';
            this.patchWizard({
                chexSystemsResult: {
                    status: 'not_applicable',
                    score: null,
                    history: [],
                    completedAt: new Date().toISOString(),
                    skipReason: 'ineligible'
                },
                chexDeclineActive: false,
                chexManagerOverrideApproved: false
            });
            return;
        }
        const saved = this.applicationData?.chexSystemsResult;
        if (saved != null && saved.status != null && String(saved.status) !== '') {
            const norm = String(saved.status).toLowerCase();
            if (norm === 'not_applicable') {
                this.runInquiry();
                return;
            }
            this.chexResult = {
                score: saved.score,
                status: saved.status,
                history: saved.history || [],
                inquiryType: saved.inquiryType || this.inferInquiryTypeFromApplication()
            };
            this.phase = 'result';
            return;
        }
        this.runInquiry();
    }

    isChexEligibleSelection() {
        const products = this.applicationData?.selectedProducts;
        if (!Array.isArray(products) || !products.length) {
            return false;
        }
        return products.some((p) => {
            const c = categoryForProduct(p);
            return c === 'checking' || c === 'savings' || c === 'mma' || c === 'cd';
        });
    }

    inferInquiryTypeFromApplication() {
        if (this.applicationData?.applicantEntityType === 'Business') {
            return 'business';
        }
        const ek = this.applicationData?.customerLookup?.accountData?.entityKind;
        return ek === 'BUSINESS' ? 'business' : 'consumer';
    }

    buildChexPayload() {
        return {
            applicantEntityType: this.applicationData?.applicantEntityType,
            customerLookup: this.applicationData?.customerLookup,
            parties: this.applicationData?.parties
        };
    }

    /**
     * @param {string} [forcedOutcome] Optional `clear`, `review`, or `decline` for demo (consumer Chex or BizChex based on applicant).
     */
    async runInquiry(forcedOutcome) {
        this.phase = 'loading';
        this.chexResult = undefined;
        try {
            const result = await mockChexSystems(this.buildChexPayload(), forcedOutcome);
            this.chexResult = result;
            const statusNorm = String(result.status || '').toLowerCase();
            const decline = statusNorm === 'decline';
            this.patchWizard({
                chexSystemsResult: {
                    score: result.score,
                    status: result.status,
                    history: result.history || [],
                    inquiryType: result.inquiryType || this.inferInquiryTypeFromApplication(),
                    completedAt: new Date().toISOString(),
                    ...(result.mockForcedOutcome ? { mockForcedOutcome: result.mockForcedOutcome } : {})
                },
                chexDeclineActive: decline,
                chexManagerOverrideApproved: false
            });
            this.phase = 'result';
        } catch (e) {
            this.phase = 'error';
            this.chexResult = { errorMessage: e?.message || 'Chex inquiry failed' };
            this.patchWizard({
                chexDeclineActive: false
            });
        }
    }

    patchWizard(detail) {
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail
            })
        );
    }

    get isLoading() {
        return this.phase === 'loading';
    }

    get isSkipped() {
        return this.phase === 'skipped';
    }

    get showMockOutcomeBar() {
        return !this.isSkipped;
    }

    get chexMockBarSubtext() {
        return this.isBusinessChex
            ? 'Forces BizChex (business) mock data for the selected outcome.'
            : 'Forces consumer ChexSystems mock data for the selected outcome.';
    }

    get skipMessage() {
        return 'ChexSystems / BizChex screening is not required for the current product selection (needs a checking, savings, money market, or CD product).';
    }

    get isBusinessChex() {
        return (
            this.chexResult?.inquiryType === 'business' ||
            this.applicationData?.chexSystemsResult?.inquiryType === 'business' ||
            this.inferInquiryTypeFromApplication() === 'business'
        );
    }

    get chexStepTitle() {
        return this.isBusinessChex ? 'BizChex inquiry' : 'ChexSystems inquiry';
    }

    get chexLoadingCaption() {
        return this.isBusinessChex ? 'Screening commercial account history' : 'Screening account history';
    }

    get chexLoadingSub() {
        return this.isBusinessChex
            ? 'BizChex (business ChexSystems) inquiry in progress — typically just a moment.'
            : 'ChexSystems consumer inquiry in progress — typically just a moment.';
    }

    get chexHistorySectionTitle() {
        return this.isBusinessChex ? 'Prior commercial account activity' : 'Prior account activity';
    }

    get chexHistoryEmptyMessage() {
        return this.isBusinessChex
            ? 'No commercial account issues on file for this mock BizChex inquiry.'
            : 'No prior account issues on file for this mock inquiry.';
    }

    get chexDeclineHeading() {
        return this.isBusinessChex
            ? 'Application cannot continue — BizChex decline.'
            : 'Application cannot continue — ChexSystems decline.';
    }

    get chexScoreFootnote() {
        return this.isBusinessChex
            ? 'Relative placement — mock BizChex commercial scale 300–850'
            : 'Relative placement (mock scale 300–850)';
    }

    get isError() {
        return this.phase === 'error';
    }

    get isResult() {
        return this.phase === 'result' && this.chexResult;
    }

    get gaugePercent() {
        const score = Number(this.chexResult?.score);
        if (Number.isNaN(score)) {
            return 0;
        }
        const clamped = Math.min(850, Math.max(300, score));
        return Math.round(((clamped - 300) / 550) * 100);
    }

    get statusNormalized() {
        return String(this.chexResult?.status || '').toLowerCase();
    }

    get statusBadgeLabel() {
        const s = this.statusNormalized;
        if (s === 'clear') {
            return 'Clear';
        }
        if (s === 'review') {
            return 'Review';
        }
        if (s === 'decline') {
            return 'Decline';
        }
        return this.chexResult?.status || '—';
    }

    get statusBadgeClass() {
        const s = this.statusNormalized;
        if (s === 'clear') {
            return 'chex-badge chex-badge_clear';
        }
        if (s === 'review') {
            return 'chex-badge chex-badge_review';
        }
        if (s === 'decline') {
            return 'chex-badge chex-badge_decline';
        }
        return 'chex-badge';
    }

    get historyRows() {
        const h = this.chexResult?.history;
        if (!Array.isArray(h)) {
            return [];
        }
        return h.map((row, i) => ({
            id: 'hx-' + i,
            date: row.date || '—',
            institution: row.institution || '—',
            code: row.code || '—',
            detail: row.detail || '—'
        }));
    }

    get showHistoryTable() {
        return this.historyRows.length > 0;
    }

    get historyEmpty() {
        return this.isResult && !this.showHistoryTable;
    }

    get showDeclineAlert() {
        return (
            this.isResult &&
            this.statusNormalized === 'decline' &&
            !this.applicationData?.chexManagerOverrideApproved
        );
    }

    handleRequestOverride() {
        this.patchWizard({
            chexManagerOverrideApproved: true,
            chexDeclineActive: false
        });
    }

    handleRetry() {
        if (this.isChexEligibleSelection()) {
            this.runInquiry();
        }
    }

    handleMockChexClear() {
        this.runInquiry('clear');
    }

    handleMockChexReview() {
        this.runInquiry('review');
    }

    handleMockChexDecline() {
        this.runInquiry('decline');
    }
}
