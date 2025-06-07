// frontend/src/components/DocumentList.jsx
import { useState, useEffect } from 'react';
import { Container, Table, Modal, Form, InputGroup, Row, Col, Breadcrumb, Button, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import './DocumentList.css';

const DocumentList = () => {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRenameDocumentModal, setShowRenameDocumentModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState(null);
  const [uploadForm, setUploadForm] = useState({ folderId: '', files: [], names: [] });
  const [renameDocumentId, setRenameDocumentId] = useState(null);
  const [renameDocumentName, setRenameDocumentName] = useState('');
  const [moveTargetFolderId, setMoveTargetFolderId] = useState('');
  const [selectedItems, setSelectedItems] = useState({ folders: [], documents: [] });
  const [anchor, setAnchor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextType, setContextType] = useState(null);
  const [contextId, setContextId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Checking token:', token);
    if (!token) {
      console.log('No token, redirecting to /login');
      navigate('/login');
      return;
    }

    const fetchFolders = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/documents/folders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Fetched folders:', response.data);
        setFolders(response.data || []);
      } catch (err) {
        console.error('Failed to fetch folders:', err);
        setFolders([]);
      }
    };

    fetchFolders();
  }, [navigate]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/documents', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          params: { folderId: currentFolder ? currentFolder._id : 'null' },
        });
        console.log('Fetched documents:', response.data);
        setDocuments(response.data || []);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        setDocuments([]);
      }
    };

    fetchDocuments();
  }, [currentFolder]);

  useEffect(() => {
    console.log('Resetting selection due to folder change');
    setSelectedItems({ folders: [], documents: [] });
    setAnchor(null);
  }, [currentFolder]);

  const updateHistory = (folder) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(folder);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentFolder(history[historyIndex - 1]);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentFolder(history[historyIndex + 1]);
    }
  };

  const handleGoUp = () => {
    if (currentFolder) {
      const parentFolder = folders.find(f => f._id.toString() === currentFolder.parentId?.toString());
      setCurrentFolder(parentFolder || null);
      updateHistory(parentFolder || null);
    }
  };

  const handleCreateFolder = async () => {
    try {
      const response = await axios.post(
        'http://localhost:3000/api/documents/folders',
        { name: newFolderName, parentId: currentFolder ? currentFolder._id : null },
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
      setFolders(folders.map(f => (f._id.toString() === renameFolderId ? response.data : f)));
      if (currentFolder?._id.toString() === renameFolderId) {
        setCurrentFolder(response.data);
        const newHistory = history.map((h, idx) => (idx === historyIndex ? response.data : h));
        setHistory(newHistory);
      }
      setShowRenameFolderModal(false);
      setRenameFolderId(null);
      setRenameFolderName('');
    } catch (err) {
      console.error('Failed to rename folder:', err);
      alert(err.response?.data?.error || 'Ошибка при переименовании папки');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (window.confirm('Вы уверены, что хотите удалить эту папку и все её содержимое?')) {
      try {
        await axios.delete(`http://localhost:3000/api/documents/folders/${folderId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setFolders(folders.filter(f => f._id.toString() !== folderId));
        if (currentFolder?._id.toString() === folderId) {
          setCurrentFolder(null);
          updateHistory(null);
        }
        setSelectedItems({ ...selectedItems, folders: selectedItems.folders.filter(id => id !== folderId) });
      } catch (err) {
        console.error('Failed to delete folder:', err);
        alert(err.response?.data?.error || 'Ошибка при удалении папки');
      }
    }
    setShowContextMenu(false);
  };

  const handleDeleteSelectedFolders = async () => {
    if (window.confirm('Вы уверены, что хотите удалить выбранные папки и всё их содержимое?')) {
      try {
        await Promise.all(selectedItems.folders.map(folderId =>
          axios.delete(`http://localhost:3000/api/documents/folders/${folderId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          })
        ));
        setFolders(folders.filter(f => !selectedItems.folders.includes(f._id.toString())));
        if (currentFolder && selectedItems.folders.includes(currentFolder._id.toString())) {
          setCurrentFolder(null);
          updateHistory(null);
        }
        setSelectedItems({ ...selectedItems, folders: [] });
      } catch (err) {
        console.error('Failed to delete folders:', err);
        alert(err.response?.data?.error || 'Ошибка при удалении папок');
      }
    }
    setShowContextMenu(false);
  };

  const handleUpload = async () => {
    if (!uploadForm.files.length) {
      alert('Пожалуйста, выберите хотя бы один файл');
      return;
    }
    const data = new FormData();
    uploadForm.files.forEach((file, index) => {
      data.append('files', file);
      data.append('names', uploadForm.names[index] || file.name);
    });
    data.append('folderId', uploadForm.folderId);
    try {
      const response = await axios.post('http://localhost:3000/api/documents/upload-multiple', data, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (currentFolder && currentFolder._id.toString() === uploadForm.folderId) {
        setDocuments([...documents, ...response.data]);
      }
      setShowUploadModal(false);
      setUploadForm({ folderId: '', files: [], names: [] });
    } catch (err) {
      console.error('Failed to upload documents:', err);
      alert(err.response?.data?.error || 'Ошибка при загрузке документов');
    }
  };

  const handleRenameDocument = async () => {
    try {
      const response = await axios.put(
        `http://localhost:3000/api/documents/${renameDocumentId}`,
        { name: renameDocumentName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setDocuments(documents.map(doc => (doc._id.toString() === renameDocumentId ? response.data : doc)));
      setShowRenameDocumentModal(false);
      setRenameDocumentId(null);
      setRenameDocumentName('');
    } catch (err) {
      console.error('Failed to rename document:', err);
      alert(err.response?.data?.error || 'Ошибка при переименовании документа');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот документ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/documents/${documentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setDocuments(documents.filter(d => d._id.toString() !== documentId));
        setSelectedItems({ ...selectedItems, documents: selectedItems.documents.filter(id => id !== documentId) });
      } catch (err) {
        console.error('Failed to delete document:', err);
        alert(err.response?.data?.error || 'Ошибка при удалении документа');
      }
    }
    setShowContextMenu(false);
  };

  const handleDeleteSelectedDocuments = async () => {
    if (window.confirm('Вы уверены, что хотите удалить выбранные документы?')) {
      try {
        await Promise.all(selectedItems.documents.map(docId =>
          axios.delete(`http://localhost:3000/api/documents/${docId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          })
        ));
        setDocuments(documents.filter(d => !selectedItems.documents.includes(d._id.toString())));
        setSelectedItems({ ...selectedItems, documents: [] });
      } catch (err) {
        console.error('Failed to delete documents:', err);
        alert(err.response?.data?.error || 'Ошибка при удалении документов');
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

  const handleMove = async () => {
    try {
      await Promise.all(selectedItems.folders.map(folderId =>
        axios.post('http://localhost:3000/api/documents/move-folder', {
          folderId,
          newParentId: moveTargetFolderId || null,
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
      ));

      await Promise.all(selectedItems.documents.map(documentId =>
        axios.post('http://localhost:3000/api/documents/move-document', {
          documentId,
          newFolderId: moveTargetFolderId || null,
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
      ));

      if (selectedItems.folders.length > 0) {
        const updatedFolders = await axios.get('http://localhost:3000/api/documents/folders', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setFolders(updatedFolders.data || []);
      }

      if (selectedItems.documents.length > 0 && currentFolder?._id.toString() === moveTargetFolderId) {
        const updatedDocuments = await axios.get('http://localhost:3000/api/documents', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          params: { folderId: currentFolder ? currentFolder._id : 'null' },
        });
        setDocuments(updatedDocuments.data || []);
      } else {
        setDocuments(documents.filter(d => !selectedItems.documents.includes(d._id.toString())));
      }

      setSelectedItems({ folders: [], documents: [] });
      setShowMoveModal(false);
      setMoveTargetFolderId('');
    } catch (err) {
      console.error('Failed to move items:', err);
      alert(err.response?.data?.error || 'Ошибка при перемещении');
    }
    setShowContextMenu(false);
  };

  const handleClick = (e, type, id) => {
    console.log('handleClick triggered:', type, id);
    e.preventDefault();
    e.stopPropagation();
    const idStr = id.toString();
    const currentItems = getCurrentItems();
    console.log('Current items in handleClick:', currentItems);
    const clickedItem = currentItems.find(item => item.type === type && item.item._id.toString() === idStr);

    if (!clickedItem) {
      console.log('Clicked item not found:', type, idStr);
      return;
    }

    let newSelectedFolders = [...selectedItems.folders];
    let newSelectedDocuments = [...selectedItems.documents];

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      newSelectedFolders = type === 'folder' ? [idStr] : [];
      newSelectedDocuments = type === 'document' ? [idStr] : [];
      setAnchor({ type, id: idStr });
    } else if (e.ctrlKey || e.metaKey) {
      if (type === 'folder') {
        newSelectedFolders = selectedItems.folders.includes(idStr)
          ? selectedItems.folders.filter(fid => fid !== idStr)
          : [...selectedItems.folders, idStr];
      } else {
        newSelectedDocuments = selectedItems.documents.includes(idStr)
          ? selectedItems.documents.filter(did => did !== idStr)
          : [...selectedItems.documents, idStr];
      }
    } else if (e.shiftKey && anchor) {
      const anchorItem = currentItems.find(item => item.type === anchor.type && item.item._id.toString() === anchor.id);
      if (anchorItem && clickedItem) {
        const anchorIndex = currentItems.indexOf(anchorItem);
        const clickedIndex = currentItems.indexOf(clickedItem);
        const start = Math.min(anchorIndex, clickedIndex);
        const end = Math.max(anchorIndex, clickedIndex);
        const range = currentItems.slice(start, end + 1);
        newSelectedFolders = range.filter(item => item.type === 'folder').map(item => item.item._id.toString());
        newSelectedDocuments = range.filter(item => item.type === 'document').map(item => item.item._id.toString());
      }
    }

    setSelectedItems({ folders: [...newSelectedFolders], documents: [...newSelectedDocuments] });
    console.log('Updated selected items:', { folders: newSelectedFolders, documents: newSelectedDocuments });
    console.log('Selected items details:', JSON.stringify({ folders: newSelectedFolders, documents: newSelectedDocuments }));
  };

  const handleDoubleClick = (e, type, item) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('handleDoubleClick triggered:', type, item._id);
    if (type === 'folder') {
      setCurrentFolder(item);
      updateHistory(item);
    }
  };

  const handleContextMenu = (e, type, id) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('handleContextMenu triggered:', type, id);
    setContextType(type);
    setContextId(id ? id.toString() : null);

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

  const handleClickOutside = (e) => {
    console.log('handleClickOutside triggered');
    setShowContextMenu(false);
  };

  const handleTableContextMenu = (e) => {
    e.preventDefault();
    console.log('handleTableContextMenu triggered');
    handleContextMenu(e, null, null);
  };

  const getBreadcrumbTrail = () => {
    if (!currentFolder) return [{ name: 'Корень', id: null }];

    const trail = [];
    const visited = new Set();
    let current = currentFolder;

    while (current && !visited.has(current._id.toString())) {
      visited.add(current._id.toString());
      trail.unshift({ name: current.name || 'Без названия', id: current._id.toString() });
      const parentFolder = folders.find(f => f._id.toString() === current.parentId?.toString());
      current = parentFolder;
    }

    if (current && visited.has(current._id.toString())) {
      console.warn('Circular reference detected in folder hierarchy');
    }

    trail.unshift({ name: 'Корень', id: null });
    return trail;
  };

  const handleBreadcrumbClick = (folderId) => {
    console.log('handleBreadcrumbClick triggered:', folderId);
    if (folderId === null) {
      setCurrentFolder(null);
      updateHistory(null);
    } else {
      const folder = folders.find(f => f._id.toString() === folderId);
      setCurrentFolder(folder || null);
      updateHistory(folder || null);
    }
  };

  const getCurrentItems = () => {
    const currentFolders = folders.filter(f => (f.parentId ? f.parentId.toString() : null) === (currentFolder ? currentFolder._id.toString() : null));
    const currentDocuments = documents;
    console.log('getCurrentItems - Folders:', currentFolders);
    console.log('getCurrentItems - Documents:', currentDocuments);

    let filteredFolders = currentFolders;
    let filteredDocuments = currentDocuments;

    if (searchQuery) {
      filteredFolders = filteredFolders.filter(folder =>
        (folder.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      filteredDocuments = filteredDocuments.filter(doc =>
        (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const items = [
      ...filteredFolders.map(folder => ({ type: 'folder', item: folder })),
      ...filteredDocuments.map(doc => ({ type: 'document', item: doc })),
    ];
    console.log('getCurrentItems - Returned items:', items);
    return items;
  };

  return (
    <Container onClick={handleClickOutside}>
      <h1>Документы</h1>

      <Row className="mb-3 align-items-center">
        <Col md={6}>
          <ButtonGroup className="me-2">
            <Button variant="outline-primary" onClick={handleGoBack} disabled={historyIndex <= 0}>
              Назад
            </Button>
            <Button variant="outline-primary" onClick={handleGoForward} disabled={historyIndex >= history.length - 1}>
              Вперёд
            </Button>
            <Button variant="outline-primary" onClick={handleGoUp} disabled={!currentFolder}>
              Вверх
            </Button>
          </ButtonGroup>
        </Col>
        <Col md={6}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Поиск документов и папок по названию"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </Col>
      </Row>

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

      <Table bordered onContextMenu={handleTableContextMenu}>
        <thead>
          <tr>
            <th>Название</th>
            <th>Тип</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {getCurrentItems().map(({ type, item }) => {
            console.log('Rendering item:', type, item._id, item.name);
            const isSelected =
              (type === 'folder' && selectedItems.folders.includes(item._id.toString())) ||
              (type === 'document' && selectedItems.documents.includes(item._id.toString()));
            console.log('Is item selected:', type, item._id, isSelected);
            console.log('Applying class:', isSelected ? 'selected-item' : '');
            return (
              <tr
                key={`${type}-${item._id}-${isSelected ? 'selected' : 'unselected'}`}
                onClick={(e) => handleClick(e, type, item._id)}
                onDoubleClick={(e) => handleDoubleClick(e, type, item)}
                onContextMenu={(e) => handleContextMenu(e, type, item._id)}
                className={isSelected ? 'selected-item' : ''}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  {type === 'folder' ? '📁 ' : '📄 '}
                  {item.name || 'Без названия'}
                </td>
                <td>{type === 'folder' ? 'Папка' : item.fileType || 'Неизвестный тип'}</td>
                <td>
                  {type === 'folder'
                    ? item.lastModified
                      ? new Date(item.lastModified).toLocaleDateString()
                      : '-'
                    : new Date(item.uploadDate).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      
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
          {contextType === null && (
            <>
              <Dropdown.Item onClick={() => {
                setShowCreateFolderModal(true);
                setShowContextMenu(false);
              }}>
                Создать папку
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                setUploadForm({ folderId: currentFolder ? currentFolder._id.toString() : '', files: [], names: [] });
                setShowUploadModal(true);
                setShowContextMenu(false);
              }}>
                Загрузить файлы
              </Dropdown.Item>
              {(selectedItems.folders.length > 0 || selectedItems.documents.length > 0) && (
                <>
                  <Dropdown.Item onClick={() => {
                    setShowMoveModal(true);
                    setShowContextMenu(false);
                  }}>
                    Переместить
                  </Dropdown.Item>
                  {selectedItems.folders.length > 0 && (
                    <Dropdown.Item onClick={handleDeleteSelectedFolders}>
                      Удалить папки
                    </Dropdown.Item>
                  )}
                  {selectedItems.documents.length > 0 && (
                    <Dropdown.Item onClick={handleDeleteSelectedDocuments}>
                      Удалить документы
                    </Dropdown.Item>
                  )}
                </>
              )}
            </>
          )}
          {contextType === 'folder' && (
            <>
              <Dropdown.Item onClick={() => {
                setParentFolderId(contextId);
                setShowCreateFolderModal(true);
                setShowContextMenu(false);
              }}>
                Создать папку
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                setUploadForm({ folderId: contextId, files: [], names: [] });
                setShowUploadModal(true);
                setShowContextMenu(false);
              }}>
                Загрузить файлы
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                const folder = folders.find(f => f._id.toString() === contextId);
                setRenameFolderId(contextId);
                setRenameFolderName(folder?.name || '');
                setShowRenameFolderModal(true);
                setShowContextMenu(false);
              }}>
                Переименовать
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                setShowMoveModal(true);
                setShowContextMenu(false);
              }}>
                Переместить
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                if (selectedItems.folders.length > 1) {
                  handleDeleteSelectedFolders();
                } else {
                  handleDeleteFolder(contextId);
                }
              }}>
                Удалить
              </Dropdown.Item>
            </>
          )}
          {contextType === 'document' && (
            <>
              <Dropdown.Item onClick={() => {
                const document = documents.find(d => d._id.toString() === contextId);
                setRenameDocumentId(contextId);
                setRenameDocumentName(document?.name || '');
                setShowRenameDocumentModal(true);
                setShowContextMenu(false);
              }}>
                Переименовать
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                setShowMoveModal(true);
                setShowContextMenu(false);
              }}>
                Переместить
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                if (selectedItems.documents.length > 1) {
                  handleDeleteSelectedDocuments();
                } else {
                  handleDeleteDocument(contextId);
                }
              }}>
                Удалить
              </Dropdown.Item>
              <Dropdown.Item onClick={() => {
                const document = documents.find(d => d._id.toString() === contextId);
                if (document) {
                  handleDownload(document.filePath, document.name, document.fileType);
                }
              }}>
                Скачать
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      )}

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
            <Button onClick={handleCreateFolder}>Создать</Button>
          </Form>
        </Modal.Body>
      </Modal>

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

      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Загрузить файлы</Modal.Title>
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
                  <option key={folder._id.toString()} value={folder._id.toString()}>
                    {folder.name || 'Без названия'}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Файлы</Form.Label>
              <Form.Control
                type="file"
                multiple
                onChange={e => {
                  const files = Array.from(e.target.files);
                  const names = files.map(file => file.name);
                  setUploadForm({ ...uploadForm, files, names });
                }}
              />
            </Form.Group>
            {uploadForm.files.length > 0 && (
              <div>
                <p>Выбрано файлов: {uploadForm.files.length}</p>
                {uploadForm.files.map((file, index) => (
                  <Form.Group key={index} className="mb-3">
                    <Form.Label>Название файла {index + 1}</Form.Label>
                    <Form.Control
                      type="text"
                      value={uploadForm.names[index] || file.name}
                      onChange={e => {
                        const newNames = [...uploadForm.names];
                        newNames[index] = e.target.value;
                        setUploadForm({ ...uploadForm, names: newNames });
                      }}
                    />
                  </Form.Group>
                ))}
              </div>
            )}
            <Button onClick={handleUpload}>Загрузить</Button>
          </Form>
        </Modal.Body>
      </Modal>

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

      <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Переместить элементы</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Выберите папку назначения</Form.Label>
              <Form.Select
                value={moveTargetFolderId}
                onChange={e => setMoveTargetFolderId(e.target.value)}
              >
                <option value="">Корень</option>
                {folders.map(folder => (
                  <option key={folder._id.toString()} value={folder._id.toString()}>
                    {folder.name || 'Без названия'}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Button onClick={handleMove}>Переместить</Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default DocumentList;