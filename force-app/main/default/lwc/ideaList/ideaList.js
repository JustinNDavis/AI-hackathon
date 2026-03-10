import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import listIdeas from '@salesforce/apex/IdeaService.listIdeas';

const COLUMNS = [
    { label: 'Idea #', fieldName: 'Name', type: 'text' },
    { label: 'Title', fieldName: 'Title__c', type: 'text' },
    { label: 'Status', fieldName: 'Status__c', type: 'text' },
    { label: 'Owner', fieldName: 'ownerName', type: 'text' },
    { label: 'Tags', fieldName: 'Tags__c', type: 'text' },
    {
        label: 'Last Modified',
        fieldName: 'LastModifiedDate',
        type: 'date',
        typeAttributes: {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }
    },
    {
        type: 'action',
        typeAttributes: { rowActions: [{ label: 'Open', name: 'open' }] }
    }
];

export default class IdeaList extends NavigationMixin(LightningElement) {
    @track scope = 'My';
    @track ideas = [];
    @track error;

    columns = COLUMNS;

    get scopeOptions() {
        return [
            { label: 'My Ideas', value: 'My' },
            { label: 'All Visible Ideas', value: 'Visible' },
            { label: 'Admin View', value: 'Admin' }
        ];
    }

    @wire(listIdeas, { scope: '$scope' })
    wiredIdeas({ data, error }) {
        if (data) {
            this.error = undefined;
            this.ideas = data.map((row) => ({
                ...row,
                ownerName: row.Owner__r ? row.Owner__r.Name : null
            }));
        } else if (error) {
            this.error = error;
            this.ideas = [];
        }
    }

    handleScopeChange(event) {
        this.scope = event.detail.value;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'open') {
            this.navigateToRecord(row.Id);
        }
    }

    navigateToRecord(recordId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId,
                objectApiName: 'Idea__c',
                actionName: 'view'
            }
        });
    }
}

