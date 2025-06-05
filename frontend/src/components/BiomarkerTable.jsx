// frontend/src/components/BiomarkerTable.jsx
import { useState, useEffect } from 'react';
import { Container, Table, Button, Modal } from 'react-bootstrap';
import axios from 'axios';
import BiomarkerForm from './BiomarkerForm';
import BiomarkerGraph from './BiomarkerGraph';
import { useNavigate } from 'react-router-dom';

const BiomarkerTable = () => {
  const [results, setResults] = useState([]);
  const [editingResult, setEditingResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBiomarker, setSelectedBiomarker] = useState(null);
  const [showForm, setShowForm] = useState(false); // State to toggle form visibility
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchResults = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/biomarkers', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(response.data);
      } catch (err) {
        console.error('Failed to fetch biomarkers:', err);
      }
    };
    fetchResults();
  }, [navigate]);

  const handleEdit = result => {
    setEditingResult(result);
    setShowModal(true);
  };

  const handleSave = async updatedResult => {
    try {
      const response = await axios.put(`http://localhost:3000/api/biomarkers/${updatedResult._id}`, updatedResult, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setResults(results.map(r => (r._id === response.data._id ? response.data : r)));
      setShowModal(false);
    } catch (err) {
      console.error('Failed to update biomarker:', err);
    }
  };

  const handleShowGraph = name => {
    setSelectedBiomarker(name);
  };

  return (
    <Container>
      <h1>Биомаркеры</h1>
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="mb-3">
          Добавить биомаркер
        </Button>
      )}
      {showForm && (
        <div className="mb-3">
          <BiomarkerForm
            setResults={setResults}
            onClose={() => setShowForm(false)} // Pass callback to hide form
          />
          <Button
            variant="secondary"
            onClick={() => setShowForm(false)}
            className="mt-2"
          >
            Отмена
          </Button>
        </div>
      )}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Название</th>
            <th>Дата</th>
            <th>Значение</th>
            <th>Единица</th>
            <th>Комментарии</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {results.map(result => (
            <tr key={result._id}>
              <td>{result.biomarkerId.name}</td>
              <td>{new Date(result.date).toLocaleDateString()}</td>
              <td>{result.value}</td>
              <td>{result.unit}</td>
              <td>{result.comments}</td>
              <td>
                <Button variant="primary" onClick={() => handleEdit(result)}>
                  Редактировать
                </Button>
                <Button variant="info" onClick={() => handleShowGraph(result.biomarkerId.name)}>
                  Показать график
                </Button>
                <Button variant="danger" onClick={async () => {
                  await axios.delete(`http://localhost:3000/api/biomarkers/${result._id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                  });
                  setResults(results.filter(r => r._id !== result._id));
                }}>
                  Удалить
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {selectedBiomarker && (
        <BiomarkerGraph results={results.filter(r => r.biomarkerId.name === selectedBiomarker)} />
      )}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать биомаркер</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BiomarkerForm biomarker={editingResult} onSave={handleSave} />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default BiomarkerTable;