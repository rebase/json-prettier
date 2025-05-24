import {invoke} from '@tauri-apps/api/core';
import {useState} from 'react';
import './App.css';

function App() {
  const [formattedString, setFormattedString] = useState('');

  const formatString = async (string: string) => {
    if (string.trim() === '') {
      setFormattedString('');
      return;
    }
    try {
      setFormattedString(await invoke('format_json_string', {jsonString: string}));
    } catch (error) {
      setFormattedString(error as string);
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
        className="output"
        placeholder="Formatted JSON string will appear here"
        value={formattedString}
        readOnly
      />
    </main>
  );
}

export default App;
