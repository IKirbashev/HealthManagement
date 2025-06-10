// frontend/src/components/MedicationCalendar.jsx
import { useState, useEffect } from 'react';
import { Container, Form, Dropdown, Table, Modal } from 'react-bootstrap';
import Calendar from 'react-calendar';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import './MedicationCalendar.css';

const MedicationCalendar = () => {
  const [date, setDate] = useState(new Date());
  const [intakes, setIntakes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [medications, setMedications] = useState([]);
  const [contextMenuIntake, setContextMenuIntake] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchMedications();
    fetchIntakes();
  }, [date, filterName, navigate, location.state]);

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

  const fetchIntakes = async () => {
    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const response = await axios.get('http://localhost:3000/api/medications/intakes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          medicationId: filterName ? medications.find(m => m.name.toLowerCase().includes(filterName.toLowerCase()))?._id : undefined,
        },
      });
      setIntakes(response.data);
    } catch (err) {
      console.error('Failed to fetch intakes:', err);
    }
  };

  const handleDateClick = (value) => {
    setSelectedDate(value);
    setShowModal(true);
  };

  const handleStatusUpdate = async (intakeId, status) => {
    try {
      const response = await axios.put(
        `http://localhost:3000/api/medications/intakes/${intakeId}`,
        { status },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setIntakes(intakes.map(i => i._id === intakeId ? response.data : i));
      setContextMenuIntake(null);
    } catch (err) {
      console.error('Failed to update intake status:', err);
    }
  };

  const handleContextMenu = (intake, e) => {
    e.preventDefault();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;
    const menuHeight = 150;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 10;
    if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 10;

    setContextMenuIntake(intake);
    setContextMenuPosition({ x, y });
  };

  const handleCloseContextMenu = () => {
    setContextMenuIntake(null);
  };

  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dayIntakes = intakes.filter(i => new Date(i.date).toDateString() === date.toDateString());
    if (!dayIntakes.length) return null;
    
    const hasTaken = dayIntakes.some(i => i.status === 'taken');
    const hasMissed = dayIntakes.some(i => i.status === 'missed');
    const hasPlanned = dayIntakes.some(i => i.status === 'planned');
    
    return (
      <div className="tile-content">
        {hasTaken && <span className="status taken">✔</span>}
        {hasMissed && <span className="status missed">✘</span>}
        {hasPlanned && <span className="status planned">●</span>}
      </div>
    );
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    if (isSameDay(date, new Date())) return 'current-day';
    return '';
  };

  const dayIntakes = selectedDate ? intakes.filter(i => new Date(i.date).toDateString() === selectedDate.toDateString()) : [];

  return (
    <Container onClick={handleCloseContextMenu}>
      <h1>Календарь приёма медикаментов</h1>
      <Form.Group className="mb-3">
        <Form.Label>Фильтр по названию</Form.Label>
        <Form.Control
          type="text"
          placeholder="Введите название медикамента"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
      </Form.Group>
      <Calendar
        onChange={setDate}
        value={date}
        tileContent={getTileContent}
        tileClassName={tileClassName}
        onClickDay={handleDateClick}
        className="medication-calendar"
      />
      <Modal show={showModal} onHide={() => setShowModal(false)} style={{ zIndex: 1050 }}>
        <Modal.Header closeButton>
          <Modal.Title>Приёмы на {selectedDate?.toLocaleDateString()}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {dayIntakes.length > 0 ? (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Медикамент</th>
                  <th>Дозировка</th>
                  <th>Время</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {dayIntakes.map(intake => (
                  <tr
                    key={intake._id}
                    onContextMenu={e => handleContextMenu(intake, e)}
                    style={{ cursor: 'context-menu' }}
                  >
                    <td>{intake.medicationId?.name || 'Неизвестный медикамент'}</td>
                    <td>{intake.medicationId?.dosage?.value ? `${intake.medicationId.dosage.value} ${intake.medicationId.dosage.unit}` : 'N/A'}</td>
                    <td>{intake.time}</td>
                    <td>
                      {intake.status === 'taken' && '✔ Принято'}
                      {intake.status === 'missed' && '✘ Пропущено'}
                      {intake.status === 'planned' && '● Запланировано'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p>Нет приёмов на этот день</p>
          )}
        </Modal.Body>
      </Modal>
      {contextMenuIntake && (
        <Dropdown.Menu
          show
          style={{ position: 'fixed', top: contextMenuPosition.y, left: contextMenuPosition.x, zIndex: 1060 }}
          onClick={e => e.stopPropagation()}
        >
          <Dropdown.Item onClick={() => handleStatusUpdate(contextMenuIntake._id, 'taken')}>
            Отметить как принято
          </Dropdown.Item>
          <Dropdown.Item onClick={() => handleStatusUpdate(contextMenuIntake._id, 'missed')}>
            Отметить как пропущено
          </Dropdown.Item>
          <Dropdown.Item onClick={() => handleStatusUpdate(contextMenuIntake._id, 'planned')}>
            Отметить как запланировано
          </Dropdown.Item>
        </Dropdown.Menu>
      )}
    </Container>
  );
};

export default MedicationCalendar;