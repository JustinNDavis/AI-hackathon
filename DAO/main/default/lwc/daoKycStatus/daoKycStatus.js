import { LightningElement, api, track } from 'lwc';
import { mockAlloyKYC } from 'c/daoMockApiService';

const AUTO_ADVANCE_MS = 3000;

/** Human labels for Alloy-style outcome_reasons codes (snake_case); unknown codes fall back to title-cased tokens. */
const ALLOY_REASON_LABELS = {
    manual_review_queue: 'Manual review queue',
    policy_exception_review: 'Policy exception — manual review',
    pending_journey_application_review: 'Journey application pending review',
    sanctions_screening_possible_match: 'Sanctions screening — possible match',
    adverse_media_hit_low_severity: 'Adverse media — low severity hit',
    data_request_evaluation: 'Data request — additional evaluation',
    kba_step_up_required: 'KBA step-up required',
    step_up_kba_required: 'KBA step-up required',
    pending_action: 'Pending applicant action',
    address_standardized: 'Address standardized',
    phone_carrier_match_high_confidence: 'Phone carrier match (high confidence)',
    score_below_approval_threshold: 'Score below approval threshold',
    identity_verification_failed: 'Identity verification failed',
    vendor_timeout: 'Vendor timeout'
};

export default class DaoKycStatus extends LightningElement {
    @api applicationData;

    /** loading | approved | review | error */
    @track phase = 'loading';

    @track kycResult;

    /** @type {{ id: string, label: string, raw: string }[]} */
    @track flagChips = [];

    _autoAdvanceTimer;

    connectedCallback() {
        const saved = this.applicationData?.alloyKycResult;
        if (saved?.decision) {
            this.hydrateFromSaved(saved);
            return;
        }
        this.runKyc();
    }

    hydrateFromSaved(saved) {
        this.kycResult = {
            decision: saved.decision,
            confidence: saved.confidence,
            flags: saved.flags || [],
            rawData: saved.rawData,
            errorMessage: saved.errorMessage,
            denialReasons: saved.denialReasons
        };
        const flags = Array.isArray(saved.flags) ? saved.flags : [];
        this.flagChips = flags.map((raw, i) => ({
            id: `kyc-flag-${i}-${String(raw).slice(0, 24)}`,
            label: this.formatAlloyReason(raw),
            raw
        }));
        if (saved.decision === 'approved') {
            this.phase = 'approved';
        } else if (saved.decision === 'review') {
            this.phase = 'review';
        } else if (saved.decision === 'declined') {
            this.phase = 'declined';
        } else if (saved.decision === 'error') {
            this.phase = 'error';
        } else {
            this.phase = 'review';
        }
    }

    disconnectedCallback() {
        this.clearAutoAdvance();
    }

    clearAutoAdvance() {
        if (this._autoAdvanceTimer) {
            clearTimeout(this._autoAdvanceTimer);
            this._autoAdvanceTimer = null;
        }
    }

    get isLoading() {
        return this.phase === 'loading';
    }

    get isApproved() {
        return this.phase === 'approved';
    }

    get isReview() {
        return this.phase === 'review';
    }

    get isError() {
        return this.phase === 'error';
    }

    get isDeclined() {
        return this.phase === 'declined';
    }

    get isBusinessApplication() {
        return this.applicationData?.applicantEntityType === 'Business';
    }

    get stepTitle() {
        return this.isBusinessApplication ? 'Business verification (KYB)' : 'Identity verification (KYC)';
    }

    get loaderCaption() {
        return this.isBusinessApplication
            ? 'Securing your session · verifying business records'
            : 'Securing your session · verifying identity';
    }

    get loaderSub() {
        return this.isBusinessApplication
            ? 'Atlantic Union Bank partners with leading KYB and identity providers to protect you.'
            : 'Atlantic Union Bank partners with leading KYC providers to protect you.';
    }

    get reviewSubtext() {
        const flags = this.kycResult?.flags || [];
        const f = flags.map((x) => String(x).toLowerCase());
        if (f.some((x) => x.includes('data_request') || x.includes('step_up'))) {
            return this.isBusinessApplication
                ? 'Alloy returned data_request — additional action (e.g. documents or signer step-up) may be required before the journey can continue.'
                : 'Alloy returned data_request — additional applicant action (e.g. step-up KBA or documents) is required before the journey can continue.';
        }
        if (f.some((x) => x.includes('sanctions') || x.includes('adverse_media'))) {
            return 'Compliance review: possible sanctions or adverse-media match — an analyst must clear before proceeding.';
        }
        if (
            f.some(
                (x) =>
                    x.includes('manual_review') ||
                    x.includes('waiting_review') ||
                    x.includes('pending_journey_application') ||
                    x.includes('policy_exception')
            )
        ) {
            return 'The journey is in manual review (queue or policy exception). This mock simulates async analyst workflow.';
        }
        return 'This path simulates async / pending verification (queue, analyst review, or vendor callback).';
    }

