import {invoke} from '@tauri-apps/api/core';
import {useState} from 'react';
import './App.css';

function App() {
  const [formattedString, setFormattedString] = useState('');
  const [isError, setIsError] = useState(false);

  const formatString = async (string: string) => {
    if (string.trim() === '') {
      setFormattedString('');
      setIsError(false);
      return;
    }
    try {
      const result = await invoke('format_json_string', {jsonString: string});
      setFormattedString(result as string);
      setIsError(false);
    } catch (error) {
      setFormattedString(error as string);
      setIsError(true);
    }
  };

  return (
    <main className="container">
      <textarea
        className="input"
        placeholder="Put your JSON string here"
        onChange={e => formatString(e.target.value)}
      />
      <textarea
        className={`output ${isError ? 'error' : ''}`}
        placeholder="Formatted JSON string will appear here"
        value={formattedString}
        readOnly
      />
    </main>
  );
}

export default App;
