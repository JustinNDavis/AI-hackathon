import { LightningElement, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getLoans from '@salesforce/apex/LoanReportController.getLoans';
import LOAN_CHART_JS from '@salesforce/resourceUrl/loanChartJs';

const STATUS_ORDER = ['Pending', 'Active', 'Paid Off', 'Defaulted'];
const STATUS_COLORS = {
    Pending: 'rgba(142, 154, 171, 0.85)',
    Active: 'rgba(27, 150, 255, 0.85)',
    'Paid Off': 'rgba(46, 132, 74, 0.85)',
    Defaulted: 'rgba(194, 57, 52, 0.85)'
};

function reduceErrors(error) {
    if (!error) return 'Unknown error';
    if (Array.isArray(error.body)) return error.body.map((e) => e.message).join(', ');
    return error.body?.message || error.message || String(error);
}

function getChartConstructor() {
    try {
        if (typeof globalThis !== 'undefined' && globalThis.Chart) {
            return globalThis.Chart;
        }
    } catch (e) {
        /* ignore */
    }
    try {
        if (typeof window !== 'undefined' && window.Chart) {
            return window.Chart;
        }
    } catch (e) {
        /* ignore */
    }
    try {
        if (typeof self !== 'undefined' && self.Chart) {
            return self.Chart;
        }
    } catch (e) {
        /* ignore */
    }
    return undefined;
}

export default class LoanChartReport extends LightningElement {
    loanRows = [];
    searchText = '';
    statusFilter = '';
    termFilter = '';

    chart;
    chartJsLoaded = false;
    error;
    wiredLoaded = false;
    _rafOuter;
    _rafInner;
    _canvasWaitAttempts = 0;

    @wire(getLoans)
    wiredLoans({ data, error }) {
        this.wiredLoaded = true;
        if (data) {
            this.loanRows = data;
            this.error = undefined;
            this.scheduleChartSync();
        } else if (error) {
            this.error = error;
            this.loanRows = [];
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Could not load loans',
                    message: reduceErrors(error),
                    variant: 'error'
                })
            );
            this.destroyChart();
        }
    }

    connectedCallback() {
        loadScript(this, LOAN_CHART_JS)
            .then(() => {
                this.chartJsLoaded = true;
                this.scheduleChartSync();
            })
            .catch((e) => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Chart.js failed to load',
                        message: reduceErrors(e),
                        variant: 'error'
                    })
                );
            });
    }

    disconnectedCallback() {
        if (this._rafOuter != null) {
            cancelAnimationFrame(this._rafOuter);
            this._rafOuter = null;
        }
        if (this._rafInner != null) {
            cancelAnimationFrame(this._rafInner);
            this._rafInner = null;
        }
        this.destroyChart();
    }

    /**
     * Coalesce updates and wait until after paint so the canvas exists (lwc:if).
     */
    scheduleChartSync() {
        if (this._rafOuter != null) {
            cancelAnimationFrame(this._rafOuter);
        }
        if (this._rafInner != null) {
            cancelAnimationFrame(this._rafInner);
        }
        this._rafOuter = requestAnimationFrame(() => {
            this._rafOuter = null;
            this._rafInner = requestAnimationFrame(() => {
                this._rafInner = null;
                this.syncChart();
            });
        });
    }

    get statusOptions() {
        return [
            { label: 'All statuses', value: '' },
            { label: 'Pending', value: 'Pending' },
            { label: 'Active', value: 'Active' },
            { label: 'Paid Off', value: 'Paid Off' },
            { label: 'Defaulted', value: 'Defaulted' }
        ];
    }

    get termOptions() {
        return [
            { label: 'Any term', value: '' },
            { label: 'Short (≤ 36 mo)', value: 'short' },
            { label: 'Medium (37–60 mo)', value: 'mid' },
            { label: 'Long (61+ mo)', value: 'long' }
        ];
    }

    get filteredRows() {
        const q = (this.searchText || '').trim().toLowerCase();
        return this.loanRows.filter((row) => {
            if (this.statusFilter && row.status !== this.statusFilter) {
                return false;
            }
            if (!this.matchesTermBucket(row)) {
                return false;
            }
            if (!q) {
                return true;
            }
            const name = (row.name || '').toLowerCase();
            const acc = (row.accountName || '').toLowerCase();
            return name.includes(q) || acc.includes(q);
        });
    }

    matchesTermBucket(row) {
        const t = this.termFilter;
        if (!t) {
            return true;
        }
        const m = row.termMonths;
        if (m == null || m === '') {
            return false;
        }
        const n = Number(m);
        if (t === 'short') {
            return n <= 36;
        }
        if (t === 'mid') {
            return n >= 37 && n <= 60;
        }
        if (t === 'long') {
            return n >= 61;
        }
        return true;
    }

    get filteredCount() {
        return this.filteredRows.length;
    }

    get filteredPrincipalTotal() {
        return this.filteredRows.reduce((sum, r) => {
            const p = r.principalAmount != null ? Number(r.principalAmount) : 0;
            return sum + p;
        }, 0);
    }

    get formattedFilteredPrincipal() {
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                this.filteredPrincipalTotal
            );
        } catch (e) {
            return '$' + this.filteredPrincipalTotal.toFixed(0);
        }
    }

    get hasData() {
        return this.loanRows && this.loanRows.length > 0;
    }

    get isLoading() {
        return !this.wiredLoaded && !this.error;
    }

    get errorMessage() {
        return this.error ? reduceErrors(this.error) : '';
    }

    get showNoLoansInOrg() {
        return this.wiredLoaded && !this.error && this.loanRows.length === 0;
    }

    get showEmptyState() {
        return this.wiredLoaded && !this.error && this.loanRows.length > 0 && this.filteredRows.length === 0;
    }

    get showChart() {
        return this.wiredLoaded && !this.error && this.filteredRows.length > 0 && this.chartJsLoaded;
    }

    handleSearchChange(event) {
        this.searchText = event.target.value;
        this.scheduleChartSync();
    }

    handleStatusChange(event) {
        this.statusFilter = event.detail.value || '';
        this.scheduleChartSync();
    }

    handleTermChange(event) {
        this.termFilter = event.detail.value || '';
        this.scheduleChartSync();
    }

    handleClearFilters() {
        this.searchText = '';
        this.statusFilter = '';
        this.termFilter = '';
        this.scheduleChartSync();
    }

    aggregateByStatus(rows) {
        const map = {};
        STATUS_ORDER.forEach((s) => {
            map[s] = 0;
        });
        rows.forEach((r) => {
            const st = r.status && STATUS_ORDER.includes(r.status) ? r.status : 'Pending';
            const p = r.principalAmount != null ? Number(r.principalAmount) : 0;
            map[st] += p;
        });
        return map;
    }

    /**
     * Remove Chart.js instance held by this component and any orphan registered on the canvas.
     */
    releaseCanvas(canvas) {
        const ChartCtor = getChartConstructor();
        if (this.chart) {
            try {
                this.chart.destroy();
            } catch (e) {
                /* ignore */
            }
            this.chart = undefined;
        }
        if (canvas && ChartCtor && typeof ChartCtor.getChart === 'function') {
            const registered = ChartCtor.getChart(canvas);
            if (registered) {
                try {
                    registered.destroy();
                } catch (e) {
                    /* ignore */
                }
            }
        }
    }

    destroyChart() {
        const canvas = this.template.querySelector('canvas.loan-chart-canvas');
        this.releaseCanvas(canvas || undefined);
    }

    /**
     * Lightning Locker / LWS may not expose a real ResizeObserver; Chart.js then throws.
     * Use fixed canvas dimensions from the chart container instead of responsive: true.
     */
    sizeCanvasForChart(canvas) {
        const wrap = canvas.closest('.chart-wrap');
        if (!wrap) {
            return;
        }
        const pad = 12;
        const w = Math.max(280, Math.floor(wrap.clientWidth || wrap.getBoundingClientRect().width) - pad * 2);
        const h = Math.max(240, Math.floor(wrap.clientHeight || wrap.getBoundingClientRect().height) - pad * 2);
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
    }

    buildChartConfig(dataValues) {
        return {
            type: 'bar',
            data: {
                labels: STATUS_ORDER,
                datasets: [
                    {
                        label: 'Total principal',
                        data: dataValues,
                        backgroundColor: STATUS_ORDER.map((s) => STATUS_COLORS[s] || '#ccc'),
                        borderWidth: 0,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: false,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Principal by loan status',
                        font: { size: 15, weight: '600' },
                        color: '#16325c',
                        padding: { bottom: 8 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const v = ctx.parsed.x ?? ctx.parsed.y;
                                const n = typeof v === 'number' ? v : 0;
                                try {
                                    return new Intl.NumberFormat(undefined, {
                                        style: 'currency',
                                        currency: 'USD'
                                    }).format(n);
                                } catch (e) {
                                    return '$' + n.toFixed(2);
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: false,
                        ticks: {
                            callback: (val) => {
                                try {
                                    return new Intl.NumberFormat(undefined, {
                                        style: 'currency',
                                        currency: 'USD',
                                        maximumFractionDigits: 0,
                                        notation: 'compact'
                                    }).format(val);
                                } catch (e) {
                                    return val;
                                }
                            }
                        },
                        grid: { color: 'rgba(22, 50, 92, 0.06)' }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        };
    }

    syncChart() {
        if (!this.chartJsLoaded) {
            return;
        }
        const ChartCtor = getChartConstructor();
        if (!ChartCtor) {
            return;
        }

        const canvas = this.template.querySelector('canvas.loan-chart-canvas');
        if (!canvas) {
            if (this.filteredRows.length === 0) {
                this._canvasWaitAttempts = 0;
                this.releaseCanvas(undefined);
            } else if (this.showChart && this._canvasWaitAttempts < 8) {
                this._canvasWaitAttempts++;
                this.scheduleChartSync();
            }
            return;
        }
        this._canvasWaitAttempts = 0;
        if (this.filteredRows.length === 0) {
            this.releaseCanvas(canvas);
            return;
        }

        const agg = this.aggregateByStatus(this.filteredRows);
        const dataValues = STATUS_ORDER.map((s) => agg[s] || 0);

        if (this.chart && this.chart.canvas === canvas) {
            this.chart.data.datasets[0].data = dataValues;
            this.chart.update();
            return;
        }

        this.releaseCanvas(canvas);
        this.sizeCanvasForChart(canvas);
        const ctx = canvas.getContext('2d');
        try {
            this.chart = new ChartCtor(ctx, this.buildChartConfig(dataValues));
        } catch (e) {
            this.chart = undefined;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Chart error',
                    message: reduceErrors(e),
                    variant: 'error'
                })
            );
        }
    }
}
