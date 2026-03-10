import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import STATUS_FIELD from '@salesforce/schema/Idea__c.Status__c';
import TITLE_FIELD from '@salesforce/schema/Idea__c.Title__c';
import VISIBILITY_FIELD from '@salesforce/schema/Idea__c.Visibility__c';
import CONFIDENTIAL_FIELD from '@salesforce/schema/Idea__c.Is_Confidential__c';
import IMPROVEMENT_FIELD from '@salesforce/schema/Idea__c.Improvement_Type__c';
import IMPACT_FIELD from '@salesforce/schema/Idea__c.Customer_Impact__c';
import TAGS_FIELD from '@salesforce/schema/Idea__c.Tags__c';
import DESCRIPTION_FIELD from '@salesforce/schema/Idea__c.Description__c';
import OWNER_FIELD from '@salesforce/schema/Idea__c.Owner__c';
import OWNER_NAME_FIELD from '@salesforce/schema/Idea__c.Owner__r.Name';
import ADMIN_FIELD from '@salesforce/schema/Idea__c.Administrator__c';
import ADMIN_NAME_FIELD from '@salesforce/schema/Idea__c.Administrator__r.Name';
import RESOLUTION_NOTES_FIELD from '@salesforce/schema/Idea__c.Resolution_Notes__c';
import currentUserIsAdmin from '@salesforce/apex/IdeaService.currentUserIsAdmin';
import listComments from '@salesforce/apex/IdeaService.listComments';
import addComment from '@salesforce/apex/IdeaService.addComment';
import updateStatus from '@salesforce/apex/IdeaService.updateStatus';

const FIELDS = [
    STATUS_FIELD,
    TITLE_FIELD,
    VISIBILITY_FIELD,
    CONFIDENTIAL_FIELD,
    IMPROVEMENT_FIELD,
    IMPACT_FIELD,
    TAGS_FIELD,
    DESCRIPTION_FIELD,
    OWNER_FIELD,
    OWNER_NAME_FIELD,
    ADMIN_FIELD,
    ADMIN_NAME_FIELD,
    RESOLUTION_NOTES_FIELD
];

export default class IdeaRecord extends LightningElement {
    @api recordId;
    @track idea;
    @track comments = [];
    @track newComment = '';
    @track addingComment = false;
    @track isAdmin = false;
    @track showCloseModal = false;
    @track closeStatus;
    @track closeNotes = '';
    @track savingClose = false;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredRecord({ data, error }) {
        if (data) {
            this.idea = {
                Id: this.recordId,
                Status__c: getFieldValue(data, STATUS_FIELD),
                Title__c: getFieldValue(data, TITLE_FIELD),
                Visibility__c: getFieldValue(data, VISIBILITY_FIELD),
                Is_Confidential__c: getFieldValue(data, CONFIDENTIAL_FIELD),
                Improvement_Type__c: getFieldValue(data, IMPROVEMENT_FIELD),
                Customer_Impact__c: getFieldValue(data, IMPACT_FIELD),
                Tags__c: getFieldValue(data, TAGS_FIELD),
                Description__c: getFieldValue(data, DESCRIPTION_FIELD),
                Owner__c: getFieldValue(data, OWNER_FIELD),
                Owner__r: { Name: getFieldValue(data, OWNER_NAME_FIELD) },
                Administrator__c: getFieldValue(data, ADMIN_FIELD),
                Administrator__r: { Name: getFieldValue(data, ADMIN_NAME_FIELD) },
                Resolution_Notes__c: getFieldValue(data, RESOLUTION_NOTES_FIELD)
            };
        } else if (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading idea',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                })
            );
        }
    }

    connectedCallback() {
        this.refreshAdminFlag();
        this.refreshComments();
    }

    get confidentialLabel() {
        return this.idea && this.idea.Is_Confidential__c ? 'Yes' : 'No';
    }

    get ownerName() {
        return this.idea && this.idea.Owner__r ? this.idea.Owner__r.Name : '';
    }

    get adminName() {
        return this.idea && this.idea.Administrator__r ? this.idea.Administrator__r.Name : '';
    }

    get canComment() {
        return true;
    }

    get closeOptions() {
        return [
            { label: 'Under Review', value: 'Under Review' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Implemented', value: 'Implemented' },
            { label: 'Not Pursued', value: 'Not Pursued' },
            { label: 'Acknowledged', value: 'Acknowledged' }
        ];
    }

    refreshAdminFlag() {
        currentUserIsAdmin()
            .then((flag) => {
                this.isAdmin = flag;
            })
            .catch(() => {
                this.isAdmin = false;
            });
    }

    refreshComments() {
        if (!this.recordId) {
            return;
        }
        listComments({ ideaId: this.recordId })
            .then((rows) => {
                this.comments = (rows || []).map((c) => ({
                    ...c,
                    formattedTime: this.formatRelativeTime(c.CreatedDate),
                    initials: this.getInitials(c.Created_By__r?.Name || '')
                }));
            })
            .catch(() => {
                this.comments = [];
            });
    }

    formatRelativeTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    getInitials(name) {
        if (!name || typeof name !== 'string') return '?';
        return name
            .trim()
            .split(/\s+/)
            .map((p) => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    handleCommentChange(event) {
        this.newComment = event.target.value;
    }

    handleAddComment() {
        if (!this.newComment || !this.newComment.trim()) {
            return;
        }
        this.addingComment = true;
        addComment({ ideaId: this.recordId, body: this.newComment })
            .then(() => {
                this.newComment = '';
                this.refreshComments();
            })
            .catch((error) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error adding comment',
                        message: error.body ? error.body.message : error.message,
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.addingComment = false;
            });
    }

    handleFilesUploaded() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Files uploaded',
                message: 'Attachments uploaded to this idea.',
                variant: 'success'
            })
        );
    }

    openCloseModal() {
        this.showCloseModal = true;
        this.closeStatus = this.idea ? this.idea.Status__c : null;
        this.closeNotes = this.idea ? this.idea.Resolution_Notes__c : '';
    }

    closeCloseModal() {
        this.showCloseModal = false;
        this.savingClose = false;
    }

    handleCloseStatusChange(event) {
        this.closeStatus = event.detail.value;
    }

    handleCloseNotesChange(event) {
        this.closeNotes = event.target.value;
    }

    handleCloseSave() {
        if (!this.closeStatus) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing outcome',
                    message: 'Select an outcome before saving.',
                    variant: 'error'
                })
            );
            return;
        }
        this.savingClose = true;
        updateStatus({ ideaId: this.recordId, newStatus: this.closeStatus, notes: this.closeNotes })
            .then((updated) => {
                this.idea.Status__c = updated.Status__c;
                this.idea.Resolution_Notes__c = updated.Resolution_Notes__c;
                this.closeCloseModal();
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Status updated',
                        message: 'Idea status and resolution were updated.',
                        variant: 'success'
                    })
                );
            })
            .catch((error) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error updating status',
                        message: error.body ? error.body.message : error.message,
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.savingClose = false;
            });
    }
}

