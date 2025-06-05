// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import HealthRecordList from './components/HealthRecordList';
import MedicationCalendar from './components/MedicationCalendar';
import BiomarkerTable from './components/BiomarkerTable';
import DocumentList from './components/DocumentList';
import Login from './components/Login';
import Register from './components/Register';
import AccountMenu from './components/AccountMenu';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="/">Health Management</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/health-records">Записи о здоровье</Nav.Link>
              <Nav.Link as={Link} to="/medications">Медикаменты</Nav.Link>
              <Nav.Link as={Link} to="/biomarkers">Биомаркеры</Nav.Link>
              <Nav.Link as={Link} to="/documents">Документы</Nav.Link>
            </Nav>
            <Nav>
              {localStorage.getItem('token') ? (
                <NavDropdown title="👤" id="basic-nav-dropdown">
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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/account" element={<AccountMenu />} />
        <Route path="/health-records" element={<ErrorBoundary><HealthRecordList /></ErrorBoundary>} />
        <Route path="/medications" element={<MedicationCalendar />} />
        <Route path="/biomarkers" element={<BiomarkerTable />} />
        <Route path="/documents" element={<ErrorBoundary><DocumentList /></ErrorBoundary>} />
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;