    get declineMessage() {
        const reasons = this.kycResult?.denialReasons;
        if (Array.isArray(reasons) && reasons.length) {
            return reasons.join(' ');
        }
        const alloy = this.kycResult?.rawData?.alloyJourneyApplication;
        const ors = alloy?.terminal_reconciliation_output?.outcome_reasons;
        if (Array.isArray(ors) && ors.length) {
            return ors.map((r) => this.formatAlloyReason(r)).join(' · ');
        }
        return this.isBusinessApplication
            ? 'Verification did not pass automated policy for this business application.'
            : 'Identity verification did not pass automated policy for this application.';
    }

    get declinePanelSubtext() {
        return this.isBusinessApplication
            ? 'Alloy journey completed with outcome Denied (mock). Do not proceed without policy review and any required signers or KYB exceptions.'
            : 'Alloy journey completed with outcome Denied (mock). The application cannot continue unless policy grants an exception.';
    }

    get confidenceDisplay() {
        const n = this.kycResult?.confidence;
        return n != null ? `${n}%` : '—';
    }

    get errorMessage() {
        return this.kycResult?.errorMessage || 'Something went wrong.';
    }

    buildPersonPayload() {
        return {
            applicantEntityType: this.applicationData?.applicantEntityType,
            customerLookup: this.applicationData?.customerLookup,
            needsAssessment: this.applicationData?.needsAssessment,
            parties: this.applicationData?.parties,
            selectedProducts: this.applicationData?.selectedProducts
        };
    }

    formatFlag(raw) {
        if (!raw) {
            return '';
        }
        return String(raw)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    formatAlloyReason(code) {
        if (code == null || code === '') {
            return '';
        }
        const key = String(code);
        if (Object.prototype.hasOwnProperty.call(ALLOY_REASON_LABELS, key)) {
            return ALLOY_REASON_LABELS[key];
        }
        return this.formatFlag(key);
    }

    /**
     * @param {string} [forcedScenario] e.g. `approved_clean` or `review_manual` for demo buttons; omit for random mock.
     */
    async runKyc(forcedScenario) {
        this.phase = 'loading';
        this.kycResult = undefined;
        this.flagChips = [];
        this.clearAutoAdvance();

        try {
            const result = await mockAlloyKYC(this.buildPersonPayload(), forcedScenario);
            this.kycResult = result;
            const flags = Array.isArray(result.flags) ? result.flags : [];
            this.flagChips = flags.map((raw, i) => ({
                id: `kyc-flag-${i}-${String(raw).slice(0, 24)}`,
                label: this.formatAlloyReason(raw),
                raw
            }));

            this.patchApplication(result);

            if (result.decision === 'approved') {
                this.phase = 'approved';
                this._autoAdvanceTimer = setTimeout(() => {
                    this._autoAdvanceTimer = null;
                    this.requestWizardNav('next');
                }, AUTO_ADVANCE_MS);
            } else if (result.decision === 'review') {
                this.phase = 'review';
            } else if (result.decision === 'declined') {
                this.phase = 'declined';
            } else if (result.decision === 'error') {
                this.phase = 'error';
            } else {
                this.phase = 'review';
            }
        } catch (e) {
            this.phase = 'error';
            this.kycResult = { errorMessage: e?.message || 'Verification failed' };
        }
    }

    patchApplication(result) {
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail: {
                    alloyKycResult: {
                        decision: result.decision,
                        confidence: result.confidence,
                        flags: result.flags || [],
                        rawData: result.rawData,
                        completedAt: new Date().toISOString(),
                        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
                        ...(result.denialReasons ? { denialReasons: result.denialReasons } : {})
                    }
                }
            })
        );
    }

    requestWizardNav(direction) {
        this.dispatchEvent(
            new CustomEvent('daowizardrequestnav', {
                bubbles: true,
                composed: true,
                detail: { direction }
            })
        );
    }

    get showFlagChips() {
        return this.phase === 'review' && this.flagChips.length > 0;
    }

    handleContinueManualReview() {
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail: {
                    alloyKycReviewAcknowledged: true,
                    alloyKycNotifyWhenComplete: true
                }
            })
        );
        this.requestWizardNav('next');
    }

    handleRetry() {
        this.runKyc();
    }

    handleMockApproved() {
        this.runKyc('approved_clean');
    }

    /** Manual review path with several flag chips (queue, policy, pending review). */
    handleMockReview() {
        this.runKyc('review_manual');
    }
}
