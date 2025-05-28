import Editor, { OnChange } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  Bug,
  Check,
  Copy,
  Download,
  Eraser,
  FolderOpen,
  Github,
  Info,
  Redo2,
  Settings,
  Undo2,
} from 'lucide-react';
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

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  theme: string;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  fontSize: number;
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

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  theme,
  title,
  message,
  confirmText,
  cancelText,
  fontSize,
}) => {
  if (!isOpen) return null;
  const isDarkTheme = darkThemes.includes(theme);

  return (
    <div
      className={`modal-overlay ${isDarkTheme ? 'dark-theme' : ''}`}
      onClick={onClose}
      style={{ zIndex: 1100 }}>
      <div
        className={`modal-content ${isDarkTheme ? 'dark-theme' : ''}`}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '25em' }}>
        <button
          className={`modal-close-button ${isDarkTheme ? 'dark-theme' : ''}`}
          onClick={onClose}>
          &times;
        </button>
        <div
          className="modal-settings-content"
          style={{ fontSize: `${fontSize}px` }}>
          <h2>{title}</h2>
          <div className="reset-confirmation">
            <p className="reset-confirmation-text">{message}</p>
            <div className="reset-button-group">
              <button
                onClick={onConfirm}
                className="reset-button reset-button-danger">
                {confirmText}
              </button>
              <button
                onClick={onClose}
                className="reset-button reset-button-secondary">
                {cancelText}
              </button>
            </div>
          </div>
        </div>
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
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const editorRef = useRef<any>(null);

  const getSystemTheme = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'vs-dark';
    }
    return 'vs-light';
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const appData = (await invoke('load_app_data')) as AppData;

        setFontSize(appData.settings.font_size);

        const savedTheme = appData.settings.theme;
        if (savedTheme && savedTheme !== '') {
          setTheme(savedTheme);
        } else {
          const systemTheme = getSystemTheme();
          setTheme(systemTheme);
        }

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
        const systemTheme = getSystemTheme();
        setTheme(systemTheme);
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

  const handleIndentWidthChange = (event: ChangeEvent<HTMLSelectElement>) => {
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

  const openAboutModal = () => setIsAboutModalOpen(true);
  const closeAboutModal = () => setIsAboutModalOpen(false);
  const handleResetSettings = async () => {
    try {
      await invoke('reset_app_data');
      const systemTheme = getSystemTheme();

      setFontSize(14);
      setTheme(systemTheme);
      setIndentType('space');
      setIndentWidth(4);
      setIsError(false);

      if (inputString.trim() !== '') {
        formatString(inputString, { indentType: 'space', indentWidth: 4 });
      }

      setIsResetConfirmOpen(false);
      closeModal();
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = async () => {
    if (!formattedString || isError) {
      return;
    }

    try {
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      const defaultFilename = `formatted-json-${timestamp}.json`;

      const filePath = await save({
        title: 'Save JSON File',
        defaultPath: defaultFilename,
        filters: [
          {
            name: 'JSON Files',
            extensions: ['json'],
          },
          {
            name: 'All Files',
            extensions: ['*'],
          },
        ],
      });

      if (filePath) {
        await invoke('write_file', {
          path: filePath,
          content: formattedString,
        });
      }
    } catch (error) {
      console.error('Failed to download:', error);
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
    if (editorRef.current && canUndo) {
      editorRef.current.focus();
      editorRef.current.trigger('undo', 'undo', null);
      setTimeout(updateUndoRedoState, 100);
    }
  };

  const handleRedo = () => {
    if (editorRef.current && canRedo) {
      editorRef.current.focus();
      editorRef.current.trigger('redo', 'redo', null);
      setTimeout(updateUndoRedoState, 100);
    }
  };

  const handleClear = () => {
    setInputString('');
    setFormattedString('');
    setIsError(false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleLoadFile = async () => {
    try {
      const filePath = await open({
        title: 'Open JSON File',
        filters: [
          {
            name: 'JSON Files',
            extensions: ['json'],
          },
          {
            name: 'All Files',
            extensions: ['*'],
          },
        ],
      });

      if (filePath) {
        const fileContent = await invoke('read_file', { path: filePath });
        setInputString(fileContent as string);
        formatString(fileContent as string, { indentType: indentType, indentWidth: indentWidth });
        setTimeout(updateUndoRedoState, 100);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isResetConfirmOpen) {
          setIsResetConfirmOpen(false);
        } else if (isAboutModalOpen) {
          closeAboutModal();
        } else if (isModalOpen) {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isModalOpen, isAboutModalOpen, isResetConfirmOpen]);

  const isDarkTheme = darkThemes.includes(theme);

  return (
    <main className={`app-layout ${isDarkTheme ? 'dark-theme' : ''}`}>
      <div className="main-container">
        <div className={`sidebar ${isDarkTheme ? 'dark-theme' : ''}`}>
          <button
            onClick={openAboutModal}
            className={`settings-button ${isDarkTheme ? 'dark-theme' : ''}`}
            style={{ fontSize: `${fontSize}px` }}
            title="About">
            <Info size={Math.max(16, fontSize * 1.5)} />
          </button>
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
                <div className="editor-actions-left">
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
                  <button
                    onClick={handleClear}
                    className={`action-button ${isDarkTheme ? 'dark-theme' : ''}`}
                    style={{ fontSize: `${fontSize}px` }}
                    title="Clear All"
                    disabled={inputString === ''}>
                    <Eraser size={Math.max(12, fontSize * 0.8)} />
                  </button>
                </div>
                <div className="editor-actions-right">
                  <button
                    onClick={handleLoadFile}
                    className={`action-button ${isDarkTheme ? 'dark-theme' : ''}`}
                    style={{ fontSize: `${fontSize}px` }}
                    title="Load JSON File">
                    <FolderOpen size={Math.max(12, fontSize * 0.8)} />
                  </button>
                </div>
              </div>
              <div className={`input ${inputString === '' ? 'empty' : ''}`}>
                <Editor
                  height="100%"
                  defaultLanguage="plaintext"
                  theme={theme}
                  value={inputString}
                  onChange={handleEditorChange}
                  onMount={editor => {
                    editorRef.current = editor;
                    updateUndoRedoState();
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
                    renderLineHighlight: 'none',
                    lineNumbers: 'off',
                    lineNumbersMinChars: 0,
                    folding: false,
                    showFoldingControls: 'never',
                    hover: { enabled: false },
                    quickSuggestions: false,
                    parameterHints: { enabled: false },
                    suggestOnTriggerCharacters: false,
                    acceptSuggestionOnEnter: 'off',
                    tabCompletion: 'off',
                    wordBasedSuggestions: 'off',
                    occurrencesHighlight: 'off',
                    selectionHighlight: false,
                    find: { addExtraSpaceOnTop: false },
                    unicodeHighlight: { ambiguousCharacters: false },
                    smoothScrolling: false,
                    cursorBlinking: 'solid',
                    disableLayerHinting: true,
                    disableMonospaceOptimizations: false,
                    hideCursorInOverviewRuler: true,
                    links: false,
                    colorDecorators: false,
                    contextmenu: false,
                    scrollbar: {
                      useShadows: false,
                      verticalHasArrows: false,
                      horizontalHasArrows: false,
                      vertical: 'auto',
                      horizontal: 'auto',
                      verticalScrollbarSize: fontSize * 0.8,
                      horizontalScrollbarSize: fontSize * 0.8,
                    },
                    overviewRulerLanes: 0,
                    overviewRulerBorder: false,
                    glyphMargin: false,
                    renderWhitespace: 'none',
                    renderControlCharacters: false,
                    rulers: [],
                  }}
                />
              </div>
            </div>
            <div className="editor-section">
              <div
                className={`editor-header ${isDarkTheme ? 'dark-theme' : ''}`}
                style={{ fontSize: `${fontSize}px` }}>
                <div className="editor-actions-left">
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
                <div className="editor-actions-right">
                  <button
                    onClick={handleDownload}
                    className={`action-button ${isDarkTheme ? 'dark-theme' : ''}`}
                    style={{ fontSize: `${fontSize}px` }}
                    title="Download JSON"
                    disabled={formattedString === '' || isError}>
                    <Download size={Math.max(12, fontSize * 0.8)} />
                  </button>
                </div>
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
                    renderLineHighlight: 'none',
                    lineNumbers: 'off',
                    lineNumbersMinChars: 0,
                    folding: true,
                    showFoldingControls: 'mouseover',
                    stickyScroll: { enabled: false },
                    hover: { enabled: false },
                    contextmenu: false,
                    quickSuggestions: false,
                    parameterHints: { enabled: false },
                    suggestOnTriggerCharacters: false,
                    acceptSuggestionOnEnter: 'off',
                    tabCompletion: 'off',
                    wordBasedSuggestions: 'off',
                    occurrencesHighlight: 'off',
                    selectionHighlight: false,
                    find: { addExtraSpaceOnTop: false },
                    unicodeHighlight: { ambiguousCharacters: false },
                    smoothScrolling: false,
                    cursorBlinking: 'solid',
                    disableLayerHinting: true,
                    disableMonospaceOptimizations: false,
                    hideCursorInOverviewRuler: true,
                    links: false,
                    colorDecorators: false,
                    scrollbar: {
                      useShadows: false,
                      verticalHasArrows: false,
                      horizontalHasArrows: false,
                      vertical: 'auto',
                      horizontal: 'auto',
                      verticalScrollbarSize: fontSize * 0.8,
                      horizontalScrollbarSize: fontSize * 0.8,
                    },
                    overviewRulerLanes: 0,
                    overviewRulerBorder: false,
                    glyphMargin: false,
                    renderWhitespace: 'none',
                    renderControlCharacters: false,
                    rulers: [],
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAboutModalOpen}
        onClose={closeAboutModal}
        theme={theme}>
        <div
          className="modal-settings-content"
          style={{ fontSize: `${fontSize}px` }}>
          <div className="about-content">
            <div className="app-info">
              <h3>JSON Prettier</h3>
              <p className="version">Version 0.1.0</p>
              <p className="description">
                A simple tool to clean up and format your JSON data. Transform messy, tangled JSON
                into beautifully organized and readable format with your preferred styling options.
              </p>
            </div>

            <div className="usage-tips">
              <h4>How to Use</h4>
              <p>
                Simply paste your JSON data in the left panel and see the formatted result on the
                right. Customize font size and theme in the settings to match your preferences.
              </p>
            </div>

            <div className="action-buttons">
              <button
                className="action-link-button github-button"
                onClick={() => openUrl('https://github.com/rebase/json-prettier')}
                title="View on GitHub">
                <Github size={16} />
              </button>
              <button
                className="action-link-button bug-button"
                onClick={() => openUrl('https://github.com/rebase/json-prettier/issues')}
                title="Report Bug">
                <Bug size={16} />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        theme={theme}>
        <div
          className="modal-settings-content"
          style={{ fontSize: `${fontSize}px` }}>
          <h2>Settings</h2>
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
              <label htmlFor="indent-width-select">Indent Width</label>
              <select
                id="indent-width-select"
                value={indentWidth}
                onChange={handleIndentWidthChange}>
                {[1, 2, 3, 4, 6, 8].map(width => (
                  <option
                    key={width}
                    value={width}>
                    {width} {width === 1 ? 'space' : 'spaces'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="reset-settings-section">
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="reset-button reset-button-danger reset-button-full">
              Reset All Settings
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetSettings}
        theme={theme}
        title="Reset Settings"
        message="This will reset font size, theme, and formatting settings to defaults."
        confirmText="Yes, Reset Settings"
        cancelText="Cancel"
        fontSize={fontSize}
      />
    </main>
  );
}

export default App;
