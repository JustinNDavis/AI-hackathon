import { LightningElement, track } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import chartJs from '@salesforce/resourceUrl/ChartJS';
import getIdeasByStatusForChart from '@salesforce/apex/IdeaService.getIdeasByStatusForChart';

// Update ChartJS if your static resource has a different name
/* DAO / Be Vocal palette — sea, teal, greens, blues */
const CHART_COLORS = [
    'rgba(61, 159, 217, 0.88)',
    'rgba(27, 184, 138, 0.88)',
    'rgba(45, 184, 109, 0.88)',
    'rgba(43, 124, 198, 0.88)',
    'rgba(26, 82, 150, 0.88)',
    'rgba(61, 214, 140, 0.88)',
];

const CHART_BORDER_COLORS = [
    'rgb(61, 159, 217)',
    'rgb(27, 184, 138)',
    'rgb(45, 184, 109)',
    'rgb(43, 124, 198)',
    'rgb(26, 82, 150)',
    'rgb(61, 214, 140)',
];

export default class IdeaChart extends LightningElement {
    @track error;
    @track isEmpty = false;
    _chart = null;
    _chartJsLoaded = false;

    get errorMessage() {
        return this.error?.body?.message || this.error?.message || 'Failed to load chart.';
    }

    connectedCallback() {
        this.loadChartAndRender();
    }

    disconnectedCallback() {
        this.destroyChart();
    }

    async loadChartAndRender() {
        try {
            if (!this._chartJsLoaded) {
                await loadScript(this, chartJs);
                this._chartJsLoaded = true;
            }
            const data = await getIdeasByStatusForChart();
            this.error = undefined;
            this.renderChart(data);
        } catch (err) {
            this.error = err;
            this.isEmpty = false;
        }
    }

    renderChart(data) {
        if (!data || data.length === 0) {
            this.isEmpty = true;
            this.destroyChart();
            return;
        }
        this.isEmpty = false;

        const labels = data.map((d) => d.label);
        const values = data.map((d) => d.value);
        const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
        const borderColors = labels.map((_, i) => CHART_BORDER_COLORS[i % CHART_BORDER_COLORS.length]);

        this.destroyChart();

        setTimeout(() => {
            const container = this.template.querySelector('.chart-container');
            if (!container) return;

            const canvas = document.createElement('canvas');
            canvas.setAttribute('role', 'img');
            canvas.setAttribute('aria-label', 'Ideas by stage donut chart');
            canvas.width = container.clientWidth || 300;
            canvas.height = 220;
            container.innerHTML = '';
            container.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            this._chart = new window.Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [
                        {
                            data: values,
                            backgroundColor: colors,
                            borderColor: borderColors,
                            borderWidth: 2,
                            hoverOffset: 8,
                        },
                    ],
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: true,
                    aspectRatio: 1.5,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 16,
                                font: { size: 12 },
                                usePointStyle: true,
                            },
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            callbacks: {
                                label: (ctx) => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                                    return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                                },
                            },
                        },
                    },
                    cutout: '60%',
                },
            });
        }, 0);
    }

    destroyChart() {
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    }
}
