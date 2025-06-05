// frontend/src/components/HealthRecordList.jsx
import { useState, useEffect, useRef } from 'react';
import { Container, Table, Modal, Dropdown, Form, Row, Col, Button } from 'react-bootstrap';
import axios from 'axios';
import HealthRecordForm from './HealthRecordForm';
import { useNavigate } from 'react-router-dom';

const HealthRecordList = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextRecord, setContextRecord] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [recordTypes, setRecordTypes] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // Default: newest first
  const tableRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchRecords = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/health-records', {
          headers: { Authorization: `Bearer ${token}` },
          params: { sort: sortOrder === 'asc' ? 'date' : '-date' }, // Sort by date
        });
        const data = response.data || [];
        setRecords(data);
        setFilteredRecords(data);
      } catch (err) {
        console.error('Failed to fetch records:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
        setRecords([]);
        setFilteredRecords([]);
      }
    };

    const fetchRecordTypes = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/health-records/types', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecordTypes(response.data || []);
      } catch (err) {
        console.error('Failed to fetch record types:', err);
        setRecordTypes([]);
      }
    };

    fetchRecords();
    fetchRecordTypes();
  }, [navigate, sortOrder]); // Re-fetch when sortOrder changes

  useEffect(() => {
    try {
      let filtered = [...records];

      // Filter by type
      if (filterType) {
        filtered = filtered.filter(record => record.type === filterType);
      }

      // Search by description
      if (searchDescription) {
        filtered = filtered.filter(record =>
          (record.description || '').toLowerCase().includes(searchDescription.toLowerCase())
        );
      }

      // Filter by date range
      if (dateRange.start || dateRange.end) {
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date);
          const startDate = dateRange.start ? new Date(dateRange.start) : new Date(-8640000000000000);
          const endDate = dateRange.end ? new Date(dateRange.end) : new Date(8640000000000000);
          return recordDate >= startDate && recordDate <= endDate;
        });
      }

      setFilteredRecords(filtered);
    } catch (err) {
      console.error('Error in filtering records:', err);
      setFilteredRecords([]);
    }
  }, [filterType, searchDescription, dateRange, records]);

  const handleEdit = record => {
    console.log('Editing record:', record);
    setEditingRecord(record);
    setShowEditModal(true);
    setShowContextMenu(false);
  };

  const handleSave = async updatedRecord => {
    try {
      console.log('Saving updated record:', updatedRecord);
      const response = await axios.put(
        `http://localhost:3000/api/health-records/${updatedRecord._id}`,
        updatedRecord,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setRecords(records.map(r => (r._id === response.data._id ? response.data : r)));
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update record:', err);
    }
  };

  const handleDelete = async recordId => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      try {
        await axios.delete(`http://localhost:3000/api/health-records/${recordId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setRecords(records.filter(r => r._id !== recordId));
        setShowContextMenu(false);
      } catch (err) {
        console.error('Failed to delete record:', err);
      }
    }
  };

  const handleAddRecord = () => {
    setShowAddModal(true);
    setShowContextMenu(false);
  };

  const handleDownload = async (filePath, fileName, fileType) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/health-records/download/${filePath}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          responseType: 'blob',
        }
      );
      const blob = new Blob([response.data], { type: fileType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Ошибка при скачивании файла');
    }
  };

  const handleContextMenu = (e, record = null) => {
    e.preventDefault();
    setContextRecord(record);
    
    // Ensure context menu stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 150; // Increased height due to more menu items
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
    <Container onClick={handleClickOutside}>
      <h1>Записи о здоровье</h1>

      {/* Filters, Search, and Sorting */}
      <Row className="mb-3 align-items-center">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Фильтр по типу</Form.Label>
            <Form.Select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">Все типы</option>
              {recordTypes.map(type => (
                <option key={type.name} value={type.name}>
                  {type.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Поиск по описанию</Form.Label>
            <Form.Control
              type="text"
              placeholder="Введите описание"
              value={searchDescription}
              onChange={e => setSearchDescription(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Дата (с)</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Сортировка</Form.Label>
            <Form.Select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
            >
              <option value="desc">Сначала новые</option>
              <option value="asc">Сначала старые</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Records Table */}
      <Table
        striped
        bordered
        hover
        ref={tableRef}
        style={{ userSelect: 'none' }}
      >
        <thead>
          <tr>
            <th>Дата</th>
            <th>Время</th>
            <th>Тип</th>
            <th>Описание</th>
            <th>Файлы</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map(record => (
            <tr
              key={record._id}
              onContextMenu={e => handleContextMenu(e, record)}
              style={{ cursor: 'context-menu' }}
            >
              <td>{new Date(record.date).toLocaleDateString()}</td>
              <td>{record.time}</td>
              <td>{record.type}</td>
              <td>{record.description || ''}</td>
              <td>
                {record.files && record.files.length > 0 ? (
                  record.files.map(file => (
                    <div key={file.filePath}>
                      <Button
                        variant="link"
                        onClick={() => handleDownload(file.filePath, file.originalName, file.fileType)}
                      >
                        {file.originalName || file.filePath}
                      </Button>
                    </div>
                  ))
                ) : (
                  'Нет файлов'
                )}
              </td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Context Menu */}
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
          <Dropdown.Item onClick={handleAddRecord}>
            Добавить запись
          </Dropdown.Item>
          {contextRecord && (
            <>
              <Dropdown.Item onClick={() => handleEdit(contextRecord)}>
                Редактировать
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDelete(contextRecord._id)}>
                Удалить
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать запись</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <HealthRecordForm record={editingRecord} onSave={handleSave} onClose={() => setShowEditModal(false)} />
        </Modal.Body>
      </Modal>

      {/* Add Record Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Добавить запись</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <HealthRecordForm setRecords={setRecords} onClose={() => setShowAddModal(false)} />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default HealthRecordList;