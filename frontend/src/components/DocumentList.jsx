// frontend/src/components/DocumentList.jsx
import { useState, useEffect } from 'react';
import { Container, Table, Modal, Form, InputGroup, Row, Col, Breadcrumb, Button } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';

const DocumentList = () => {
  const [folders, setFolders] = useState([]);
  const [openFolders, setOpenFolders] = useState({});
  const [documents, setDocuments] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRenameDocumentModal, setShowRenameDocumentModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState(null);
  const [uploadForm, setUploadForm] = useState({ name: '', folderId: '', file: null });
  const [renameDocumentId, setRenameDocumentId] = useState(null);
  const [renameDocumentName, setRenameDocumentName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextType, setContextType] = useState(null); // 'folder' or 'document'
  const [contextId, setContextId] = useState(null); // Folder or document ID
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchFolders = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/documents/folders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.data || [];
        console.log('Fetched folders:', data);
        setFolders(data);
      } catch (err) {
        console.error('Failed to fetch folders:', err);
        setFolders([]);
      }
    };
    fetchFolders();
  }, [navigate]);

  useEffect(() => {
    if (selectedFolder) {
      const fetchDocuments = async () => {
        try {
          const response = await axios.get('http://localhost:3000/api/documents', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            params: { folderId: selectedFolder._id || 'null' },
          });
          const data = response.data || [];
          console.log('Fetched documents:', data);
          let filteredDocuments = data;
          if (searchQuery) {
            filteredDocuments = filteredDocuments.filter(doc =>
              (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          setDocuments(filteredDocuments);
        } catch (err) {
          console.error('Failed to fetch documents:', err);
          setDocuments([]);
        }
      };
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [selectedFolder, searchQuery]);

  const handleCreateFolder = async () => {
    try {
      const response = await axios.post(
        'http://localhost:3000/api/documents/folders',
        { name: newFolderName, parentId: parentFolderId || null },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setFolders([...folders, response.data]);
      setShowCreateFolderModal(false);
      setNewFolderName('');
      setParentFolderId(null);
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert(err.response?.data?.error || 'Ошибка при создании папки');
    }
  };

  const handleRenameFolder = async () => {
    try {
      const response = await axios.put(
        `http://localhost:3000/api/documents/folders/${renameFolderId}`,
        { name: renameFolderName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setFolders(folders.map(f => (f._id === renameFolderId ? response.data : f)));
      if (selectedFolder?._id === renameFolderId) {
        setSelectedFolder(response.data);
      }
      setShowRenameFolderModal(false);
      setRenameFolderId(null);
      setRenameFolderName('');
    } catch (err) {
      console.error('Failed to rename folder:', err);
      alert(err.response?.data?.error || 'Ошибка при переименовании папки');
    }
  };

  const handleDeleteFolder = async folderId => {
    if (window.confirm('Вы уверены, что хотите удалить эту папку и все её содержимое?')) {
      try {
        await axios.delete(`http://localhost:3000/api/documents/folders/${folderId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setFolders(folders.filter(f => f._id !== folderId));
        if (selectedFolder?._id === folderId) {
          setSelectedFolder(null);
        }
      } catch (err) {
        console.error('Failed to delete folder:', err);
        alert(err.response?.data?.error || 'Ошибка при удалении папки');
      }
    }
    setShowContextMenu(false);
  };

  const handleUpload = async () => {
    if (!uploadForm.folderId || !uploadForm.file) {
      alert('Пожалуйста, выберите папку и файл');
      return;
    }
    const data = new FormData();
    data.append('name', uploadForm.name);
    data.append('folderId', uploadForm.folderId);
    data.append('file', uploadForm.file);
    try {
      const response = await axios.post('http://localhost:3000/api/documents', data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (selectedFolder && selectedFolder._id === uploadForm.folderId) {
        setDocuments([...documents, response.data]);
      }
      setShowUploadModal(false);
      setUploadForm({ name: '', folderId: '', file: null });
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert(err.response?.data?.error || 'Ошибка при загрузке документа');
    }
  };

  const handleRenameDocument = async () => {
    try {
      const response = await axios.put(
        `http://localhost:3000/api/documents/${renameDocumentId}`,
        { name: renameDocumentName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDocuments(documents.map(doc => (doc._id === renameDocumentId ? response.data : doc)));
      setShowRenameDocumentModal(false);
      setRenameDocumentId(null);
      setRenameDocumentName('');
    } catch (err) {
      console.error('Failed to rename document:', err);
      alert(err.response?.data?.error || 'Ошибка при переименовании документа');
    }
  };

  const handleDeleteDocument = async documentId => {
    if (window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/documents/${documentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setDocuments(documents.filter(d => d._id !== documentId));
      } catch (err) {
        console.error('Failed to delete document:', err);
        alert(err.response?.data?.error || 'Ошибка при удалении документа');
      }
    }
    setShowContextMenu(false);
  };

  const handleDownload = async (filePath, fileName, fileType) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/documents/download/${filePath}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          responseType: 'blob',
        }
      );
      const blob = new Blob([response.data], { type: fileType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      if (err.response?.status === 404) {
        alert('Файл не найден на сервере');
      } else if (err.response?.status === 401) {
        alert('Сессия истекла. Пожалуйста, войдите снова.');
        navigate('/login');
      } else {
        alert('Ошибка при скачивании документа');
      }
    }
    setShowContextMenu(false);
  };

  const toggleFolder = folderId => {
    setOpenFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleContextMenu = (e, type, id) => {
    e.preventDefault();
    setContextType(type);
    setContextId(id);

    // Ensure context menu stays within viewport
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

  const handleClickOutside = () => {
    setShowContextMenu(false);
  };

  // Build breadcrumb trail with circular reference protection
  const getBreadcrumbTrail = () => {
    if (!selectedFolder) return [{ name: 'Корень', id: null }];

    const trail = [];
    const visited = new Set(); // Prevent infinite loops due to circular references
    let currentFolder = selectedFolder;

    while (currentFolder && !visited.has(currentFolder._id)) {
      visited.add(currentFolder._id);
      trail.unshift({ name: currentFolder.name || 'Без названия', id: currentFolder._id });
      const parentFolder = folders.find(f => f._id === currentFolder.parentId);
      currentFolder = parentFolder;
    }

    if (visited.has(currentFolder?._id)) {
      console.warn('Circular reference detected in folder hierarchy');
    }

    trail.unshift({ name: 'Корень', id: null });
    console.log('Breadcrumb trail:', trail);
    return trail;
  };

  const handleBreadcrumbClick = folderId => {
    if (folderId === null) {
      setSelectedFolder(null);
    } else {
      const folder = folders.find(f => f._id === folderId);
      setSelectedFolder(folder || null);
    }
  };

  const renderFolders = (parentId = null, depth = 0) => {
    const filteredFolders = folders.filter(f => (f.parentId ? f.parentId.toString() : null) === parentId);
    console.log(`Rendering folders at depth ${depth} with parentId ${parentId}:`, filteredFolders);
    return filteredFolders.map(folder => (
      <div key={folder._id} style={{ marginLeft: `${depth * 20}px` }}>
        <tr
          onClick={() => {
            toggleFolder(folder._id);
            setSelectedFolder(folder);
          }}
          onContextMenu={e => handleContextMenu(e, 'folder', folder._id)}
          style={{ cursor: 'context-menu' }}
        >
          <td>📁 {folder.name || 'Без названия'}</td>
        </tr>
        {openFolders[folder._id] && renderFolders(folder._id, depth + 1)}
      </div>
    ));
  };

  return (
    <Container onClick={handleClickOutside}>
      <h1>Документы</h1>

      {/* Top Toolbar (Search Only) */}
      <Row className="mb-3 align-items-center">
        <Col>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Поиск документов по названию"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </Col>
      </Row>

      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-3">
        {getBreadcrumbTrail().map((item, index) => (
          <Breadcrumb.Item
            key={item.id || 'root'}
            active={index === getBreadcrumbTrail().length - 1}
            onClick={() => handleBreadcrumbClick(item.id)}
            style={{ cursor: 'pointer' }}
          >
            {item.name}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>

      {/* Folders Table */}
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Папки</th>
          </tr>
        </thead>
        <tbody>{renderFolders()}</tbody>
      </Table>

      {/* Documents Table */}
      {selectedFolder && (
        <>
          <h2>Документы в папке {selectedFolder.name || 'Без названия'}</h2>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Название</th>
                <th>Дата загрузки</th>
                <th>Тип</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr
                  key={doc._id}
                  onContextMenu={e => handleContextMenu(e, 'document', doc._id)}
                  style={{ cursor: 'context-menu' }}
                >
                  <td>{doc.name || 'Без названия'}</td>
                  <td>{new Date(doc.uploadDate).toLocaleDateString()}</td>
                  <td>{doc.fileType || 'Неизвестный тип'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {/* Context Menu */}
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
          {contextType === 'folder' && (
            <>
              <Dropdown.Item onClick={() => {
                setParentFolderId(contextId);
                setShowCreateFolderModal(true);
              }}>
                Добавить папку
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                setUploadForm({ ...uploadForm, folderId: contextId });
                setShowUploadModal(true);
              }}>
                Загрузить файл
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                const folder = folders.find(f => f._id === contextId);
                setRenameFolderId(contextId);
                setRenameFolderName(folder.name);
                setShowRenameFolderModal(true);
              }}>
                Изменить название
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDeleteFolder(contextId)}>
                Удалить папку
              </Dropdown.Item>
            </>
          )}
          {contextType === 'document' && (
            <>
              <Dropdown.Item onClick={() => {
                const document = documents.find(d => d._id === contextId);
                setRenameDocumentId(contextId);
                setRenameDocumentName(document.name);
                setShowRenameDocumentModal(true);
              }}>
                Изменить название
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleDeleteDocument(contextId)}>
                Удалить
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                const document = documents.find(d => d._id === contextId);
                handleDownload(document.filePath, document.name, document.fileType);
              }}>
                Скачать файл
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}

      {/* Create Folder Modal */}
      <Modal show={showCreateFolderModal} onHide={() => setShowCreateFolderModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Создать папку</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Название папки</Form.Label>
              <Form.Control
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Родительская папка</Form.Label>
              <Form.Select
                value={parentFolderId || ''}
                onChange={e => setParentFolderId(e.target.value || null)}
              >
                <option value="">Нет (корневая папка)</option>
                {folders.map(folder => (
                  <option key={folder._id} value={folder._id}>
                    {folder.name || 'Без названия'}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Button onClick={handleCreateFolder}>Создать</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal show={showRenameFolderModal} onHide={() => setShowRenameFolderModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Переименовать папку</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Новое название</Form.Label>
              <Form.Control
                type="text"
                value={renameFolderName}
                onChange={e => setRenameFolderName(e.target.value)}
              />
            </Form.Group>
            <Button onClick={handleRenameFolder}>Сохранить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Upload Document Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Загрузить документ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Папка</Form.Label>
              <Form.Select
                value={uploadForm.folderId}
                onChange={e => setUploadForm({ ...uploadForm, folderId: e.target.value })}
              >
                <option value="">Выберите папку</option>
                {folders.map(folder => (
                  <option key={folder._id} value={folder._id}>
                    {folder.name || 'Без названия'}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Название</Form.Label>
              <Form.Control
                type="text"
                value={uploadForm.name}
                onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Файл</Form.Label>
              <Form.Control
                type="file"
                onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
              />
            </Form.Group>
            <Button onClick={handleUpload}>Загрузить</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Rename Document Modal */}
      <Modal show={showRenameDocumentModal} onHide={() => setShowRenameDocumentModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Переименовать документ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Новое название</Form.Label>
              <Form.Control
                type="text"
                value={renameDocumentName}
                onChange={e => setRenameDocumentName(e.target.value)}
              />
            </Form.Group>
            <Button onClick={handleRenameDocument}>Сохранить</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default DocumentList;