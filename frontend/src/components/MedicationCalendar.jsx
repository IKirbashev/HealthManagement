// frontend/src/components/MedicationCalendar.jsx
import { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Tabs, Tab } from 'react-bootstrap';
import axios from 'axios';
import MedicationForm from './MedicationForm';
import { useNavigate } from 'react-router-dom';

const MedicationCalendar = () => {
  const [activeMedications, setActiveMedications] = useState([]);
  const [archivedMedications, setArchivedMedications] = useState([]);
  const [editingMedication, setEditingMedication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showForm, setShowForm] = useState(false); // State to toggle form visibility
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchMedications = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/medications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActiveMedications(response.data.filter(m => m.isActive));
        setArchivedMedications(response.data.filter(m => !m.isActive));
      } catch (err) {
        console.error('Failed to fetch medications:', err);
      }
    };
    fetchMedications();
  }, [navigate]);

  const handleEdit = medication => {
    setEditingMedication(medication);
    setShowModal(true);
  };

  const handleSave = async updatedMedication => {
    try {
      const response = await axios.put(`http://localhost:3000/api/medications/${updatedMedication._id}`, updatedMedication, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setActiveMedications(activeMedications.map(m => (m._id === response.data._id ? response.data : m)));
      setShowModal(false);
    } catch (err) {
      console.error('Failed to update medication:', err);
    }
  };

  const handleArchive = async medicationId => {
    try {
      await axios.put(`http://localhost:3000/api/medications/${medicationId}/archive`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const medication = activeMedications.find(m => m._id === medicationId);
      setActiveMedications(activeMedications.filter(m => m._id !== medicationId));
      setArchivedMedications([...archivedMedications, { ...medication, isActive: false }]);
    } catch (err) {
      console.error('Failed to archive medication:', err);
    }
  };

  const handleDelete = async medicationId => {
    try {
      await axios.delete(`http://localhost:3000/api/medications/${medicationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setArchivedMedications(archivedMedications.filter(m => m._id !== medicationId));
    } catch (err) {
      console.error('Failed to delete medication:', err);
    }
  };

  const sendNotification = async medication => {
    try {
      await axios.post(`http://localhost:3000/api/medications/${medication._id}/notify`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Уведомление отправлено (проверьте консоль браузера или настройте Service Worker)');
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  return (
    <Container>
      <h1>Медикаменты</h1>
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="mb-3">
          Добавить медикамент
        </Button>
      )}
      {showForm && (
        <div className="mb-3">
          <MedicationForm
            setMedications={setActiveMedications}
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
      <Tabs defaultActiveKey="active" id="medication-tabs">
        <Tab eventKey="active" title="Активные">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Название</th>
                <th>Дозировка</th>
                <th>Время приёма</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {activeMedications.map(med => (
                <tr key={med._id}>
                  <td>{med.name}</td>
                  <td>{med.dosageValue} {med.dosageUnit}</td>
                  <td>{med.times.join(', ')}</td>
                  <td>
                    <Button variant="primary" onClick={() => handleEdit(med)}>
                      Редактировать
                    </Button>
                    <Button variant="warning" onClick={() => sendNotification(med)}>
                      Отправить уведомление
                    </Button>
                    <Button variant="danger" onClick={() => handleArchive(med._id)}>
                      Завершить
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="archived" title="Архив">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Название</th>
                <th>Дозировка</th>
                <th>Время приёма</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {archivedMedications.map(med => (
                <tr key={med._id}>
                  <td>{med.name}</td>
                  <td>{med.dosageValue} {med.dosageUnit}</td>
                  <td>{med.times.join(', ')}</td>
                  <td>
                    <Button variant="danger" onClick={() => handleDelete(med._id)}>
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Tab>
      </Tabs>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать медикамент</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MedicationForm medication={editingMedication} onSave={handleSave} />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MedicationCalendar;