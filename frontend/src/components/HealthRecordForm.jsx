// frontend/src/components/HealthRecordForm.jsx
import { useState, useEffect, useRef } from 'react';
import { Form, Button, Alert, Modal, Dropdown, ListGroup, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';

const HealthRecordForm = ({ setRecords, record, onSave, onClose, onRecordUpdated }) => {
  // Получаем текущую дату и время
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // Формат YYYY-MM-DD
  const currentTime = now.toTimeString().split(' ')[0].slice(0, 5); // Формат HH:mm

  const [formData, setFormData] = useState(record ? {
    date: new Date(record.date).toISOString().split('T')[0], // Дата из записи
    time: record.time || currentTime, // Время из записи или текущее, если не указано
    type: record.type || '', // Тип из записи
    description: record.description || '',
    files: [],
    existingFiles: record.files || [],
    filesToDelete: [],
  } : {
    date: currentDate, // Текущая дата
    time: currentTime, // Текущее время
    type: '',
    description: '',
    files: [],
    existingFiles: [],
    filesToDelete: [],
  });
  const [error, setError] = useState('');
  const [recordTypes, setRecordTypes] = useState([]);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editType, setEditType] = useState(null);
  const [deleteTypeId, setDeleteTypeId] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const selectRef = useRef(null);

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
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при добавлении типа');
    }
  };

  const handleEditType = async () => {
    if (!editType.name) {
      setError('Название типа обязательно');
      return;
    }
    try {
      const response = await axios.put(
        `http://localhost:3000/api/health-records/types/${editType._id}`,
        { name: editType.name },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setRecordTypes(recordTypes.map(type => (type._id === editType._id ? response.data : type)));
      if (formData.type === editType.name) {
        setFormData({ ...formData, type: response.data.name });
      }
      setShowEditTypeModal(false);
      setEditType(null);
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при редактировании типа');
    }
  };

  const handleDeleteType = async () => {
    try {
      await axios.delete(
        `http://localhost:3000/api/health-records/types/${deleteTypeId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setRecordTypes(recordTypes.filter(type => type._id !== deleteTypeId));
      if (formData.type === recordTypes.find(type => type._id === deleteTypeId)?.name) {
        setFormData({ ...formData, type: '' });
      }
      setShowDeleteTypeModal(false);
      setDeleteTypeId(null);
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при удалении типа');
    }
  };

  const handleRemoveFile = (filePath) => {
    setFormData({
      ...formData,
      existingFiles: formData.existingFiles.filter(file => file.filePath !== filePath),
      filesToDelete: [...formData.filesToDelete, filePath],
    });
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
      } else if (key === 'filesToDelete') {
        data.append(key, JSON.stringify(value));
      } else if (key !== 'existingFiles') {
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
        const response = await axios.put(
          `http://localhost:3000/api/health-records/${record._id}`,
          data,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        await onSave(response.data);
      } else {
        const response = await axios.post('http://localhost:3000/api/health-records', data, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setRecords(prev => [...prev, response.data]);
        setFormData({ date: currentDate, time: currentTime, type: '', description: '', files: [], existingFiles: [], filesToDelete: [] });
        if (onRecordUpdated) onRecordUpdated();
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при создании записи');
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

    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    setContextMenuPosition({ x, y });
    setShowContextMenu(true);
  };

  const handleClickOutside = () => {
    setShowContextMenu(false);
  };

  return (
    <>
      <Form onSubmit={handleSubmit} onClick={handleClickOutside}>
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
          <Form.Select
            ref={selectRef}
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value })}
            required
            onContextMenu={handleContextMenu}
            style={{ cursor: 'context-menu' }}
          >
            <option value="">Выберите тип</option>
            {recordTypes.map(type => (
              <option key={type.name} value={type.name}>
                {type.name}
              </option>
            ))}
          </Form.Select>
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
          <Form.Label>Существующие файлы</Form.Label>
          {formData.existingFiles && formData.existingFiles.length > 0 ? (
            <ListGroup>
              {formData.existingFiles.map(file => (
                <ListGroup.Item key={file.filePath} className="d-flex justify-content-between align-items-center">
                  {file.originalName}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveFile(file.filePath)}
                  >
                    Удалить
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p>Нет файлов</p>
          )}
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Добавить новые файлы</Form.Label>
          <Form.Control
            type="file"
            multiple
            onChange={e => setFormData({ ...formData, files: Array.from(e.target.files) })}
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
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            zIndex: 1000,
          }}
        >
          <Dropdown.Item onClick={() => {
            setShowAddTypeModal(true);
            setShowContextMenu(false);
          }}>
            Добавить тип
          </Dropdown.Item>
          {formData.type && (
            <>
              <Dropdown.Item onClick={() => {
                const selectedType = recordTypes.find(type => type.name === formData.type);
                setEditType(selectedType);
                setShowEditTypeModal(true);
                setShowContextMenu(false);
              }}>
                Редактировать тип
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                const selectedType = recordTypes.find(type => type.name === formData.type);
                setDeleteTypeId(selectedType._id);
                setShowDeleteTypeModal(true);
                setShowContextMenu(false);
              }}>
                Удалить тип
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}

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

      <Modal show={showEditTypeModal} onHide={() => setShowEditTypeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать тип записи</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Название типа</Form.Label>
              <Form.Control
                type="text"
                value={editType?.name || ''}
                onChange={e => setEditType({ ...editType, name: e.target.value })}
                maxLength={50}
              />
            </Form.Group>
            <Button onClick={handleEditType}>Сохранить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteTypeModal} onHide={() => setShowDeleteTypeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Удалить тип записи</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить тип "{recordTypes.find(type => type._id === deleteTypeId)?.name}"?</p>
          <Button variant="danger" onClick={handleDeleteType} className="me-2">
            Удалить
          </Button>
          <Button variant="secondary" onClick={() => setShowDeleteTypeModal(false)}>
            Отмена
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default HealthRecordForm;