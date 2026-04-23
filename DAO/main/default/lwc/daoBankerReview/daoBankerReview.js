import { LightningElement, api, track } from 'lwc';

function formatKey(val) {
    if (val == null || val === '') {
        return '—';
    }
    return String(val).replace(/_/g, ' ');
}

export default class DaoBankerReview extends LightningElement {
    @api applicationData;

    @track bankerAccurateConfirmed = false;

    connectedCallback() {
        this.bankerAccurateConfirmed = !!this.applicationData?.bankerReviewAccurateConfirmed;
    }

    get warnings() {
        const list = [];
        let w = 0;
        const add = (message, source = 'rule') => {
            w += 1;
            list.push({ id: `w-${w}`, message, source });
        };

        const data = this.applicationData || {};
        const kyc = data.alloyKycResult;

        if (kyc?.flags?.length) {
            kyc.flags.forEach((f, i) => {
                add(`KYC flag: ${formatKey(f)}`, 'alloy');
            });
        }
        if (kyc?.decision === 'review') {
            add('KYC decision is pending manual review — verify queue status before proceeding.', 'alloy');
        }
        if (kyc?.decision === 'declined') {
            add('KYC / Alloy decision is declined — applicant should not proceed without a documented exception.', 'alloy');
        }
        if (kyc?.decision === 'error') {
            add('KYC / Alloy journey returned an error — no final decision; retry or investigate vendor connectivity.', 'alloy');
        }

        if (!data.customerLookup?.accountId) {
            add('Customer is not linked to an Account.', 'missing');
        }
        const acct = data.customerLookup?.accountData;
        if (!acct?.name && !acct?.firstName && !data.customerLookup?.accountId) {
            add('Customer identity details are incomplete.', 'missing');
        }

        const na = data.needsAssessment;
        if (!na?.purposeOfAccount || !na?.anticipatedMonthlyDepositsRange || !na?.primarySourceOfFunds) {
            add('Needs assessment is incomplete (purpose, deposit range, or source of funds).', 'missing');
        }

        const parties = data.parties;
        if (!parties?.length) {
            add('No parties recorded on the application.', 'missing');
        }

        const products = data.selectedProducts;
        if (!products?.length) {
            add('No deposit products selected.', 'missing');
        }

        if (!kyc?.decision) {
            add(
                data.applicantEntityType === 'Business'
                    ? 'KYC / business verification has not completed or is not recorded.'
                    : 'KYC / identity verification has not completed or is not recorded.',
                'missing'
            );
        }

        const hasCd = this.hasCdProduct(products);
        if (hasCd && !data.fundingMethodCaptured && !data.mockPlaidLinkResult?.linked) {
            add('Certificate of deposit selected — funding method / link not captured yet (complete Funding step).', 'rule');
        }

        if (data.isCustodialMinor && !data.custodialDetails?.minorFullName && !parties?.some((p) => p.role === 'Minor')) {
            add('Custodial / minor account indicated — minor details should be confirmed.', 'rule');
        }

        return list;
    }

    hasCdProduct(products) {
        if (!Array.isArray(products)) {
            return false;
        }
        return products.some((p) => {
            if (typeof p === 'string') {
                return p.toLowerCase().includes('cd');
            }
            const id = (p.id || '').toLowerCase();
            const name = (p.productName || p.name || '').toLowerCase();
            return id.includes('cd') || name.includes('cd');
        });
    }

    get hasWarnings() {
        return this.warnings.length > 0;
    }

    get partiesSummaryLinesEmpty() {
        return !this.partiesSummaryLines.length;
    }

    get productsSummaryLinesEmpty() {
        return !this.productsSummaryLines.length;
    }

    get customerSummaryLines() {
        const cl = this.applicationData?.customerLookup;
        if (!cl) {
            return [{ label: 'Status', value: '—' }];
        }
        const a = cl.accountData || {};
        const isBiz = this.applicationData?.applicantEntityType === 'Business';
        const name = (a.name || '').trim() || [a.firstName, a.lastName].filter(Boolean).join(' ').trim() || '—';
        const lines = [
            { label: 'Applicant entity', value: isBiz ? 'Business' : 'Individual' },
            { label: 'Customer type', value: cl.isNew ? 'New' : cl.isNew === false ? 'Existing' : '—' },
            { label: 'Account Id', value: cl.accountId || '—' },
            { label: 'Name', value: name },
            { label: 'Email', value: a.personEmail || '—' },
            { label: 'Phone', value: a.phone || '—' }
        ];
        if (isBiz) {
            lines.push({ label: 'DBA', value: a.dbaName || '—' });
            lines.push({ label: 'EIN last 4', value: a.einLast4 ? '····' + a.einLast4 : '—' });
            lines.push({ label: 'Website', value: a.website || '—' });
        } else {
            lines.push({ label: 'DOB', value: a.personBirthdate || '—' });
            lines.push({ label: 'SSN last 4', value: a.ssnLast4 ? '····' + a.ssnLast4 : '—' });
        }
        return lines;
    }

