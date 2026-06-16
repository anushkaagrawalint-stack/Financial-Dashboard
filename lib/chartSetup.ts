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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export const grd = {
  grid: { color: 'rgba(124,58,237,0.08)' },
  ticks: { color: '#6b7280', font: { family: 'Montserrat' as const, size: 10 } },
};

export const tip = {
  backgroundColor: '#ffffff',
  borderColor: 'rgba(124,58,237,0.2)',
  borderWidth: 1,
  titleColor: '#1a1f2e',
  bodyColor: '#374151',
  padding: 10,
};
