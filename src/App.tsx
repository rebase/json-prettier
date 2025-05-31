import Editor, { OnChange } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';
import {
  Check,
  Copy,
  Download,
  Eraser,
  FolderOpen,
  Info,
  Redo2,
  Settings,
  Undo2,
} from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import './App.css';
import { AboutModal, ConfirmModal, SettingsModal } from './components/Modals';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  AppData,
  DEFAULT_SETTINGS,
  getCommonEditorOptions,
  getSystemTheme,
  getThemeClass,
  isDevelopment,
  TIMING,
} from './utils/constants';
import {
  copyToClipboard,
  downloadFile,
  formatString,
  loadFile,
  performRedo,
  performUndo,
  updateUndoRedoState,
} from './utils/editorUtils';

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
        setLeftPanelWidth(appData.settings.editor_panel_width);

        setInputString(appData.last_json_input);

        if (appData.last_json_input.trim() !== '') {
          handleEditorFormatString(appData.last_json_input, {
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
              editor_panel_width: leftPanelWidth,
            },
          },
        });
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    };

    const timeoutId = setTimeout(saveData, TIMING.SAVE_DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [inputString, fontSize, theme, indentType, indentWidth, leftPanelWidth]);

  const handleEditorFormatString = async (
    textValue?: string,
    optionsOverride?: { indentType?: 'space' | 'tab'; indentWidth?: number },
  ) => {
    const currentText = textValue === undefined ? inputString : textValue;
    const finalIndentType = optionsOverride?.indentType || indentType;
    const finalIndentWidth = optionsOverride?.indentWidth || indentWidth;

    const { result, isError } = await formatString(currentText, finalIndentType, finalIndentWidth);
    setFormattedString(result);
    setIsError(isError);
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
    handleEditorFormatString(inputString, { indentType: newIndentType, indentWidth });
  };

  const handleIndentWidthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newWidth = Number(event.target.value);
    setIndentWidth(newWidth);
    if (indentType === 'space') {
      handleEditorFormatString(inputString, { indentType: indentType, indentWidth: newWidth });
    }
  };

  const handleEditorChange: OnChange = value => {
    setInputString(value || '');
    handleEditorFormatString(value, { indentType: indentType, indentWidth: indentWidth });

    setTimeout(
      () => updateUndoRedoState(editorRef, setCanUndo, setCanRedo),
      TIMING.UNDO_REDO_UPDATE_DELAY,
    );
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
      setLeftPanelWidth(50);
      setIsError(false);

      if (inputString.trim() !== '') {
        handleEditorFormatString(inputString, {
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
    const success = await copyToClipboard(formattedString);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), TIMING.COPY_RESET_DELAY);
    }
  };

  const handleDownload = async () => {
    if (!formattedString || isError) {
      return;
    }
    await downloadFile(formattedString);
  };

  const handleUndo = () => {
    performUndo(editorRef, canUndo, setCanUndo, setCanRedo);
  };

  const handleRedo = () => {
    performRedo(editorRef, canRedo, setCanUndo, setCanRedo);
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
    const fileContent = await loadFile();
    if (fileContent !== null) {
      setInputString(fileContent);
      handleEditorFormatString(fileContent, { indentType: indentType, indentWidth: indentWidth });
      setTimeout(
        () => updateUndoRedoState(editorRef, setCanUndo, setCanRedo),
        TIMING.UNDO_REDO_UPDATE_DELAY,
      );
    }
  };

  useKeyboardShortcuts({
    fontSize,
    setFontSize,
    isModalOpen,
    isAboutModalOpen,
    isResetConfirmOpen,
    openModal,
    closeModal,
    openAboutModal,
    closeAboutModal,
    setIsResetConfirmOpen,
    handleCopy,
    handleClear,
    handleLoadFile,
    handleDownload,
  });

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
                    updateUndoRedoState(editorRef, setCanUndo, setCanRedo);
                    editor.onDidChangeModelContent(() => {
                      setTimeout(
                        () => updateUndoRedoState(editorRef, setCanUndo, setCanRedo),
                        TIMING.UNDO_REDO_UPDATE_DELAY,
                      );
                    });
                  }}
                  options={{
                    ...getCommonEditorOptions(fontSize),
                    folding: false,
                    showFoldingControls: 'never',
                    lineNumbers: 'off',
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

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={closeAboutModal}
        theme={theme}
      />

      <SettingsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        theme={theme}
        fontSize={fontSize}
        indentType={indentType}
        indentWidth={indentWidth}
        onFontSizeChange={handleFontSizeChange}
        onThemeChange={handleThemeChange}
        onIndentTypeChange={handleIndentTypeChange}
        onIndentWidthChange={handleIndentWidthChange}
        onResetSettings={() => setIsResetConfirmOpen(true)}
      />

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
