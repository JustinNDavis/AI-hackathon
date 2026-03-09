import { LightningElement, wire, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import chartJsResource from '@salesforce/resourceUrl/ChartJS';
import getIndustryCounts from '@salesforce/apex/AccountChartController.getIndustryCounts';
import { reduceErrors } from './utils';

export default class AccountIndustryChart extends LightningElement {
    @track chartData = [];
    @track error;
    @track chartLoaded = false;
    chart = null;

    @wire(getIndustryCounts)
    wiredCounts({ data, error }) {
        if (data) {
            this.chartData = data;
            this.error = undefined;
        }
        if (error) {
            this.error = reduceErrors(error).join(', ');
            this.chartData = [];
        }
    }

    connectedCallback() {
        loadScript(this, chartJsResource)
            .then(() => {
                this.chartLoaded = true;
            })
            .catch((err) => {
                this.error = err?.message || 'Failed to load Chart.js';
            });
    }

    disconnectedCallback() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    renderedCallback() {
        if (!this.chartLoaded || !this.chartData?.length || this.chart || !window.Chart) return;
        const canvas = this.template.querySelector('canvas.industry-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        this.chart = new window.Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.chartData.map((d) => d.industry),
                datasets: [{
                    label: 'Accounts',
                    data: this.chartData.map((d) => d.count),
                    backgroundColor: 'rgba(0, 112, 210, 0.8)',
                    borderColor: 'rgb(0, 112, 210)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }

    get hasData() {
        return this.chartData && this.chartData.length > 0;
    }

    get hasError() {
        return !!this.error;
    }
}