    get needsSummaryLines() {
        const na = this.applicationData?.needsAssessment;
        if (!na) {
            return [{ label: 'Status', value: 'Not completed' }];
        }
        return [
            { label: 'Purpose of account', value: formatKey(na.purposeOfAccount) },
            { label: 'Anticipated monthly deposits', value: formatKey(na.anticipatedMonthlyDepositsRange) },
            { label: 'Primary source of funds', value: formatKey(na.primarySourceOfFunds) },
            { label: 'Special circumstances', value: na.specialCircumstances || '—' }
        ];
    }

    get partiesSummaryLines() {
        const parties = this.applicationData?.parties;
        if (!parties?.length) {
            return [];
        }
        const isBiz = this.applicationData?.applicantEntityType === 'Business';
        return parties.map((p, i) => {
            let roleLabel = formatKey(p.role);
            if (p.role === 'JointAccountHolder') {
                roleLabel = isBiz ? 'Signer' : 'Joint account holder';
            }
            const rel = p.relationship
                ? isBiz
                    ? ' · Capacity: ' + formatKey(p.relationship)
                    : ' · ' + formatKey(p.relationship)
                : '';
            const dob = p.dateOfBirth ? ' · DOB ' + p.dateOfBirth : '';
            return { id: 'pty-' + i, text: `${p.fullName || '—'} · ${roleLabel}${rel}${dob}` };
        });
    }

    get productsSummaryLines() {
        const products = this.applicationData?.selectedProducts;
        if (!products?.length) {
            return [];
        }
        return products.map((p, i) => {
            if (typeof p === 'string') {
                return { id: 'prd-' + i, text: formatKey(p) };
            }
            return {
                id: p.id || 'prd-' + i,
                text: `${p.productName || p.name || p.id || 'Product'}${p.apy ? ' · APY ' + p.apy : ''}${p.minBalance ? ' · Min ' + p.minBalance : ''}`
            };
        });
    }

    get kycSummaryLines() {
        const kyc = this.applicationData?.alloyKycResult;
        if (!kyc) {
            return [{ label: 'Status', value: '—' }];
        }
        const ja = kyc.rawData?.alloyJourneyApplication;
        const lines = [
            { label: 'Decision', value: formatKey(kyc.decision) },
            { label: 'Confidence', value: kyc.confidence != null ? `${kyc.confidence}%` : '—' },
            { label: 'Flags', value: (kyc.flags || []).map((f) => formatKey(f)).join(', ') || 'None' },
            { label: 'Journey status (Alloy)', value: ja?.journey_application_status || ja?.status || '—' },
            { label: 'Complete outcome', value: ja?.complete_outcome || '—' },
            { label: 'Journey application token', value: ja?.journey_application_token || '—' },
            { label: 'Mock scenario', value: kyc.rawData?.mockScenario || '—' },
            { label: 'Completed', value: kyc.completedAt || '—' }
        ];
        if (kyc.errorMessage) {
            lines.push({ label: 'Error', value: kyc.errorMessage });
        }
        if (Array.isArray(kyc.denialReasons) && kyc.denialReasons.length) {
            lines.push({ label: 'Denial detail', value: kyc.denialReasons.join(' ') });
        }
        return lines;
    }

    handleEditSection(event) {
        const step = Number(event.currentTarget.dataset.step);
        if (!step || step < 1 || step > 10) {
            return;
        }
        this.dispatchEvent(
            new CustomEvent('daogotostep', {
                bubbles: true,
                composed: true,
                detail: { step }
            })
        );
    }

    handleBankerConfirmChange(event) {
        this.bankerAccurateConfirmed = event.target.checked;
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail: { bankerReviewAccurateConfirmed: this.bankerAccurateConfirmed }
            })
        );
    }
}
