import Editor, { OnChange } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { Check, Copy, Redo2, Settings, Undo2 } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import './App.css';

const darkThemes = ['vs-dark', 'hc-black'];

interface AppSettings {
  indent_type: string;
  indent_width: number;
  theme: string;
  font_size: number;
}

interface AppData {
  last_json_input: string;
  settings: AppSettings;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  theme: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, theme }) => {
  if (!isOpen) return null;
  const isDarkTheme = darkThemes.includes(theme);

  return (
    <div
      className={`modal-overlay ${isDarkTheme ? 'dark-theme' : ''}`}
      onClick={onClose}>
      <div
        className={`modal-content ${isDarkTheme ? 'dark-theme' : ''}`}
        onClick={e => e.stopPropagation()}>
        <button
          className={`modal-close-button ${isDarkTheme ? 'dark-theme' : ''}`}
          onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

function App() {
  const [formattedString, setFormattedString] = useState('');
  const [isError, setIsError] = useState(false);
  const [inputString, setInputString] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState('vs-light');
  const [indentType, setIndentType] = useState<'space' | 'tab'>('space');
  const [indentWidth, setIndentWidth] = useState(4);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const appData = (await invoke('load_app_data')) as AppData;

        setFontSize(appData.settings.font_size);
        setTheme(appData.settings.theme);
        setIndentType(appData.settings.indent_type as 'space' | 'tab');
        setIndentWidth(appData.settings.indent_width);

        setInputString(appData.last_json_input);

        if (appData.last_json_input.trim() !== '') {
          formatString(appData.last_json_input, {
            indentType: appData.settings.indent_type as 'space' | 'tab',
            indentWidth: appData.settings.indent_width,
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await invoke('save_app_data', {
          data: {
            last_json_input: inputString,
            settings: {
              indent_type: indentType,
              indent_width: indentWidth,
              theme: theme,
              font_size: fontSize,
            },
          },
        });
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    };

    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [inputString, fontSize, theme, indentType, indentWidth]);

  const formatString = async (
    textValue?: string,
    optionsOverride?: { indentType?: 'space' | 'tab'; indentWidth?: number },
  ) => {
    const currentText = textValue === undefined ? inputString : textValue;

    if (currentText.trim() === '') {
      setFormattedString('');
      setIsError(false);
      return;
    }

    const finalIndentType = optionsOverride?.indentType || indentType;
    const finalIndentWidth = optionsOverride?.indentWidth || indentWidth;

    try {
      const result = await invoke('format_json_string', {
        jsonString: currentText,
        indentType: finalIndentType,
        indentWidth: finalIndentWidth,
      });
      setFormattedString(result as string);
      setIsError(false);
    } catch (error) {
      setFormattedString(error as string);
      setIsError(true);
    }
  };

  const handleFontSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFontSize(Number(event.target.value));
  };

  const handleThemeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setTheme(event.target.value);
  };

  const handleIndentTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newIndentType = event.target.value as 'space' | 'tab';
    setIndentType(newIndentType);
    formatString(inputString, { indentType: newIndentType, indentWidth });
  };

  const handleIndentWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (Number(event.target.value) < 1 || Number(event.target.value) > 8) {
      return;
    }

    const newWidth = Number(event.target.value);
    setIndentWidth(newWidth);
    if (indentType === 'space') {
      formatString(inputString, { indentType: indentType, indentWidth: newWidth });
    }
  };

  const handleEditorChange: OnChange = value => {
    setInputString(value || '');
    formatString(value, { indentType: indentType, indentWidth: indentWidth });
    setTimeout(updateUndoRedoState, 100);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const updateUndoRedoState = () => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        setCanUndo(model.canUndo());
        setCanRedo(model.canRedo());
      }
    }
  };

  const handleUndo = () => {
    console.log('Undo button clicked', editorRef.current);
    if (editorRef.current && canUndo) {
      editorRef.current.focus();
      editorRef.current.trigger('undo', 'undo', null);
      setTimeout(updateUndoRedoState, 100);
    }
  };

  const handleRedo = () => {
    console.log('Redo button clicked', editorRef.current);
    if (editorRef.current && canRedo) {
      editorRef.current.focus();
      editorRef.current.trigger('redo', 'redo', null);
      setTimeout(updateUndoRedoState, 100);
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const isDarkTheme = darkThemes.includes(theme);

  return (
    <main className={`app-layout ${isDarkTheme ? 'dark-theme' : ''}`}>
      <div className="main-container">
        <div className={`sidebar ${isDarkTheme ? 'dark-theme' : ''}`}>
          <button
            onClick={openModal}
            className={`settings-button ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{ fontSize: `${fontSize}px` }}
            title="Settings">
            <Settings size={Math.max(16, fontSize * 1.5)} />
          </button>
        </div>

        <div className="content-area">
          <div className="container">
            <div className="editor-section">
              <div
                className={`editor-header ${isDarkTheme ? 'dark-theme' : ''}`}
                style={{ fontSize: `${fontSize}px` }}>
                <div className="editor-actions">
                  <button
                    onClick={handleUndo}
                    className={`action-button ${isDarkTheme ? 'dark-theme' : ''}`}
                    style={{ fontSize: `${fontSize}px` }}
                    title="Undo"
                    disabled={!canUndo}>
                    <Undo2 size={Math.max(12, fontSize * 0.8)} />
                  </button>
                  <button
                    onClick={handleRedo}
                    className={`action-button ${isDarkTheme ? 'dark-theme' : ''}`}
                    style={{ fontSize: `${fontSize}px` }}
                    title="Redo"
                    disabled={!canRedo}>
                    <Redo2 size={Math.max(12, fontSize * 0.8)} />
                  </button>
                </div>
              </div>
              <div className={`input ${inputString === '' ? 'empty' : ''}`}>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme={theme}
                  value={inputString}
                  onChange={handleEditorChange}
                  onMount={editor => {
                    editorRef.current = editor;
                    updateUndoRedoState();
                    // Listen for model content changes to update undo/redo state
                    editor.onDidChangeModelContent(() => {
                      setTimeout(updateUndoRedoState, 50);
                    });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: fontSize,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                      arrowSize: 0,
                      useShadows: false,
                    },
                    renderLineHighlight: 'none',
                  }}
                />
              </div>
            </div>
            <div className="editor-section">
              <div
                className={`editor-header ${isDarkTheme ? 'dark-theme' : ''}`}
                style={{ fontSize: `${fontSize}px` }}>
                <button
                  onClick={handleCopy}
                  className={`copy-button ${isCopied ? 'copied' : ''} ${
                    isDarkTheme ? 'dark-theme' : ''
                  }`}
                  style={{ fontSize: `${fontSize}px` }}
                  title={isCopied ? 'Copied!' : 'Copy to Clipboard'}
                  disabled={formattedString === ''}>
                  {isCopied ? (
                    <Check size={Math.max(12, fontSize * 0.8)} />
                  ) : (
                    <Copy size={Math.max(12, fontSize * 0.8)} />
                  )}
                </button>
              </div>
              <div className={`output ${isError ? 'error' : ''}`}>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme={theme}
                  value={formattedString}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: fontSize,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto',
                      arrowSize: 0,
                      useShadows: false,
                    },
                    renderLineHighlight: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        theme={theme}>
        <div
          className="modal-settings-content"
          style={{ fontSize: `${fontSize}px` }}>
          <h2>Editor Settings</h2>
          <div className="setting-item">
            <label htmlFor="font-size-select">Font Size</label>
            <select
              id="font-size-select"
              value={fontSize}
              onChange={handleFontSizeChange}>
              {[10, 12, 14, 16, 18, 20, 24].map(size => (
                <option
                  key={size}
                  value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>
          <div className="setting-item">
            <label htmlFor="theme-select">Theme</label>
            <select
              id="theme-select"
              value={theme}
              onChange={handleThemeChange}>
              <option value="vs-light">Light</option>
              <option value="vs-dark">Dark</option>
              <option value="hc-light">High Contrast Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>
          <div className="setting-item">
            <label htmlFor="indent-type-select">Indent Type</label>
            <select
              id="indent-type-select"
              value={indentType}
              onChange={handleIndentTypeChange}>
              <option value="space">Spaces</option>
              <option value="tab">Tabs</option>
            </select>
          </div>
          {indentType === 'space' && (
            <div className="setting-item">
              <label htmlFor="indent-width-input">Indent Width</label>
              <input
                type="number"
                id="indent-width-input"
                value={indentWidth}
                onChange={handleIndentWidthChange}
              />
            </div>
          )}
        </div>
      </Modal>
    </main>
  );
}

export default App;
