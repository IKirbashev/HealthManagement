// frontend/src/components/AccountMenu.jsx
import { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AccountMenu = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChangePassword = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.put('http://localhost:3000/api/auth/change-password', { password: formData.password }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Пароль успешно изменён');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при изменении пароля');
    }
  };

  const handleChangeEmail = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.put('http://localhost:3000/api/auth/change-email', { email: formData.email }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Email успешно изменён');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при изменении email');
    }
  };

  return (
    <Container className="mt-5">
      <h1>Управление аккаунтом</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Form onSubmit={handleChangePassword}>
        <Form.Group className="mb-3">
          <Form.Label>Новый пароль</Form.Label>
          <Form.Control
            type="password"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </Form.Group>
        <Button type="submit">Изменить пароль</Button>
      </Form>
      <Form onSubmit={handleChangeEmail} className="mt-3">
        <Form.Group className="mb-3">
          <Form.Label>Новый email</Form.Label>
          <Form.Control
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </Form.Group>
        <Button type="submit">Изменить email</Button>
      </Form>
    </Container>
  );
};

export default AccountMenu;