import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import listIdeasPaginated from '@salesforce/apex/IdeaService.listIdeasPaginated';
import getTopIdeas from '@salesforce/apex/IdeaService.getTopIdeas';
import getIdeasUserHasVotedFor from '@salesforce/apex/IdeaService.getIdeasUserHasVotedFor';
import voteIdea from '@salesforce/apex/IdeaService.voteIdea';
import unvoteIdea from '@salesforce/apex/IdeaService.unvoteIdea';

function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function firstTwoLines(str, maxChars = 120) {
    if (!str || typeof str !== 'string') return '';
    const lines = str.trim().split(/\r?\n/).filter(Boolean);
    const two = lines.slice(0, 2).join(' ').trim();
    return two.length <= maxChars ? two : two.substring(0, maxChars) + '...';
}

export default class IdeaList extends NavigationMixin(LightningElement) {
    @track scope = 'My';
    @track ideas = [];
    @track topIdeas = [];
    @track pageNumber = 1;
    @track pageSize = 10;
    @track totalCount = 0;
    @track votedIdeaIds = [];
    @track error;
    _wiredIdeasResult;

    get scopeOptions() {
        return [
            { label: 'My Ideas', value: 'My' },
            { label: 'All Visible Ideas', value: 'Visible' },
            { label: 'Admin View', value: 'Admin' }
        ];
    }

    get hasTopIdeas() {
        return this.topIdeas && this.topIdeas.length > 0;
    }

    get hasIdeas() {
        return this.ideas && this.ideas.length > 0;
    }

    get errorMessage() {
        if (!this.error) return '';
        const body = this.error.body;
        if (body && body.message) return body.message;
        if (typeof this.error.message === 'string') return this.error.message;
        return 'An error occurred loading ideas.';
    }

    get totalPages() {
        if (!this.pageSize || this.pageSize < 1) return 0;
        return Math.ceil((this.totalCount || 0) / this.pageSize);
    }

    get hasPrevPage() {
        return this.pageNumber > 1;
    }

    get hasNextPage() {
        return this.pageNumber < this.totalPages;
    }

    get prevDisabled() {
        return !this.hasPrevPage;
    }

    get nextDisabled() {
        return !this.hasNextPage;
    }

    get pageInfo() {
        const start = this.totalCount === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
        const end = Math.min(this.pageNumber * this.pageSize, this.totalCount);
        return `${start}-${end} of ${this.totalCount}`;
    }

    get pageSizeOptions() {
        return [
            { label: '10 per page', value: '10' },
            { label: '25 per page', value: '25' },
            { label: '50 per page', value: '50' }
        ];
    }

    get pageSizeStr() {
        return String(this.pageSize);
    }

    @wire(listIdeasPaginated, { scope: '$scope', pageNumber: '$pageNumber', pageSize: '$pageSize' })
    wiredIdeas(result) {
        this._wiredIdeasResult = result;
        const { data, error } = result;
        if (data) {
            this.error = undefined;
            this.ideas = (data.ideas || []).map((row) => this.enrichIdea(row));
            this.totalCount = data.totalCount || 0;
            this.refreshVotedState();
        } else if (error) {
            this.error = error;
            this.ideas = [];
        }
    }

    enrichIdea(row) {
        const voteCount = row.Vote_Count__c == null ? 0 : row.Vote_Count__c;
        return {
            ...row,
            ownerName: row.Owner__r ? row.Owner__r.Name : '—',
            Vote_Count__c: voteCount,
            formattedDate: formatDate(row.LastModifiedDate),
            descriptionSnippet: firstTwoLines(row.Description__c),
            hasVoted: this.votedIdeaIds && this.votedIdeaIds.includes(row.Id)
        };
    }

    connectedCallback() {
        this.loadTopIdeas();
    }

    refreshVotedState() {
        if (!this.ideas || this.ideas.length === 0) {
            this.votedIdeaIds = [];
            return;
        }
        const ids = this.ideas.map((i) => i.Id);
        getIdeasUserHasVotedFor({ ideaIds: ids })
            .then((voted) => {
                this.votedIdeaIds = voted || [];
                this.ideas = this.ideas.map((i) => ({ ...i, hasVoted: this.votedIdeaIds.includes(i.Id) }));
            })
            .catch(() => {
                this.votedIdeaIds = [];
            });
    }

    loadTopIdeas() {
        getTopIdeas({ limitCount: 5 })
            .then((data) => {
                this.topIdeas = (data || []).map((row) => ({
                    ...row,
                    descriptionSnippet: this.truncate(row.Description__c, 100),
                    ownerName: row.Owner__r ? row.Owner__r.Name : '—'
                }));
            })
            .catch(() => {
                this.topIdeas = [];
            });
    }

    truncate(str, len) {
        if (!str || typeof str !== 'string') return '';
        return str.length <= len ? str : str.substring(0, len) + '...';
    }

    handleScopeChange(event) {
        this.scope = event.detail.value;
        this.pageNumber = 1;
    }

    handlePageSizeChange(event) {
        this.pageSize = parseInt(event.detail.value, 10);
        this.pageNumber = 1;
    }

    handlePrevPage() {
        if (this.hasPrevPage) this.pageNumber--;
    }

    handleNextPage() {
        if (this.hasNextPage) this.pageNumber++;
    }

    handleIdeaClick(event) {
        const id = event.currentTarget.dataset.id;
        if (id) this.navigateToRecord(id);
    }

    handleVoteClick(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        if (id) this.doVote(id);
    }

    handleUnvoteClick(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        if (id) this.doUnvote(id);
    }

    handleOpenClick(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        if (id) this.navigateToRecord(id);
    }

    doVote(ideaId) {
        voteIdea({ ideaId })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Voted', message: 'Your vote was recorded.', variant: 'success' }));
                this.votedIdeaIds = [...this.votedIdeaIds, ideaId];
                this.refreshIdeasAndTop();
            })
            .catch((e) => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: e.body?.message || e.message || 'Could not vote.', variant: 'error' }));
            });
    }

    doUnvote(ideaId) {
        unvoteIdea({ ideaId })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Unvoted', message: 'Your vote was removed.', variant: 'success' }));
                this.votedIdeaIds = this.votedIdeaIds.filter((id) => id !== ideaId);
                this.refreshIdeasAndTop();
            })
            .catch((e) => {
                this.dispatchEvent(new ShowToastEvent({ title: 'Error', message: e.body?.message || e.message || 'Could not unvote.', variant: 'error' }));
            });
    }

    refreshIdeasAndTop() {
        this.loadTopIdeas();
        if (this._wiredIdeasResult) {
            return refreshApex(this._wiredIdeasResult);
        }
        return Promise.resolve();
    }

    handleCardClick(event) {
        const id = event.currentTarget.dataset.id;
        if (id) this.navigateToRecord(id);
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
