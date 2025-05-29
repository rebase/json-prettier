import Editor, { OnChange } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check } from '@tauri-apps/plugin-updater';
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
const isDevelopment = import.meta.env.DEV;

const getThemeClass = (
  baseClass: string,
  theme: string,
  additionalClasses: string = '',
): string => {
  const isDarkTheme = darkThemes.includes(theme);
  const darkClass = isDarkTheme ? 'dark-theme' : '';
  return [baseClass, darkClass, additionalClasses].filter(Boolean).join(' ');
};

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
  isSmallText?: boolean;
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
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, theme, isSmallText }) => {
  if (!isOpen) return null;

  return (
    <div
      className={getThemeClass('modal-overlay', theme)}
      onClick={onClose}>
      <div
        className={getThemeClass('modal-content', theme, isSmallText ? 'small-text' : '')}
        onClick={e => e.stopPropagation()}>
        <button
          className={getThemeClass('modal-close-button', theme)}
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
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={getThemeClass('modal-overlay', theme)}
      onClick={onClose}
      style={{ zIndex: 1100 }}>
      <div
        className={getThemeClass('modal-content confirm', theme)}
        onClick={e => e.stopPropagation()}>
        <button
          className={getThemeClass('modal-close-button', theme)}
          onClick={onClose}>
          &times;
        </button>
        <div className="modal-settings-content">
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

const getCommonEditorOptions = (fontSize: number) => ({
  minimap: { enabled: false },
  fontSize: fontSize,
  wordWrap: 'on' as const,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderLineHighlight: 'none' as const,
  lineNumbers: 'off' as const,
  lineNumbersMinChars: 0,
  stickyScroll: { enabled: false },
  hover: { enabled: false },
  quickSuggestions: false,
  parameterHints: { enabled: false },
  suggestOnTriggerCharacters: false,
  acceptSuggestionOnEnter: 'off' as const,
  tabCompletion: 'off' as const,
  wordBasedSuggestions: 'off' as const,
  occurrencesHighlight: 'off' as const,
  selectionHighlight: false,
  find: { addExtraSpaceOnTop: false },
  unicodeHighlight: { ambiguousCharacters: false },
  smoothScrolling: false,
  cursorBlinking: 'solid' as const,
  disableLayerHinting: true,
  disableMonospaceOptimizations: false,
  hideCursorInOverviewRuler: true,
  links: false,
  colorDecorators: false,
  scrollbar: {
    useShadows: false,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    vertical: 'auto' as const,
    horizontal: 'auto' as const,
    verticalScrollbarSize: fontSize * 0.8,
    horizontalScrollbarSize: fontSize * 0.8,
  },
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  glyphMargin: false,
  renderWhitespace: 'none' as const,
  renderControlCharacters: false,
  rulers: [],
});

const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

const INDENT_WIDTH_OPTIONS = [1, 2, 3, 4, 6, 8];

const DEFAULT_SETTINGS = {
  fontSize: 14,
  indentType: 'space' as 'space' | 'tab',
  indentWidth: 4,
} as const;

const TIMING = {
  COPY_RESET_DELAY: 2000,
  SAVE_DEBOUNCE_DELAY: 500,
  UNDO_REDO_UPDATE_DELAY: 100,
} as const;

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
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);

    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidth = isMobile
        ? Math.min(Math.max(((e.clientY - containerRect.top) / containerRect.height) * 100, 15), 85)
        : Math.min(
            Math.max(((e.clientX - containerRect.left) / containerRect.width) * 100, 15),
            85,
          );

      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = isMobile ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

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

    const checkForUpdates = async () => {
      try {
        const update = await check();
        if (update) {
          await update.downloadAndInstall();
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };

    checkForUpdates();
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

    const timeoutId = setTimeout(saveData, TIMING.SAVE_DEBOUNCE_DELAY);
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

    setTimeout(updateUndoRedoState, TIMING.UNDO_REDO_UPDATE_DELAY);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const openAboutModal = () => setIsAboutModalOpen(true);
  const closeAboutModal = () => setIsAboutModalOpen(false);

  const handleResetSettings = async () => {
    try {
      await invoke('reset_app_data');
      const systemTheme = getSystemTheme();

      setFontSize(DEFAULT_SETTINGS.fontSize);
      setTheme(systemTheme);
      setIndentType(DEFAULT_SETTINGS.indentType);
      setIndentWidth(DEFAULT_SETTINGS.indentWidth);
      setIsError(false);

      if (inputString.trim() !== '') {
        formatString(inputString, {
          indentType: DEFAULT_SETTINGS.indentType,
          indentWidth: DEFAULT_SETTINGS.indentWidth,
        });
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
      setTimeout(() => setIsCopied(false), TIMING.COPY_RESET_DELAY);
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

      setTimeout(updateUndoRedoState, TIMING.UNDO_REDO_UPDATE_DELAY);
    }
  };

  const handleRedo = () => {
    if (editorRef.current && canRedo) {
      editorRef.current.focus();
      editorRef.current.trigger('redo', 'redo', null);

      setTimeout(updateUndoRedoState, TIMING.UNDO_REDO_UPDATE_DELAY);
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

        setTimeout(updateUndoRedoState, TIMING.UNDO_REDO_UPDATE_DELAY);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        let newFontSize = fontSize;
        const currentIndex = FONT_SIZES.indexOf(fontSize);

        if (event.key === '=' || event.key === '+') {
          event.preventDefault();
          if (currentIndex < FONT_SIZES.length - 1) {
            newFontSize = FONT_SIZES[currentIndex + 1];
          } else {
            newFontSize = FONT_SIZES[FONT_SIZES.length - 1];
          }
        } else if (event.key === '-') {
          event.preventDefault();
          if (currentIndex > 0) {
            newFontSize = FONT_SIZES[currentIndex - 1];
          } else {
            newFontSize = FONT_SIZES[0];
          }
        } else if (event.shiftKey && event.key.toLowerCase() === 'c') {
          event.preventDefault();
          handleCopy();
        } else if (event.shiftKey && event.key.toLowerCase() === 'x') {
          event.preventDefault();
          handleClear();
        } else if (event.key.toLowerCase() === 'n') {
          event.preventDefault();
          handleClear();
        } else if (event.key.toLowerCase() === 'o') {
          event.preventDefault();
          handleLoadFile();
        } else if (event.key.toLowerCase() === 's') {
          event.preventDefault();
          handleDownload();
        } else if (event.key === ',') {
          event.preventDefault();
          if (isModalOpen) {
            closeModal();
          } else {
            openModal();
          }
        }

        if (newFontSize !== fontSize) {
          setFontSize(newFontSize);
        }
      } else if (event.key === 'F1') {
        event.preventDefault();
        openAboutModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fontSize, setFontSize]);

  return (
    <main
      className={getThemeClass('app-layout', theme)}
      style={{ fontSize: `${fontSize}px` }}>
      {isDevelopment && <div className="dev-mode-badge">DEV MODE</div>}
      <div className="main-container">
        <div className={getThemeClass('sidebar', theme)}>
          <button
            onClick={openAboutModal}
            className={getThemeClass('settings-button', theme)}
            title="About">
            <Info className="icon-lg" />
          </button>
          <button
            onClick={openModal}
            className={getThemeClass('settings-button', theme)}
            title="Settings">
            <Settings className="icon-lg" />
          </button>
        </div>

        <div className="content-area">
          <div
            className="container"
            ref={containerRef}
            style={
              {
                '--left-panel-height': `${leftPanelWidth}%`,
                '--right-panel-height': `${100 - leftPanelWidth}%`,
              } as React.CSSProperties
            }>
            <div
              className="editor-section"
              style={{
                width: !isMobile ? `${leftPanelWidth}%` : '100%',
                height: isMobile ? `${leftPanelWidth}%` : '100%',
              }}>
              <div className={getThemeClass('editor-header', theme)}>
                <div className="editor-actions-left">
                  <button
                    onClick={handleUndo}
                    className={getThemeClass('action-button', theme)}
                    title="Undo"
                    disabled={!canUndo}>
                    <Undo2 className="icon-sm" />
                  </button>
                  <button
                    onClick={handleRedo}
                    className={getThemeClass('action-button', theme)}
                    title="Redo"
                    disabled={!canRedo}>
                    <Redo2 className="icon-sm" />
                  </button>
                  <button
                    onClick={handleClear}
                    className={getThemeClass('action-button', theme)}
                    title="Clear All"
                    disabled={inputString === ''}>
                    <Eraser className="icon-sm" />
                  </button>
                </div>
                <div className="editor-actions-right">
                  <button
                    onClick={handleLoadFile}
                    className={getThemeClass('action-button', theme)}
                    title="Load JSON File">
                    <FolderOpen className="icon-sm" />
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
                  loading=""
                  onMount={editor => {
                    editorRef.current = editor;
                    updateUndoRedoState();
                    editor.onDidChangeModelContent(() => {
                      setTimeout(updateUndoRedoState, TIMING.UNDO_REDO_UPDATE_DELAY);
                    });
                  }}
                  options={{
                    ...getCommonEditorOptions(fontSize),
                    folding: false,
                    showFoldingControls: 'never',
                  }}
                />
              </div>
            </div>

            <div
              className={getThemeClass('splitter', theme, isResizing ? 'resizing' : '')}
              onMouseDown={handleMouseDown}
            />

            <div
              className="editor-section"
              style={{
                width: !isMobile ? `${100 - leftPanelWidth}%` : '100%',
                height: isMobile ? `${100 - leftPanelWidth}%` : '100%',
              }}>
              <div className={getThemeClass('editor-header', theme)}>
                <div className="editor-actions-left">
                  <button
                    onClick={handleCopy}
                    className={getThemeClass('copy-button', theme, isCopied ? 'copied' : '')}
                    title={isCopied ? 'Copied!' : 'Copy to Clipboard'}
                    disabled={formattedString === ''}>
                    {isCopied ? <Check className="icon-sm" /> : <Copy className="icon-sm" />}
                  </button>
                </div>
                <div className="editor-actions-right">
                  <button
                    onClick={handleDownload}
                    className={getThemeClass('action-button', theme)}
                    title="Download JSON"
                    disabled={formattedString === '' || isError}>
                    <Download className="icon-sm" />
                  </button>
                </div>
              </div>
              <div className={`output ${isError ? 'error' : ''}`}>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme={theme}
                  value={formattedString}
                  loading=""
                  options={{
                    ...getCommonEditorOptions(fontSize),
                    readOnly: true,
                    folding: true,
                    showFoldingControls: 'mouseover',
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
        theme={theme}
        isSmallText={true}>
        <div className="modal-settings-content">
          <div className="about-content">
            <div className="app-info">
              <h3>JSON Prettier</h3>
              <p className="version">Version 0.1.1</p>
              <p className="description compact">
                Transform messy JSON into beautifully organized format with customizable styling
                options.
              </p>
            </div>

            <div className="usage-tips">
              <h4>How to Use</h4>
              <p className="compact">
                Paste JSON in the left panel to see formatted result on the right. Customize
                settings as needed.
              </p>
            </div>

            <div className="keyboard-shortcuts">
              <h4>Keyboard Shortcuts</h4>
              <div className="shortcuts-grid">
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">=</span>
                  </span>
                  <span className="shortcut-desc">Increase Font Size</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">-</span>
                  </span>
                  <span className="shortcut-desc">Decrease Font Size</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">Shift</span>
                    <span className="shortcut-key">C</span>
                  </span>
                  <span className="shortcut-desc">Copy to Clipboard</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">Shift</span>
                    <span className="shortcut-key">X</span>
                  </span>
                  <span className="shortcut-desc">Clear All</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">N</span>
                  </span>
                  <span className="shortcut-desc">New Document</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">O</span>
                  </span>
                  <span className="shortcut-desc">Open File</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">S</span>
                  </span>
                  <span className="shortcut-desc">Save File</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">⌘/Ctrl</span>
                    <span className="shortcut-key">,</span>
                  </span>
                  <span className="shortcut-desc">Open Settings</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">F1</span>
                  </span>
                  <span className="shortcut-desc">About</span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-keys">
                    <span className="shortcut-key">Esc</span>
                  </span>
                  <span className="shortcut-desc">Close Modal</span>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button
                className="action-link-button github-button"
                onClick={() => openUrl('https://github.com/rebase/json-prettier')}
                title="View on GitHub">
                <Github className="icon-lg" />
              </button>
              <button
                className="action-link-button bug-button"
                onClick={() => openUrl('https://github.com/rebase/json-prettier/issues')}
                title="Report Bug">
                <Bug className="icon-lg" />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        theme={theme}
        isSmallText={true}>
        <div className="modal-settings-content">
          <h2>Settings</h2>
          <div className="setting-item">
            <label htmlFor="font-size-select">Font Size</label>
            <select
              id="font-size-select"
              value={fontSize}
              onChange={handleFontSizeChange}>
              {FONT_SIZES.map(size => (
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
                {INDENT_WIDTH_OPTIONS.map(width => (
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
      />
    </main>
  );
}

export default App;
