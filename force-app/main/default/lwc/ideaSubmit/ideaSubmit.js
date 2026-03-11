import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createIdea from '@salesforce/apex/IdeaService.createIdea';

export default class IdeaSubmit extends LightningElement {
    @track title = '';
    @track description = '';
    @track improvementType = [];
    @track customerImpact = '';
    @track tagsArray = [];
    @track tagInput = '';
    @track visibility = 'Private';
    @track submitting = false;
    @track ideaId;

    get improvementTypeOptions() {
        return [
            { label: 'Process', value: 'Process' },
            { label: 'Policy', value: 'Policy' },
            { label: 'Digital', value: 'Digital' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get visibilityOptions() {
        return [
            { label: 'Private (only you and admins)', value: 'Private' },
            { label: 'Open (visible to everyone)', value: 'Open' }
        ];
    }

    get tagsWithKey() {
        return (this.tagsArray || []).map((label, i) => ({ id: `tag-${i}-${label}`, label, index: i }));
    }

    handleTitleChange(event) {
        this.title = event.target.value;
    }

    handleDescriptionChange(event) {
        this.description = event.target.value;
    }

    handleImprovementTypeChange(event) {
        this.improvementType = event.detail.value || [];
    }

    handleCustomerImpactChange(event) {
        this.customerImpact = event.target.value;
    }

    handleTagInputChange(event) {
        this.tagInput = event.target.value;
    }

    handleTagKeyDown(event) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            this.addTag();
        }
    }

    addTag() {
        const val = (this.tagInput || '').trim();
        if (!val) return;
        if (this.tagsArray.includes(val)) return;
        this.tagsArray = [...this.tagsArray, val];
        this.tagInput = '';
    }

    handleRemoveTag(event) {
        const idx = parseInt(event.currentTarget.dataset.index, 10);
        if (!isNaN(idx)) {
            this.tagsArray = this.tagsArray.filter((_, i) => i !== idx);
        }
    }

    handleVisibilityChange(event) {
        this.visibility = event.detail.value;
    }

    handleCancel() {
        this.title = '';
        this.description = '';
        this.improvementType = [];
        this.customerImpact = '';
        this.tagsArray = [];
        this.tagInput = '';
        this.visibility = 'Private';
        this.ideaId = undefined;
    }

    handleSubmit() {
        if (!this.validateClientSide()) {
            return;
        }
        this.submitting = true;
        createIdea({
            title: this.title,
            description: this.description,
            visibility: this.visibility,
            improvementType: (this.improvementType || []).join(';'),
            customerImpact: this.customerImpact,
            tags: (this.tagsArray || []).join(';')
        })
            .then((id) => {
                this.ideaId = id;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Idea submitted',
                        message: 'Your idea has been submitted for review.',
                        variant: 'success'
                    })
                );
            })
            .catch((error) => {
                const message = error?.body?.message || error.message || 'Error submitting idea.';
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message,
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.submitting = false;
            });
    }

    validateClientSide() {
        if (!this.title || !this.description) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing information',
                    message: 'Title and Description are required.',
                    variant: 'error'
                })
            );
            return false;
        }
        const wordCount = (this.description || '')
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0).length;
        if (wordCount < 5) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Description too short',
                    message: 'Description must contain at least five words.',
                    variant: 'error'
                })
            );
            return false;
        }
        return true;
    }
}
