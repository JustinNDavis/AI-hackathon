import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createIdea from '@salesforce/apex/IdeaService.createIdea';

export default class IdeaSubmit extends LightningElement {
    @track title = '';
    @track description = '';
    @track improvementType = [];
    @track customerImpact = '';
    @track tags = '';
    @track visibility = 'Private';
    @track isConfidential = false;
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
            { label: 'Private', value: 'Private' },
            { label: 'Creator Selected', value: 'Creator Selected' },
            { label: 'Open', value: 'Open' }
        ];
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

    handleTagsChange(event) {
        this.tags = event.target.value;
    }

    handleVisibilityChange(event) {
        this.visibility = event.detail.value;
    }

    handleConfidentialChange(event) {
        this.isConfidential = event.target.checked;
    }

    handleCancel() {
        this.title = '';
        this.description = '';
        this.improvementType = [];
        this.customerImpact = '';
        this.tags = '';
        this.visibility = 'Private';
        this.isConfidential = false;
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
            isConfidential: this.isConfidential,
            visibility: this.visibility,
            improvementType: (this.improvementType || []).join(';'),
            customerImpact: this.customerImpact,
            tags: this.tags
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

    handleUploadFinished() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Files uploaded',
                message: 'Your file attachments were uploaded.',
                variant: 'success'
            })
        );
    }
}

