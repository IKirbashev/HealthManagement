// frontend/src/components/HealthRecordForm.jsx
import { useState, useEffect } from 'react';
import { Form, Button, Alert, Modal } from 'react-bootstrap';
import axios from 'axios';

const HealthRecordForm = ({ setRecords, record, onSave, onClose }) => {
  const [formData, setFormData] = useState(record || {
    date: '',
    time: '',
    type: '',
    description: '',
    doctorName: '',
    eventName: '',
    files: [],
  });
  const [error, setError] = useState('');
  const [recordTypes, setRecordTypes] = useState([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    const fetchRecordTypes = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/health-records/types', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setRecordTypes(response.data || []);
      } catch (err) {
        console.error('Failed to fetch record types:', err);
        setError('Не удалось загрузить типы записей');
        setRecordTypes([]);
      }
    };
    fetchRecordTypes();
  }, []);

  const handleAddType = async () => {
    if (!newTypeName) {
      setError('Название типа обязательно');
      return;
    }
    try {
      const response = await axios.post(
        'http://localhost:3000/api/health-records/types',
        { name: newTypeName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setRecordTypes([...recordTypes, response.data]);
      setFormData({ ...formData, type: newTypeName });
      setShowAddTypeModal(false);
      setNewTypeName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при добавлении типа');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!formData.date || !formData.time || !formData.type) {
      setError('Заполните обязательные поля: дата, время, тип');
      return;
    }
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'files') {
        value.forEach(file => data.append('files', file));
      } else {
        data.append(key, value);
      }
    });
    try {
      if (record) {
        if (!onSave) {
          console.error('onSave is not defined for editing record');
          setError('Ошибка: функция сохранения не определена');
          return;
        }
        await onSave(formData);
      } else {
        const response = await axios.post('http://localhost:3000/api/health-records', data, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setRecords(prev => [...prev, response.data]);
        setFormData({ date: '', time: '', type: '', description: '', doctorName: '', eventName: '', files: [] });
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании записи');
    }
  };

  return (
    <>
      <Form onSubmit={handleSubmit}>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form.Group className="mb-3">
          <Form.Label>Дата</Form.Label>
          <Form.Control
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Время</Form.Label>
          <Form.Control
            type="time"
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Тип</Form.Label>
          <div className="d-flex align-items-center">
            <Form.Select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              required
              className="me-2"
            >
              <option value="">Выберите тип</option>
              {recordTypes.map(type => (
                <option key={type.name} value={type.name}>
                  {type.name}
                </option>
              ))}
            </Form.Select>
            <Button variant="secondary" onClick={() => setShowAddTypeModal(true)}>
              Добавить тип
            </Button>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Описание</Form.Label>
          <Form.Control
            as="textarea"
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            maxLength={1000}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Имя врача (для визита)</Form.Label>
          <Form.Control
            type="text"
            value={formData.doctorName || ''}
            onChange={e => setFormData({ ...formData, doctorName: e.target.value })}
            maxLength={100}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Название события (для события)</Form.Label>
          <Form.Control
            type="text"
            value={formData.eventName || ''}
            onChange={e => setFormData({ ...formData, eventName: e.target.value })}
            maxLength={200}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Файлы</Form.Label>
          <Form.Control
            type="file"
            multiple
            onChange={e => setFormData({ ...formData, files: Array.from(e.target.files) })}
          />
        </Form.Group>
        <Button type="submit">Сохранить</Button>
        {onClose && <Button variant="secondary" onClick={onClose} className="ms-2">Закрыть</Button>}
      </Form>

      <Modal show={showAddTypeModal} onHide={() => setShowAddTypeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Добавить новый тип записи</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Название типа</Form.Label>
              <Form.Control
                type="text"
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                maxLength={50}
              />
            </Form.Group>
            <Button onClick={handleAddType}>Добавить</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default HealthRecordForm;