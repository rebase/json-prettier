import Editor, { OnChange } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { Settings } from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';
import './App.css';

const darkThemes = ['vs-dark', 'hc-black'];

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
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

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
      <div className={`top-bar ${isDarkTheme ? 'dark-theme' : ''}`}>
        <button
          onClick={openModal}
          className="settings-button"
          title="Settings">
          <Settings size={20} />
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        theme={theme}>
        <div className="modal-settings-content">
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

      <div className="container">
        <div className={`input editor-wrapper ${inputString === '' ? 'empty' : ''}`}>
          <Editor
            height="100%"
            defaultLanguage="json"
            theme={theme}
            value={inputString}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: fontSize,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              lineNumbersMinChars: 2,
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
        <div className={`output editor-wrapper ${isError ? 'error' : ''}`}>
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
              lineNumbersMinChars: 3,
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
    </main>
  );
}

export default App;
