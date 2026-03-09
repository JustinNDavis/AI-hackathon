import { LightningElement, wire, track } from 'lwc';
import getAccounts from '@salesforce/apex/AccountListController.getAccounts';
import { reduceErrors } from './utils';

export default class AccountCards extends LightningElement {
    @track accounts = [];
    @track flippedIds = new Set();
    @track error;

    @wire(getAccounts)
    wiredAccounts({ data, error }) {
        if (data) {
            this.accounts = data;
            this.error = undefined;
        }
        if (error) {
            this.error = reduceErrors(error).join(', ');
            this.accounts = [];
        }
    }

    get hasAccounts() {
        return this.accounts && this.accounts.length > 0;
    }

    get hasError() {
        return !!this.error;
    }

    get accountsWithFlip() {
        const ids = this.flippedIds || new Set();
        return (this.accounts || []).map((acc) => ({
            ...acc,
            flipped: ids.has(acc.Id),
            formattedRevenue: this.formatCurrency(acc.AnnualRevenue),
            cardClass: ids.has(acc.Id) ? 'card-inner flipped' : 'card-inner'
        }));
    }

    handleCardClick(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        const next = new Set(this.flippedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        this.flippedIds = next;
    }

    formatCurrency(value) {
        if (value == null || value === '') return '—';
        const num = Number(value);
        if (isNaN(num)) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    }
}