// frontend/src/components/MedicationForm.jsx
import { useState, useEffect, useRef } from 'react';
import { Form, Button, Alert, Modal, Dropdown, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';

const MedicationForm = ({ medication, onSave, onClose, setMedications }) => {
  const now = new Date();
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  const [formData, setFormData] = useState(medication ? {
    name: medication.name,
    dosage: medication.dosage,
    intakeTimes: medication.intakeTimes,
    frequency: medication.frequency,
    startDate: formatDate(new Date(medication.startDate)),
    endDate: medication.endDate ? formatDate(new Date(medication.endDate)) : '',
    notes: medication.notes || '',
  } : {
    name: '',
    dosage: { value: '', unit: '' },
    intakeTimes: [''],
    frequency: { count: 1, unit: 'день' },
    startDate: formatDate(now),
    endDate: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [dosageUnits, setDosageUnits] = useState([]);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showEditUnitModal, setShowEditUnitModal] = useState(false);
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [editUnit, setEditUnit] = useState(null);
  const [deleteUnitId, setDeleteUnitId] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const selectRef = useRef(null);

  useEffect(() => {
    fetchDosageUnits();
  }, []);

  const fetchDosageUnits = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/medications/dosage-units', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setDosageUnits(response.data);
    } catch (err) {
      setError('Не удалось загрузить единицы измерения');
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName) {
      setError('Название единицы обязательно');
      return;
    }
    try {
      const response = await axios.post(
        'http://localhost:3000/api/medications/dosage-units',
        { name: newUnitName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDosageUnits([...dosageUnits, response.data]);
      setFormData({ ...formData, dosage: { ...formData.dosage, unit: newUnitName } });
      setShowAddUnitModal(false);
      setNewUnitName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при добавлении единицы');
    }
  };

  const handleEditUnit = async () => {
    if (!editUnit.name) {
      setError('Название единицы обязательно');
      return;
    }
    try {
      const response = await axios.put(
        `http://localhost:3000/api/medications/dosage-units/${editUnit._id}`,
        { name: editUnit.name },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDosageUnits(dosageUnits.map(unit => (unit._id === editUnit._id ? response.data : unit)));
      if (formData.dosage.unit === editUnit.name) {
        setFormData({ ...formData, dosage: { ...formData.dosage, unit: response.data.name } });
      }
      setShowEditUnitModal(false);
      setEditUnit(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при редактировании единицы');
    }
  };

  const handleDeleteUnit = async () => {
    try {
      await axios.delete(
        `http://localhost:3000/api/medications/dosage-units/${deleteUnitId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDosageUnits(dosageUnits.filter(unit => unit._id !== deleteUnitId));
      if (formData.dosage.unit === dosageUnits.find(unit => unit._id === deleteUnitId)?.name) {
        setFormData({ ...formData, dosage: { ...formData.dosage, unit: '' } });
      }
      setShowDeleteUnitModal(false);
      setDeleteUnitId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при удалении единицы');
    }
  };

  const handleAddTime = () => {
    if (formData.intakeTimes.length < 10) {
      setFormData({ ...formData, intakeTimes: [...formData.intakeTimes, ''] });
    } else {
      setError('Максимум 10 времён приёма');
    }
  };

  const handleRemoveTime = (index) => {
    setFormData({ ...formData, intakeTimes: formData.intakeTimes.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.dosage.value || !formData.dosage.unit || !formData.intakeTimes.every(t => t) || !formData.frequency.count || !formData.frequency.unit || !formData.startDate) {
      setError('Заполните все обязательные поля');
      return;
    }
    
    try {
      if (medication) {
        const response = await axios.put(
          `http://localhost:3000/api/medications/${medication._id}`,
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        await onSave(response.data);
      } else {
        const response = await axios.post(
          'http://localhost:3000/api/medications',
          formData,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setMedications(prev => [...prev, response.data]);
        setFormData({
          name: '',
          dosage: { value: '', unit: '' },
          intakeTimes: [''],
          frequency: { count: 1, unit: 'день' },
          startDate: formatDate(new Date()),
          endDate: '',
          notes: '',
        });
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при сохранении медикамента');
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 100;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 10;
    if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 10;

    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
  };

  const handleClickOutside = () => setShowContextMenu(false);

  return (
    <>
      <Form onSubmit={handleSubmit} onClick={handleClickOutside}>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form.Group className="mb-3">
          <Form.Label>Название медикамента</Form.Label>
          <Form.Control
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            maxLength={100}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Дозировка</Form.Label>
          <div className="d-flex">
            <Form.Control
              type="number"
              value={formData.dosage.value}
              onChange={e => setFormData({ ...formData, dosage: { ...formData.dosage, value: e.target.value } })}
              min={1}
              max={9999}
              required
              className="me-2"
            />
            <Form.Select
              ref={selectRef}
              value={formData.dosage.unit}
              onChange={e => setFormData({ ...formData, dosage: { ...formData.dosage, unit: e.target.value } })}
              required
              onContextMenu={handleContextMenu}
              style={{ cursor: 'context-menu' }}
            >
              <option value="">Выберите единицу</option>
              {dosageUnits.map(unit => (
                <option key={unit._id} value={unit.name}>{unit.name}</option>
              ))}
            </Form.Select>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Время приёма</Form.Label>
          {formData.intakeTimes.map((time, index) => (
            <div key={index} className="d-flex mb-2">
              <Form.Control
                type="time"
                value={time}
                onChange={e => {
                  const newTimes = [...formData.intakeTimes];
                  newTimes[index] = e.target.value;
                  setFormData({ ...formData, intakeTimes: newTimes });
                }}
                required
                className="me-2"
              />
              {formData.intakeTimes.length > 1 && (
                <Button variant="danger" onClick={() => handleRemoveTime(index)}>Удалить</Button>
              )}
            </div>
          ))}
          <Button variant="secondary" onClick={handleAddTime}>Добавить время</Button>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Периодичность</Form.Label>
          <div className="d-flex">
            <Form.Control
              type="number"
              value={formData.frequency.count}
              onChange={e => setFormData({ ...formData, frequency: { ...formData.frequency, count: e.target.value } })}
              min={1}
              max={30}
              required
              className="me-2"
            />
            <Form.Select
              value={formData.frequency.unit}
              onChange={e => setFormData({ ...formData, frequency: { ...formData.frequency, unit: e.target.value } })}
              required
            >
              <option value="день">день</option>
              <option value="неделя">неделя</option>
              <option value="месяц">месяц</option>
            </Form.Select>
          </div>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Дата начала</Form.Label>
          <Form.Control
            type="date"
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            max={formatDate(new Date())}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Дата окончания (опционально)</Form.Label>
          <Form.Control
            type="date"
            value={formData.endDate}
            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            min={formData.startDate}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Примечания</Form.Label>
          <Form.Control
            as="textarea"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            maxLength={500}
          />
        </Form.Group>
        <ButtonGroup>
          <Button type="submit">Сохранить</Button>
          {onClose && <Button variant="secondary" onClick={onClose} className="ms-2">Закрыть</Button>}
        </ButtonGroup>
      </Form>

      {showContextMenu && (
        <Dropdown.Menu
          show
          style={{ position: 'fixed', top: contextMenuPosition.y, left: contextMenuPosition.x, zIndex: 1000 }}
        >
          <Dropdown.Item onClick={() => { setShowAddUnitModal(true); setShowContextMenu(false); }}>
            Добавить единицу
          </Dropdown.Item>
          {formData.dosage.unit && (
            <>
              <Dropdown.Item onClick={() => {
                const selectedUnit = dosageUnits.find(unit => unit.name === formData.dosage.unit);
                setEditUnit(selectedUnit);
                setShowEditUnitModal(true);
                setShowContextMenu(false);
              }}>
                Редактировать единицу
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                const selectedUnit = dosageUnits.find(unit => unit.name === formData.dosage.unit);
                setDeleteUnitId(selectedUnit._id);
                setShowDeleteUnitModal(true);
                setShowContextMenu(false);
              }}>
                Удалить единицу
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}

      <Modal show={showAddUnitModal} onHide={() => setShowAddUnitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Добавить единицу измерения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Название единицы</Form.Label>
              <Form.Control
                type="text"
                value={newUnitName}
                onChange={e => setNewUnitName(e.target.value)}
                maxLength={50}
              />
            </Form.Group>
            <Button onClick={handleAddUnit}>Добавить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showEditUnitModal} onHide={() => setShowEditUnitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать единицу измерения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Название единицы</Form.Label>
              <Form.Control
                type="text"
                value={editUnit?.name || ''}
                onChange={e => setEditUnit({ ...editUnit, name: e.target.value })}
                maxLength={50}
              />
            </Form.Group>
            <Button onClick={handleEditUnit}>Сохранить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteUnitModal} onHide={() => setShowDeleteUnitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Удалить единицу измерения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить единицу "{dosageUnits.find(unit => unit._id === deleteUnitId)?.name}"?</p>
          <Button variant="danger" onClick={handleDeleteUnit} className="me-2">Удалить</Button>
          <Button variant="secondary" onClick={() => setShowDeleteUnitModal(false)}>Отмена</Button>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default MedicationForm;