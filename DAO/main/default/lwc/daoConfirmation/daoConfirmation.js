import { LightningElement, api } from 'lwc';

export default class DaoConfirmation extends LightningElement {
    @api applicationData;

    get confirmationLede() {
        return this.applicationData?.applicantEntityType === 'Business'
            ? 'Confirm that the authorized representative has reviewed the selected products and key disclosures before continuing to verification.'
            : 'Confirm that the customer has reviewed the selected products and key disclosures before continuing to identity verification.';
    }

    get confirmationCheckboxLabel() {
        return this.applicationData?.applicantEntityType === 'Business'
            ? 'I confirm an authorized representative has reviewed the application summary, business details, and product selection.'
            : 'I confirm the applicant has reviewed the application summary and product selection.';
    }

    get acknowledged() {
        return this.applicationData?.confirmationAcknowledged === true;
    }

    handleAckChange(event) {
        const checked = event.detail.checked;
        this.dispatchEvent(
            new CustomEvent('daowizarddatapatch', {
                bubbles: true,
                composed: true,
                detail: { confirmationAcknowledged: checked }
            })
        );
    }
}
