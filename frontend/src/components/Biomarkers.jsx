// frontend/src/components/Biomarkers.jsx
import { useState, useEffect, useRef } from 'react';
import { Container, Table, Modal, Dropdown, Form, Row, Col, Alert, Button } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './Biomarkers.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Biomarkers = () => {
  const [biomarkers, setBiomarkers] = useState([]);
  const [filteredBiomarkers, setFilteredBiomarkers] = useState([]);
  const [units, setUnits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showEditUnitModal, setShowEditUnitModal] = useState(false);
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', date: '', value: '', unit: '', comments: '' });
  const [newUnitName, setNewUnitName] = useState('');
  const [editUnit, setEditUnit] = useState(null);
  const [deleteUnitId, setDeleteUnitId] = useState(null);
  const [error, setError] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showUnitContextMenu, setShowUnitContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextBiomarker, setContextBiomarker] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedBiomarker, setSelectedBiomarker] = useState(null);
  const [biomarkerResults, setBiomarkerResults] = useState([]);
  const unitSelectRef = useRef(null);
  const tableRef = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchBiomarkers();
    fetchUnits();
  }, [navigate]);

  useEffect(() => {
    if (pathname === '/biomarkers' || !pathname.startsWith('/biomarkers/')) {
      setSelectedBiomarker(null);
    } else {
      const biomarkerName = decodeURIComponent(pathname.split('/biomarkers/')[1]);
      setSelectedBiomarker(biomarkerName);
      fetchBiomarkerResults(biomarkerName);
    }
  }, [pathname]);

  useEffect(() => {
    try {
      let filtered = [...biomarkers];

      if (filterName) {
        filtered = filtered.filter(biomarker =>
          biomarker.name.toLowerCase().includes(filterName.toLowerCase())
        );
      }

      if (dateRange.start || dateRange.end) {
        filtered = filtered.filter(biomarker => {
          const biomarkerDate = new Date(biomarker.date);
          const startDate = dateRange.start ? new Date(dateRange.start) : new Date(-8640000000000000);
          const endDate = dateRange.end ? new Date(dateRange.end) : new Date(8640000000000000);
          return biomarkerDate >= startDate && biomarkerDate <= endDate;
        });
      }

      setFilteredBiomarkers(filtered);
    } catch (err) {
      console.error('Error in filtering biomarkers:', err);
      setFilteredBiomarkers([]);
    }
  }, [filterName, dateRange, biomarkers]);

  const fetchBiomarkers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/biomarkers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter to keep only the latest result per biomarker name
      const latestBiomarkers = response.data.reduce((acc, current) => {
        const existing = acc.find(b => b.name === current.name);
        if (!existing || new Date(current.date) > new Date(existing.date)) {
          return acc.filter(b => b.name !== current.name).concat(current);
        }
        return acc;
      }, []);
      setBiomarkers(latestBiomarkers);
      setFilteredBiomarkers(latestBiomarkers);
      setError('');
    } catch (err) {
      console.error('Failed to fetch biomarkers:', err);
      setError('Не удалось загрузить биомаркеры. Проверьте подключение к серверу.');
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/biomarker-units', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnits(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch units:', err);
      setError('Не удалось загрузить единицы измерения. Проверьте подключение к серверу.');
    }
  };

  const fetchBiomarkerResults = async (name) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/biomarkers/${name}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBiomarkerResults(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch biomarker results:', err);
      setError('Не удалось загрузить результаты биомаркера.');
    }
  };

  const handleAddBiomarker = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!formData.name || !formData.date || !formData.value || !formData.unit) {
        setError('Заполните все обязательные поля');
        return;
      }
      if (formData.value <= 0 || formData.value.toString().length > 6) {
        setError('Значение должно быть положительным и не превышать 6 цифр');
        return;
      }
      if (new Date(formData.date) > new Date()) {
        setError('Дата не может быть в будущем');
        return;
      }

      await axios.post(
        'http://localhost:3000/api/biomarkers',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAddModal(false);
      setFormData({ id: '', name: '', date: '', value: '', unit: '', comments: '' });
      setError('');
      fetchBiomarkers();
      if (selectedBiomarker) {
        fetchBiomarkerResults(selectedBiomarker);
      }
    } catch (err) {
      console.error('Failed to add biomarker:', err);
      setError(err.response?.data?.error || 'Ошибка при добавлении биомаркера');
    }
  };

  const handleEditBiomarker = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!formData.name || !formData.date || !formData.value || !formData.unit) {
        setError('Заполните все обязательные поля');
        return;
      }
      if (formData.value <= 0 || formData.value.toString().length > 6) {
        setError('Значение должно быть положительным и не превышать 6 цифр');
        return;
      }
      if (new Date(formData.date) > new Date()) {
        setError('Дата не может быть в будущем');
        return;
      }

      await axios.put(
        `http://localhost:3000/api/biomarkers/${formData.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowEditModal(false);
      setFormData({ id: '', name: '', date: '', value: '', unit: '', comments: '' });
      setError('');
      fetchBiomarkers();
      if (selectedBiomarker) {
        fetchBiomarkerResults(selectedBiomarker);
      }
    } catch (err) {
      console.error('Failed to update biomarker:', err);
      setError(err.response?.data?.error || 'Ошибка при обновлении биомаркера');
    }
  };

  const handleDeleteBiomarker = async (biomarkerId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот биомаркер?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/biomarkers/${biomarkerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchBiomarkers();
        if (selectedBiomarker) {
          fetchBiomarkerResults(selectedBiomarker);
        }
        setShowContextMenu(false);
      } catch (err) {
        console.error('Failed to delete biomarker:', err);
        setError(err.response?.data?.error || 'Ошибка при удалении биомаркера');
      }
    }
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnitName) {
      setError('Название единицы обязательно');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3000/api/biomarker-units',
        { name: newUnitName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnits([...units, response.data]);
      setFormData({ ...formData, unit: newUnitName });
      setShowAddUnitModal(false);
      setNewUnitName('');
      setError('');
    } catch (err) {
      console.error('Failed to add unit:', err);
      setError(err.response?.data?.error || 'Ошибка при добавлении единицы измерения');
    }
  };

  const handleEditUnit = async (e) => {
    e.preventDefault();
    if (!editUnit.name) {
      setError('Название единицы обязательно');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:3000/api/biomarker-units/${editUnit._id}`,
        { name: editUnit.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnits(units.map(unit => (unit._id === editUnit._id ? response.data : unit)));
      if (formData.unit === editUnit.name) {
        setFormData({ ...formData, unit: response.data.name });
      }
      setShowEditUnitModal(false);
      setEditUnit(null);
      setError('');
    } catch (err) {
      console.error('Failed to update unit:', err);
      setError(err.response?.data?.error || 'Ошибка при обновлении единицы измерения');
    }
  };

  const handleDeleteUnit = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/biomarker-units/${deleteUnitId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnits(units.filter(unit => unit._id !== deleteUnitId));
      if (formData.unit === units.find(unit => unit._id === deleteUnitId)?.name) {
        setFormData({ ...formData, unit: '' });
      }
      setShowDeleteUnitModal(false);
      setDeleteUnitId(null);
      setError('');
    } catch (err) {
      console.error('Failed to delete unit:', err);
      setError(err.response?.data?.error || 'Ошибка при удалении единицы измерения');
    }
  };

  const handleContextMenu = (e, biomarker = null) => {
    e.preventDefault();
    setContextBiomarker(biomarker);
    setShowUnitContextMenu(false);

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 150;
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

  const handleUnitContextMenu = (e) => {
    e.preventDefault();
    setShowContextMenu(false);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 150;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    setContextMenuPosition({ x, y });
    setShowUnitContextMenu(true);
  };

  const handleClickOutside = () => {
    setShowContextMenu(false);
    setShowUnitContextMenu(false);
  };

  const handleDoubleClick = (name) => {
    navigate(`/biomarkers/${encodeURIComponent(name)}`);
  };

  const chartData = {
    labels: biomarkerResults.map(result => new Date(result.date).toLocaleDateString()),
    datasets: [
      {
        label: selectedBiomarker,
        data: biomarkerResults.map(result => result.value),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `График значений ${selectedBiomarker}`,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const result = biomarkerResults[context.dataIndex];
            return `${context.dataset.label}: ${context.parsed.y} ${result.unit} (${new Date(result.date).toLocaleDateString()})`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Дата',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Значение',
        },
      },
    },
  };

  return (
    <Container onClick={handleClickOutside}>
      <h1>Биомаркеры</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {!selectedBiomarker ? (
        <>
          <Row className="mb-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Фильтр по названию</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Введите название"
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
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
                <Form.Label>Дата (по)</Form.Label>
                <Form.Control
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex justify-content-end">
              <Button
                variant="primary"
                onClick={() => setShowAddModal(true)}
              >
                Добавить результат
              </Button>
            </Col>
          </Row>

          <Table
            striped
            bordered
            hover
            ref={tableRef}
            style={{ userSelect: 'none' }}
          >
            <thead>
              <tr>
                <th>Название</th>
                <th>Дата</th>
                <th>Значение</th>
                <th>Единица</th>
                <th>Комментарии</th>
              </tr>
            </thead>
            <tbody>
              {filteredBiomarkers.map(biomarker => (
                <tr
                  key={biomarker._id}
                  onContextMenu={e => handleContextMenu(e, biomarker)}
                  onDoubleClick={() => handleDoubleClick(biomarker.name)}
                  style={{ cursor: 'context-menu' }}
                >
                  <td>{biomarker.name}</td>
                  <td>{new Date(biomarker.date).toLocaleDateString()}</td>
                  <td>{biomarker.value}</td>
                  <td>{biomarker.unit}</td>
                  <td>{biomarker.comments || '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <Container>
          <Button variant="secondary" onClick={() => navigate('/biomarkers')} className="mb-3">
            Назад к списку
          </Button>
          <h2>{selectedBiomarker}</h2>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Значение</th>
                <th>Единица</th>
                <th>Комментарии</th>
              </tr>
            </thead>
            <tbody>
              {biomarkerResults.map(result => (
                <tr key={result._id}>
                  <td>{new Date(result.date).toLocaleDateString()}</td>
                  <td>{result.value}</td>
                  <td>{result.unit}</td>
                  <td>{result.comments || '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {biomarkerResults.length > 0 && (
            <div className="biomarker-graph">
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
        </Container>
      )}

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
            setFormData({ ...formData, name: contextBiomarker?.name || '' });
            setShowAddModal(true);
          }}>
            Добавить результат
          </Dropdown.Item>
          {contextBiomarker && (
            <>
              <Dropdown.Item onClick={() => {
                setFormData({
                  id: contextBiomarker._id,
                  name: contextBiomarker.name,
                  date: contextBiomarker.date.split('T')[0],
                  value: contextBiomarker.value,
                  unit: contextBiomarker.unit,
                  comments: contextBiomarker.comments || ''
                });
                setShowEditModal(true);
                setShowContextMenu(false);
              }}>
                Редактировать
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDeleteBiomarker(contextBiomarker._id)}>
                Удалить
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Добавить результат</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddBiomarker}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Название</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                required
                placeholder="Введите название биомаркера"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Дата</Form.Label>
              <Form.Control
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Значение</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Единица измерения</Form.Label>
              <Form.Select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                onContextMenu={handleUnitContextMenu}
                ref={unitSelectRef}
                required
                style={{ cursor: 'context-menu' }}
              >
                <option value="">Выберите единицу</option>
                {units.map((unit) => (
                  <option key={unit._id} value={unit.name}>{unit.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Комментарии</Form.Label>
              <Form.Control
                as="textarea"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                maxLength={500}
              />
            </Form.Group>
            <Button type="submit">Сохранить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать результат</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditBiomarker}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Название</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                required
                placeholder="Введите название биомаркера"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Дата</Form.Label>
              <Form.Control
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Значение</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Единица измерения</Form.Label>
              <Form.Select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                onContextMenu={handleUnitContextMenu}
                ref={unitSelectRef}
                required
                style={{ cursor: 'context-menu' }}
              >
                <option value="">Выберите единицу</option>
                {units.map((unit) => (
                  <option key={unit._id} value={unit.name}>{unit.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Комментарии</Form.Label>
              <Form.Control
                as="textarea"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                maxLength={500}
              />
            </Form.Group>
            <Button type="submit">Сохранить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {showUnitContextMenu && (
        <Dropdown.Menu
          show
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            zIndex: 2000,
          }}
        >
          <Dropdown.Item onClick={() => {
            setShowAddUnitModal(true);
            setShowUnitContextMenu(false);
          }}>
            Добавить единицу
          </Dropdown.Item>
          {formData.unit && (
            <>
              <Dropdown.Item onClick={() => {
                const selectedUnit = units.find(unit => unit.name === formData.unit);
                if (selectedUnit) {
                  setEditUnit(selectedUnit);
                  setShowEditUnitModal(true);
                  setShowUnitContextMenu(false);
                }
              }}>
                Редактировать единицу
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                const selectedUnit = units.find(unit => unit.name === formData.unit);
                if (selectedUnit) {
                  setDeleteUnitId(selectedUnit._id);
                  setShowDeleteUnitModal(true);
                  setShowUnitContextMenu(false);
                }
              }}>
                Удалить единицу
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}

      <Modal show={showAddUnitModal} onHide={() => setShowAddUnitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Добавить новую единицу измерения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddUnit}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Название единицы</Form.Label>
              <Form.Control
                type="text"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                maxLength={20}
                required
              />
            </Form.Group>
            <Button type="submit">Добавить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showEditUnitModal} onHide={() => setShowEditUnitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Редактировать единицу измерения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleEditUnit}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Название единицы</Form.Label>
              <Form.Control
                type="text"
                value={editUnit?.name || ''}
                onChange={(e) => setEditUnit({ ...editUnit, name: e.target.value })}
                maxLength={20}
                required
              />
            </Form.Group>
            <Button type="submit">Сохранить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={showDeleteUnitModal} onHide={() => setShowDeleteUnitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Удалить единицу измерения</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите удалить единицу "{units.find(unit => unit._id === deleteUnitId)?.name}"?</p>
          <Button variant="danger" onClick={handleDeleteUnit} className="me-2">
            Удалить
          </Button>
          <Button variant="secondary" onClick={() => setShowDeleteUnitModal(false)}>
            Отмена
          </Button>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Biomarkers;