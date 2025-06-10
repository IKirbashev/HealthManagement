// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import HealthRecordList from './components/HealthRecordList';
import MedicationCalendar from './components/MedicationCalendar';
import MedicationList from './components/MedicationList';
import BiomarkerTable from './components/BiomarkerTable';
import DocumentList from './components/DocumentList';
import Login from './components/Login';
import Register from './components/Register';
import AccountMenu from './components/AccountMenu';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Navbar bg="light" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/health-records">Health Management</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/health-records">Записи о здоровье</Nav.Link>
              <Nav.Link as={Link} to="/medications">Медикаменты</Nav.Link>
              <Nav.Link as={Link} to="/medication-calendar">Календарь приёма</Nav.Link>
              <Nav.Link as={Link} to="/biomarkers">Биомаркеры</Nav.Link>
              <Nav.Link as={Link} to="/documents">Документы</Nav.Link>
            </Nav>
            <Nav>
              {localStorage.getItem('token') ? (
                <NavDropdown title="Аккаунт" id="basic-nav-dropdown">
                  <NavDropdown.Item as={Link} to="/account">Аккаунт</NavDropdown.Item>
                  <NavDropdown.Item onClick={handleLogout}>Выйти</NavDropdown.Item>
                </NavDropdown>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login">Войти</Nav.Link>
                  <Nav.Link as={Link} to="/register">Зарегистрироваться</Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="mt-3">
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/health-records" element={<ProtectedRoute><HealthRecordList /></ProtectedRoute>} />
            <Route path="/medications" element={<ProtectedRoute><MedicationList /></ProtectedRoute>} />
            <Route path="/medication-calendar" element={<ProtectedRoute><MedicationCalendar /></ProtectedRoute>} />
            <Route path="/biomarkers" element={<ProtectedRoute><BiomarkerTable /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><DocumentList /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountMenu /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/health-records" />} />
          </Routes>
        </ErrorBoundary>
      </Container>
    </BrowserRouter>
  );
}

export default App;