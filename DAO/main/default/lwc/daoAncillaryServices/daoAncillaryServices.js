import { LightningElement, api } from 'lwc';

const DEFAULT_ANCILLARY = {
    orderChecks: false,
    debitCard: false,
    onlineBanking: false,
    mobileBanking: false,
    overdraftProtection: false,
    eStatements: false
};

const SERVICE_DEFINITIONS = [
    {
        key: 'orderChecks',
        label: 'Order Checks',
        description: 'Order an initial checkbook for your new account. Styles and quantities are confirmed at fulfillment.'
    },
    {
        key: 'debitCard',
        label: 'Debit Card',
        description: 'Issue a debit card linked to your account for purchases and ATM access.'
    },
    {
        key: 'onlineBanking',
        label: 'Online Banking Enrollment',
        description: 'Enroll in online banking to view balances, transfer funds, and pay bills from a browser.'
    },
    {
        key: 'mobileBanking',
        label: 'Mobile Banking',
        description: 'Enable the mobile app for account alerts, mobile deposit, and on-the-go transfers.'
    },
    {
        key: 'overdraftProtection',
        label: 'Overdraft Protection',
        description:
            'Link eligible funding sources so covered transactions may be paid when available balance is insufficient (fees and limits apply).',
        requiresChecking: true
    },
    {
        key: 'eStatements',
        label: 'eStatements',
        description: 'Receive statements electronically instead of paper mail. Faster delivery and secure archive access.'
    }
];

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

export default class DaoAncillaryServices extends LightningElement {
    @api applicationData;

    connectedCallback() {
        this.syncOverdraftIfIneligible();
    }

    syncOverdraftIfIneligible() {
        if (this.hasCheckingProduct) {
            return;
        }
        const cur = this.ancillaryState;
        if (cur.overdraftProtection) {
            this.patchWizard({
                ancillaryServices: { ...cur, overdraftProtection: false }
            });
        }
    }

    get hasCheckingProduct() {
        const products = this.applicationData?.selectedProducts;
        if (!Array.isArray(products) || !products.length) {
            return false;
        }
        return products.some((p) => categoryForProduct(p) === 'checking');
    }

    get ancillaryState() {
        return { ...DEFAULT_ANCILLARY, ...this.applicationData?.ancillaryServices };
    }

    get serviceRows() {
        const state = this.ancillaryState;
        return SERVICE_DEFINITIONS.filter((def) => !def.requiresChecking || this.hasCheckingProduct).map((def) => ({
            key: def.key,
            label: def.label,
            description: def.description,
            checked: !!state[def.key]
        }));
    }

    handleToggle(event) {
        const key = event.target.dataset.key;
        if (!key || !(key in DEFAULT_ANCILLARY)) {
            return;
        }
        const checked = event.target.checked;
        const next = { ...this.ancillaryState, [key]: checked };
        if (!this.hasCheckingProduct) {
            next.overdraftProtection = false;
        }
        this.patchWizard({ ancillaryServices: next });
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
}
