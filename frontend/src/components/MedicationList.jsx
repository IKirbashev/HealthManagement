// frontend/src/components/MedicationList.jsx
import { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Dropdown } from 'react-bootstrap';
import axios from 'axios';
import MedicationForm from './MedicationForm';
import { useNavigate } from 'react-router-dom';
import './MedicationList.css';

const MedicationList = () => {
  const [medications, setMedications] = useState([]);
  const [editingMedication, setEditingMedication] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [contextMenuMedication, setContextMenuMedication] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMedications();
  }, [navigate]);

  const fetchMedications = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/medications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMedications(response.data);
    } catch (err) {
      console.error('Failed to fetch medications:', err);
    }
  };

  const handleEdit = (medication) => {
    setEditingMedication(medication);
    setShowEditModal(true);
    setContextMenuMedication(null);
  };

  const handleSave = async (updatedMedication) => {
    setMedications(medications.map(m => (m._id === updatedMedication._id ? updatedMedication : m)));
    setShowEditModal(false);
  };

  const handleComplete = async (medicationId) => {
    if (window.confirm('Вы уверены, что хотите завершить курс?')) {
      try {
        await axios.put(
          `http://localhost:3000/api/medications/${medicationId}/complete`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setMedications(medications.map(m => m._id === medicationId ? { ...m, isCompleted: true } : m));
        setContextMenuMedication(null);
        // Trigger calendar refresh
        navigate('/medication-calendar', { state: { refresh: Date.now() } });
      } catch (err) {
        console.error('Failed to complete medication:', err);
      }
    }
  };

  const handleRestore = async (medicationId) => {
    try {
      await axios.put(
        `http://localhost:3000/api/medications/${medicationId}/restore`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMedications(medications.map(m => m._id === medicationId ? { ...m, isCompleted: false } : m));
      setContextMenuMedication(null);
    } catch (err) {
      console.error('Failed to restore medication:', err);
    }
  };

  const handleDelete = async (medicationId) => {
    if (window.confirm('Вы уверены, что хотите полностью удалить медикамент и его историю?')) {
      try {
        await axios.delete(
          `http://localhost:3000/api/medications/${medicationId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setMedications(medications.filter(m => m._id !== medicationId));
        setContextMenuMedication(null);
      } catch (err) {
        console.error('Failed to delete medication:', err);
      }
    }
  };

  const handleContextMenu = (medication, e) => {
    e.preventDefault();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 100;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 10;
    if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 10;

    setContextMenuMedication(medication);
    setContextMenuPosition({ x, y });
  };

  const handleCloseContextMenu = () => {
    setContextMenuMedication(null);
  };

  const filteredMedications = medications.filter(m => showCompleted ? m.isCompleted : !m.isCompleted);

  return (
    <Container onClick={handleCloseContextMenu}>
      <h1>Медикаменты</h1>
      <Button onClick={() => setShowAddModal(true)} className="mb-3">Добавить медикамент</Button>
      <Button onClick={() => setShowCompleted(!showCompleted)} className="mb-3 ms-2">
        {showCompleted ? 'Показать активные' : 'Показать завершённые'}
      </Button>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Название</th>
            <th>Дозировка</th>
            <th>Время приёма</th>
            <th>Периодичность</th>
            <th>Дата начала</th>
            <th>Дата окончания</th>
            <th>Примечания</th>
          </tr>
        </thead>
        <tbody>
          {filteredMedications.map(medication => (
            <tr
              key={medication._id}
              onContextMenu={e => handleContextMenu(medication, e)}
              style={{ cursor: 'context-menu' }}
            >
              <td>{medication.name}</td>
              <td>{medication.dosage.value} {medication.dosage.unit}</td>
              <td>{medication.intakeTimes.join(', ')}</td>
              <td>Каждые {medication.frequency.count} {medication.frequency.unit}</td>
              <td>{new Date(medication.startDate).toLocaleDateString()}</td>
              <td>{medication.endDate ? new Date(medication.endDate).toLocaleDateString() : '-'}</td>
              <td>{medication.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} style={{ zIndex: 1050 }}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать медикамент</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MedicationForm
            medication={editingMedication}
            onSave={handleSave}
            onClose={() => setShowEditModal(false)}
          />
        </Modal.Body>
      </Modal>

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} style={{ zIndex: 1050 }}>
        <Modal.Header closeButton>
          <Modal.Title>Добавить медикамент</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MedicationForm
            setMedications={setMedications}
            onClose={() => setShowAddModal(false)}
          />
        </Modal.Body>
      </Modal>

      {contextMenuMedication && (
        <Dropdown.Menu
          show
          style={{ position: 'fixed', top: contextMenuPosition.y, left: contextMenuPosition.x, zIndex: 1060 }}
          onClick={e => e.stopPropagation()}
        >
          {!contextMenuMedication.isCompleted ? (
            <>
              <Dropdown.Item onClick={() => handleEdit(contextMenuMedication)}>
                Редактировать
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleComplete(contextMenuMedication._id)}>
                Завершить
              </Dropdown.Item>
            </>
          ) : (
            <>
              <Dropdown.Item onClick={() => handleRestore(contextMenuMedication._id)}>
                Восстановить
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDelete(contextMenuMedication._id)}>
                Удалить
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}
    </Container>
  );
};

export default MedicationList;