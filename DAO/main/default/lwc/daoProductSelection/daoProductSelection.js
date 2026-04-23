import { LightningElement, api, track } from 'lwc';

const MOCK_PRODUCTS = [
    {
        id: 'Free_Checking',
        productName: 'Free Checking',
        minBalance: '$0',
        monthlyFee: '$0',
        apy: '0.01%',
        features: ['No monthly maintenance fee', 'Visa debit card', 'Online & mobile banking', 'Bill pay']
    },
    {
        id: 'Interest_Checking',
        productName: 'Interest Checking',
        minBalance: '$500',
        monthlyFee: '$0 with e-statements',
        apy: '0.05%',
        features: ['Interest on daily balance', 'Free checks (first order)', 'Nationwide ATM rebates', 'Overdraft protection available']
    },
    {
        id: 'Regular_Savings',
        productName: 'Regular Savings',
        minBalance: '$25',
        monthlyFee: '$0',
        apy: '1.20%',
        features: ['Tiered interest', 'Automatic transfers', 'Mobile deposit', 'Goal-based savings tools']
    },
    {
        id: 'Money_Market',
        productName: 'Money Market',
        minBalance: '$2,500',
        monthlyFee: '$0 when minimum met',
        apy: '3.45%',
        features: ['Check-writing privileges', 'Higher yields on larger balances', 'FDIC insured', 'Rate bump with relationship']
    },
    {
        id: 'CD_12_Month',
        productName: '12-Month CD',
        minBalance: '$1,000',
        monthlyFee: '$0',
        apy: '4.00%',
        features: ['Fixed rate for full term', 'Early withdrawal penalty may apply', 'Renewal options', 'IRA version available']
    }
];

export default class DaoProductSelection extends LightningElement {
    @api applicationData;

    catalog = MOCK_PRODUCTS;

    get productSelectionLede() {
        if (this.applicationData?.applicantEntityType === 'Business') {
            return 'Choose one or more deposit products for this business. With eligible products, the flow runs BizChex (business ChexSystems) screening later.';
        }
        return 'Choose one or more deposit products. Selected items are used later in the flow (for example, ChexSystems when at least one eligible deposit product is selected).';
    }

    /** @type {string[]} */
    @track selectedIds = [];

    connectedCallback() {
        this.hydrateSelection();
        this.emitSelection();
    }

    hydrateSelection() {
        const saved = this.applicationData?.selectedProducts;
        if (!Array.isArray(saved) || saved.length === 0) {
            return;
        }
        const first = saved[0];
        if (typeof first === 'string') {
            this.selectedIds = [...saved];
            return;
        }
        if (typeof first === 'object' && first.id) {
            this.selectedIds = saved.map((p) => p.id).filter(Boolean);
        }
    }

    get productCards() {
        const idSet = new Set(this.selectedIds);
        return this.catalog.map((p) => ({
            key: p.id,
            ...p,
            featuresUi: p.features.map((text, i) => ({ key: `${p.id}_f${i}`, text })),
            selected: idSet.has(p.id),
            cardClass: idSet.has(p.id) ? 'product-card product-card_selected' : 'product-card'
        }));
    }

    handleCardKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleCardClick(event);
        }
    }

    handleCardClick(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) {
            return;
        }
        if (this.selectedIds.includes(id)) {
            this.selectedIds = this.selectedIds.filter((x) => x !== id);
        } else {
            this.selectedIds = [...this.selectedIds, id];
        }
        this.emitSelection();
    }

    emitSelection() {
        const selected = this.catalog.filter((p) => this.selectedIds.includes(p.id));
        this.dispatchEvent(
            new CustomEvent('daoproductselectioncomplete', {
                bubbles: true,
                composed: true,
                detail: { selectedProducts: selected }
            })
        );
    }
}
