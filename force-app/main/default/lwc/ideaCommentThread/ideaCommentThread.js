import { LightningElement, api } from 'lwc';
import addComment from '@salesforce/apex/IdeaService.addComment';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class IdeaCommentThread extends LightningElement {
    @api comment;
    @api ideaId;
    @api canComment;

    replyText = '';
    showReplyForm = false;
    replying = false;

    handleReplyClick() {
        this.showReplyForm = true;
    }

    handleReplyCancel() {
        this.showReplyForm = false;
        this.replyText = '';
    }

    handleReplyChange(event) {
        this.replyText = event.detail.value;
    }

    handleReplySubmit() {
        if (!this.replyText || !this.replyText.trim()) return;
        this.replying = true;
        addComment({
            ideaId: this.ideaId,
            body: this.replyText.trim(),
            parentCommentId: this.comment.Id
        })
            .then(() => {
                this.replyText = '';
                this.showReplyForm = false;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Reply added',
                        message: 'Your reply has been posted.',
                        variant: 'success'
                    })
                );
                this.dispatchRefresh();
            })
            .catch((error) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error adding reply',
                        message: error.body?.message || error.message || 'Error adding reply.',
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.replying = false;
            });
    }

    handleChildRefresh() {
        this.dispatchRefresh();
    }

    dispatchRefresh() {
        this.dispatchEvent(new CustomEvent('refresh', { bubbles: true, composed: true }));
    }

    get hasReplies() {
        return this.comment?.children && this.comment.children.length > 0;
    }

    get showReply() {
        return this.canComment !== false;
    }
}
