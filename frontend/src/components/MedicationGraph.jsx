// frontend/src/components/MedicationGraph.jsx
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, TimeScale, Title, CategoryScale } from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Title, CategoryScale);

const MedicationGraph = ({ intakes }) => {
  const data = {
    labels: intakes.map(intake => new Date(intake.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Принятые дозы',
        data: intakes.map(intake => (intake.status === 'Confirmed' ? 1 : 0)),
        borderColor: '#007bff',
        backgroundColor: '#007bff',
        fill: false,
      },
    ],
  };

  return <Line data={data} />;
};

export default MedicationGraph;