import { openUrl } from '@tauri-apps/plugin-opener';
import { Bug, Github } from 'lucide-react';
import { ChangeEvent } from 'react';

const getThemeClass = (
  baseClass: string,
  theme: string,
  additionalClasses: string = '',
): string => {
  const darkThemes = ['vs-dark', 'hc-black'];
  const isDarkTheme = darkThemes.includes(theme);
  const darkClass = isDarkTheme ? 'dark-theme' : '';
  return [baseClass, darkClass, additionalClasses].filter(Boolean).join(' ');
};

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

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  fontSize: number;
  indentType: 'space' | 'tab';
  indentWidth: number;
  onFontSizeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onThemeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onIndentTypeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onIndentWidthChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onResetSettings: () => void;
}

const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];
const INDENT_WIDTH_OPTIONS = [1, 2, 3, 4, 6, 8];

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, theme, isSmallText }) => {
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

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
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

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, theme }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      isSmallText={true}>
      <div className="modal-settings-content">
        <div className="about-content">
          <div className="app-info">
            <h3>JSON Prettier</h3>
            <p className="version">Version 0.1.3</p>
            <p className="description compact">
              Transform messy JSON into beautifully organized format with customizable styling
              options.
            </p>
          </div>

          <div className="usage-tips">
            <h4>How to Use</h4>
            <p className="compact">
              Paste JSON in the left panel to see formatted result on the right. Customize settings
              as needed.
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
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  fontSize,
  indentType,
  indentWidth,
  onFontSizeChange,
  onThemeChange,
  onIndentTypeChange,
  onIndentWidthChange,
  onResetSettings,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      theme={theme}
      isSmallText={true}>
      <div className="modal-settings-content">
        <h2>Settings</h2>
        <div className="setting-item">
          <label htmlFor="font-size-select">Font Size</label>
          <select
            id="font-size-select"
            value={fontSize}
            onChange={onFontSizeChange}>
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
            onChange={onThemeChange}>
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
            onChange={onIndentTypeChange}>
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
              onChange={onIndentWidthChange}>
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
            onClick={onResetSettings}
            className="reset-button reset-button-danger reset-button-full">
            Reset All Settings
          </button>
        </div>
      </div>
    </Modal>
  );
};
