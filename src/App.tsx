import Editor from '@monaco-editor/react';
import {invoke} from '@tauri-apps/api/core';
import {useState} from 'react';
import './App.css';

function App() {
  const [formattedString, setFormattedString] = useState('');
  const [isError, setIsError] = useState(false);
  const [inputString, setInputString] = useState('');

  const formatString = async (value: string | undefined) => {
    const currentVal = value || '';
    setInputString(currentVal);

    if (currentVal.trim() === '') {
      setFormattedString('');
      setIsError(false);
      return;
    }
    try {
      const result = await invoke('format_json_string', {jsonString: currentVal});
      setFormattedString(result as string);
      setIsError(false);
    } catch (error) {
      setFormattedString(error as string);
      setIsError(true);
    }
  };

  return (
    <main className="container">
      <div className="input editor-wrapper">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-light"
          value={inputString}
          onChange={formatString}
          options={{
            minimap: {enabled: false},
            fontSize: 14,
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
          theme="vs-light"
          value={formattedString}
          options={{
            readOnly: true,
            minimap: {enabled: false},
            fontSize: 14,
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
    </main>
  );
}

export default App;
