// frontend/src/components/BiomarkerForm.jsx
import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import axios from 'axios';

const BiomarkerForm = ({ setResults, biomarker, onSave, onClose }) => {
  const [formData, setFormData] = useState(biomarker || {
    name: '',
    date: '',
    value: '',
    unit: '',
    comments: '',
  });

  const handleSubmit = async e => {
    e.preventDefault();
    if (biomarker) {
      await onSave(formData);
    } else {
      try {
        const response = await axios.post('http://localhost:3000/api/biomarkers', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setResults(prev => [...prev, response.data]);
        setFormData({ name: '', date: '', value: '', unit: '', comments: '' });
        if (onClose) onClose(); // Hide form after submission
      } catch (err) {
        console.error('Failed to create biomarker:', err);
      }
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Название биомаркера</Form.Label>
        <Form.Control
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Дата</Form.Label>
        <Form.Control
          type="date"
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Значение</Form.Label>
        <Form.Control
          type="number"
          value={formData.value}
          onChange={e => setFormData({ ...formData, value: e.target.value })}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Единица измерения</Form.Label>
        <Form.Control
          type="text"
          value={formData.unit}
          onChange={e => setFormData({ ...formData, unit: e.target.value })}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Комментарии</Form.Label>
        <Form.Control
          as="textarea"
          value={formData.comments}
          onChange={e => setFormData({ ...formData, comments: e.target.value })}
        />
      </Form.Group>
      <Button type="submit">{biomarker ? 'Сохранить' : 'Добавить'}</Button>
    </Form>
  );
};

export default BiomarkerForm;