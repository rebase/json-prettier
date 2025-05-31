export const darkThemes = ['vs-dark', 'hc-black'];
export const isDevelopment = import.meta.env.DEV;

export const getThemeClass = (
  baseClass: string,
  theme: string,
  additionalClasses: string = '',
): string => {
  const isDarkTheme = darkThemes.includes(theme);
  const darkClass = isDarkTheme ? 'dark-theme' : '';
  return [baseClass, darkClass, additionalClasses].filter(Boolean).join(' ');
};

export const getCommonEditorOptions = (fontSize: number) => ({
  minimap: { enabled: false },
  fontSize: fontSize,
  wordWrap: 'off' as const,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderLineHighlight: 'none' as const,
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

export const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'vs-dark';
  }
  return 'vs-light';
};

export const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

export const INDENT_WIDTH_OPTIONS = [1, 2, 3, 4, 6, 8];

export const DEFAULT_SETTINGS = {
  fontSize: 14,
  indentType: 'space' as 'space' | 'tab',
  indentWidth: 4,
} as const;

export const TIMING = {
  COPY_RESET_DELAY: 2000,
  SAVE_DEBOUNCE_DELAY: 500,
  UNDO_REDO_UPDATE_DELAY: 100,
} as const;

export interface AppSettings {
  indent_type: string;
  indent_width: number;
  theme: string;
  font_size: number;
  editor_panel_width: number;
}

export interface AppData {
  last_json_input: string;
  settings: AppSettings;
}
