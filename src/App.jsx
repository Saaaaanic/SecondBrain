import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Your ngrok URL pointing to your n8n webhook
const N8N_WEBHOOK_URL = 'https://YOUR_NGROK_ID.ngrok-free.app/webhook/YOUR_WEBHOOK_PATH';

function App() {
  const [entries, setEntries] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [telegramUserId, setTelegramUserId] = useState('local-dev-user'); // Fallback for testing

  useEffect(() => {
    // Tell Telegram the app is ready and grab the user ID
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand(); // Opens the app in full screen

      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user) {
        setTelegramUserId(user.id.toString());
      }
    }
    fetchEntries();
  }, [telegramUserId]);

  // Fetch your Second Brain entries from Supabase
  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('telegram_user_id', telegramUserId)
      .order('created_at', { ascending: false });

    if (!error && data) setEntries(data);
  };

  // Send new thought to n8n Webhook
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText) return;

    setIsLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_input: inputText,
          telegram_user_id: telegramUserId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Clear input and immediately add the AI-processed entry to the top of the list
        setInputText('');
        setEntries(prev => [result.entry, ...prev]);
      }
    } catch (error) {
      console.error("Failed to dump RAM:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🧠 Mental RAM Cleaner</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="What's on your mind?"
          style={{ width: '100%', height: '100px', marginBottom: '10px' }}
        />
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px' }}>
          {isLoading ? 'Processing via AI...' : 'Dump to Second Brain'}
        </button>
      </form>

      <h3>Recent Entries</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.map(entry => (
          <div key={entry.id} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>
              {entry.category?.toUpperCase() || 'NOTE'}
            </span>
            <p style={{ margin: '10px 0' }}>{entry.ai_summary || entry.raw_input}</p>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Tags: {entry.tags ? entry.tags.join(', ') : 'None'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;