import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { TIMING } from './constants';

export const formatString = async (
  currentText: string,
  indentType: 'space' | 'tab',
  indentWidth: number,
): Promise<{ result: string; isError: boolean }> => {
  if (currentText.trim() === '') {
    return { result: '', isError: false };
  }

  try {
    const result = await invoke('format_json_string', {
      jsonString: currentText,
      indentType: indentType,
      indentWidth: indentWidth,
    });
    return { result: result as string, isError: false };
  } catch (error) {
    return { result: error as string, isError: true };
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

export const downloadFile = async (content: string): Promise<boolean> => {
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
        content: content,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to download:', error);
    return false;
  }
};

export const loadFile = async (): Promise<string | null> => {
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
      return fileContent as string;
    }
    return null;
  } catch (error) {
    console.error('Failed to load file:', error);
    return null;
  }
};

export const updateUndoRedoState = (
  editorRef: React.RefObject<any>,
  setCanUndo: (canUndo: boolean) => void,
  setCanRedo: (canRedo: boolean) => void,
) => {
  if (editorRef.current) {
    const model = editorRef.current.getModel();
    if (model) {
      setCanUndo(model.canUndo());
      setCanRedo(model.canRedo());
    }
  }
};

export const performUndo = (
  editorRef: React.RefObject<any>,
  canUndo: boolean,
  setCanUndo: (canUndo: boolean) => void,
  setCanRedo: (canRedo: boolean) => void,
) => {
  if (editorRef.current && canUndo) {
    editorRef.current.focus();
    editorRef.current.trigger('undo', 'undo', null);

    setTimeout(
      () => updateUndoRedoState(editorRef, setCanUndo, setCanRedo),
      TIMING.UNDO_REDO_UPDATE_DELAY,
    );
  }
};

export const performRedo = (
  editorRef: React.RefObject<any>,
  canRedo: boolean,
  setCanUndo: (canUndo: boolean) => void,
  setCanRedo: (canRedo: boolean) => void,
) => {
  if (editorRef.current && canRedo) {
    editorRef.current.focus();
    editorRef.current.trigger('redo', 'redo', null);

    setTimeout(
      () => updateUndoRedoState(editorRef, setCanUndo, setCanRedo),
      TIMING.UNDO_REDO_UPDATE_DELAY,
    );
  }
};
