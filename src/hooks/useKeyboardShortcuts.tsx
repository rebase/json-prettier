import { useEffect } from 'react';
import { FONT_SIZES } from '../utils/constants';

interface UseKeyboardShortcutsProps {
  fontSize: number;
  setFontSize: (size: number) => void;
  isModalOpen: boolean;
  isAboutModalOpen: boolean;
  isResetConfirmOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  openAboutModal: () => void;
  closeAboutModal: () => void;
  setIsResetConfirmOpen: (open: boolean) => void;
  handleCopy: () => void;
  handleClear: () => void;
  handleLoadFile: () => void;
  handleDownload: () => void;
}

export const useKeyboardShortcuts = ({
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
}: UseKeyboardShortcutsProps) => {
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
  }, [
    isModalOpen,
    isAboutModalOpen,
    isResetConfirmOpen,
    closeModal,
    closeAboutModal,
    setIsResetConfirmOpen,
  ]);

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
  }, [
    fontSize,
    setFontSize,
    isModalOpen,
    openModal,
    closeModal,
    openAboutModal,
    handleCopy,
    handleClear,
    handleLoadFile,
    handleDownload,
  ]);
};
