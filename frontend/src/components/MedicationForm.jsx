// frontend/src/components/MedicationForm.jsx
import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const MedicationForm = ({ setMedications, medication, onSave, onClose }) => {
  const [formData, setFormData] = useState(medication || {
    name: '',
    dosageValue: '',
    dosageUnit: '',
    times: [''],
    periodicityValue: '',
    periodicityUnit: '',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleTimeChange = (index, value) => {
    const newTimes = [...formData.times];
    newTimes[index] = value;
    setFormData({ ...formData, times: newTimes });
  };

  const addTime = () => {
    if (formData.times.length >= 10) {
      setError('Максимум 10 времён приёма в день');
      return;
    }
    setFormData({ ...formData, times: [...formData.times, ''] });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.dosageValue || !formData.dosageUnit || !formData.times[0] || !formData.periodicityValue || !formData.periodicityUnit || !formData.startDate) {
      setError('Заполните все обязательные поля');
      return;
    }
    try {
      if (medication) {
        await onSave(formData);
      } else {
        const response = await axios.post('http://localhost:3000/api/medications', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setMedications(prev => [...prev, response.data]);
        setFormData({
          name: '',
          dosageValue: '',
          dosageUnit: '',
          times: [''],
          periodicityValue: '',
          periodicityUnit: '',
          startDate: '',
          endDate: '',
          notes: '',
        });
        if (onClose) onClose(); // Hide form after submission
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при добавлении медикамента');
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form.Group className="mb-3">
        <Form.Label>Название</Form.Label>
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
        <Form.Control
          type="number"
          value={formData.dosageValue}
          onChange={e => setFormData({ ...formData, dosageValue: e.target.value })}
          min={0}
          max={9999}
          required
        />
        <Form.Select
          value={formData.dosageUnit}
          onChange={e => setFormData({ ...formData, dosageUnit: e.target.value })}
          required
        >
          <option value="">Единица</option>
          <option value="mg">мг</option>
          <option value="ml">мл</option>
          <option value="tablets">таблетки</option>
          <option value="drops">капли</option>
          <option value="ampoules">ампулы</option>
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Время приёма</Form.Label>
        {formData.times.map((time, index) => (
          <Form.Control
            key={index}
            type="time"
            value={time}
            onChange={e => handleTimeChange(index, e.target.value)}
            className="mb-2"
            required={index === 0}
          />
        ))}
        <Button variant="secondary" onClick={addTime}>Добавить время</Button>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Периодичность</Form.Label>
        <Form.Control
          type="number"
          value={formData.periodicityValue}
          onChange={e => setFormData({ ...formData, periodicityValue: e.target.value })}
          min={1}
          max={30}
          required
        />
        <Form.Select
          value={formData.periodicityUnit}
          onChange={e => setFormData({ ...formData, periodicityUnit: e.target.value })}
          required
        >
          <option value="">Единица</option>
          <option value="day">день</option>
          <option value="week">неделя</option>
          <option value="month">месяц</option>
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Дата начала</Form.Label>
        <Form.Control
          type="date"
          value={formData.startDate}
          onChange={e => setFormData({ ...formData, startDate: e.target.value })}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Дата окончания</Form.Label>
        <Form.Control
          type="date"
          value={formData.endDate}
          onChange={e => setFormData({ ...formData, endDate: e.target.value })}
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
      <Button type="submit">Сохранить</Button>
    </Form>
  );
};

export default MedicationForm;