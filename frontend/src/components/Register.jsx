// frontend/src/components/Register.jsx
import { useState } from 'react';
import { Form, Button, Container, Alert } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.email || !formData.password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Некорректный формат email');
      return;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      await axios.post('http://localhost:3000/api/auth/register', formData);
      setFormData({ email: '', password: '' });
      navigate('/login', { state: { success: 'Регистрация успешна! Пожалуйста, войдите.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при регистрации');
    }
  };

  return (
    <Container className="mt-5">
      <h1>Регистрация</h1>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Email</Form.Label>
          <Form.Control
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="Введите email"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Пароль</Form.Label>
          <Form.Control
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            placeholder="Введите пароль"
          />
        </Form.Group>
        <Button type="submit">Зарегистрироваться</Button>
        <Button
          variant="link"
          onClick={() => navigate('/login')}
          className="ms-2"
        >
          Уже есть аккаунт? Войти
        </Button>
      </Form>
    </Container>
  );
};

export default Register;