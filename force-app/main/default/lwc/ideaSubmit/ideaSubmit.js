import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createIdea from '@salesforce/apex/IdeaService.createIdea';

/** Default visibility when the form no longer exposes a control (submitter-only + admins). */
const DEFAULT_VISIBILITY = 'Private';

export default class IdeaSubmit extends LightningElement {
    @track title = '';
    @track description = '';
    @track improvementType = '';
    @track submitting = false;
    @track ideaId;

    get improvementTypeOptions() {
        return [
            { label: 'Customer experience', value: 'Customer_Experience' },
            { label: 'Process improvement', value: 'Process_Improvement' },
            { label: 'Product idea', value: 'Product_Idea' }
        ];
    }

    handleTitleChange(event) {
        this.title = event.target.value;
    }

    handleDescriptionChange(event) {
        this.description = event.target.value;
    }

    handleImprovementTypeChange(event) {
        this.improvementType = event.detail.value || '';
    }

    handleCancel() {
        this.title = '';
        this.description = '';
        this.improvementType = '';
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
            visibility: DEFAULT_VISIBILITY,
            improvementType: this.improvementType || null,
            customerImpact: null,
            tags: null
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
                this.handleCancel();
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
        if (!this.improvementType) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing information',
                    message: 'Please select an improvement type.',
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
