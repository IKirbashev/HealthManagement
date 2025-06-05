//frontend/src/components/ErrorBoundary.jsx
import React, { Component } from 'react';
import { Alert, Button } from 'react-bootstrap';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="danger">
          <Alert.Heading>Произошла ошибка</Alert.Heading>
          <p>{this.state.error?.message || 'Неизвестная ошибка при рендеринге компонента'}</p>
          <Button onClick={() => window.location.reload()}>Перезагрузить страницу</Button>
        </Alert>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;