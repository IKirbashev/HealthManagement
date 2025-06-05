// frontend/src/components/DocumentUpload.jsx
import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

const DocumentUpload = ({ setDocuments }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    folder: '',
    file: null,
  });
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!formData.file) {
      setError('Выберите файл для загрузки');
      return;
    }
    const data = new FormData();
    data.append('name', formData.name);
    data.append('category', formData.category);
    data.append('folder', formData.folder);
    data.append('file', formData.file);
    try {
      const response = await axios.post('http://localhost:3000/api/documents', data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setDocuments(prev => [...prev, response.data]);
      setFormData({ name: '', category: '', folder: '', file: null });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при загрузке документа');
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
          maxLength={200}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Категория</Form.Label>
        <Form.Control
          type="text"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          maxLength={50}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Папка</Form.Label>
        <Form.Control
          type="text"
          value={formData.folder}
          onChange={e => setFormData({ ...formData, folder: e.target.value })}
          maxLength={50}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Файл</Form.Label>
        <Form.Control
          type="file"
          onChange={e => setFormData({ ...formData, file: e.target.files[0] })}
          required
        />
      </Form.Group>
      <Button type="submit">Загрузить</Button>
    </Form>
  );
};

export default DocumentUpload;