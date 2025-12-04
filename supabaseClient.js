// Declare Supabase URL and anonymous key
const SUPABASE_URL = 'https://fndmnwwaarvmquumfaci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZG1ud3dhYXJ2bXF1dW1mYWNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3Njg5MDEsImV4cCI6MjA4MDM0NDkwMX0.5UQvkmnCz4dLqBy0Kh4txwL1MQ-wdavh3C2IMMj38SM';

// Initialize a single Supabase client and expose helpers
if (!window.supabase) {
  console.error('Supabase SDK not loaded. Check the CDN script tag.');
} else {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabaseClient = client;

  // Lightweight local "session" for demo logins (no real auth)
  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem('jcUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error reading local user:', e);
      return null;
    }
  };

  const setStoredUser = (user) => {
    try {
      localStorage.setItem('jcUser', JSON.stringify(user));
    } catch (e) {
      console.error('Error saving local user:', e);
    }
  };

  const clearStoredUser = () => {
    try {
      localStorage.removeItem('jcUser');
    } catch (e) {
      console.error('Error clearing local user:', e);
    }
  };

  window.getStoredUser = getStoredUser;
  window.setStoredUser = setStoredUser;
  window.clearStoredUser = clearStoredUser;

  // Helper you can call on pages that require authentication
  window.requireAuth = async () => {
    const localUser = getStoredUser();
    if (localUser) return { user: localUser };

    const { data, error } = await client.auth.getSession();
    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }
    if (!data.session) {
      window.location.href = 'login.html';
      return null;
    }
    return data.session;
  };
}
