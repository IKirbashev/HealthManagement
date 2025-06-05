// frontend/src/components/BiomarkerGraph.jsx
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title } from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title);

const BiomarkerGraph = ({ results }) => {
  const data = {
    labels: results.map(result => new Date(result.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Значение',
        data: results.map(result => result.value),
        borderColor: '#007bff',
        backgroundColor: '#007bff',
        fill: false,
      },
    ],
  };

  return <Line data={data} />;
};

export default BiomarkerGraph;