import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

// Disable datalabels globally — enabled per-chart only on donuts
ChartJS.defaults.set('plugins.datalabels', { display: false });

export const grd = {
  grid: { color: 'rgba(124,58,237,0.08)' },
  ticks: { color: '#6b7280', font: { family: 'Montserrat' as const, size: 10 } },
};

export const donutLabels = {
  display: (ctx: import('chartjs-plugin-datalabels').Context) => {
    const data = ctx.dataset.data as number[];
    const sum = data.reduce((a: number, b: number) => a + (b || 0), 0);
    return sum > 0 && (data[ctx.dataIndex] || 0) / sum >= 0.04;
  },
  formatter: (value: number, ctx: import('chartjs-plugin-datalabels').Context) => {
    const data = ctx.dataset.data as number[];
    const sum = data.reduce((a: number, b: number) => a + (b || 0), 0);
    return sum > 0 ? ((value / sum) * 100).toFixed(1) + '%' : '';
  },
  color: '#fff',
  font: { family: 'Montserrat' as const, weight: 'bold' as const, size: 11 },
  textShadowBlur: 3,
  textShadowColor: 'rgba(0,0,0,0.4)',
};

export const tip = {
  backgroundColor: '#ffffff',
  borderColor: 'rgba(124,58,237,0.2)',
  borderWidth: 1,
  titleColor: '#1a1f2e',
  bodyColor: '#374151',
  padding: 10,
};
