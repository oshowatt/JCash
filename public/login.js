const supabase = window.supabaseClient;
const getStoredUser = window.getStoredUser;
const setStoredUser = window.setStoredUser;

if (!supabase) {
  console.error('Supabase client not initialized. Check supabaseClient.js and CDN order.');
} else {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      window.location.href = 'index.html';
    }
  });

  // Initial check so we do not bounce logged-in users back to login
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Error reading session:', error);
      return;
    }
    if (data.session) {
      window.location.href = 'index.html';
      return;
    }
    if (getStoredUser && getStoredUser()) {
      window.location.href = 'index.html';
    }
  });
}

async function submitLogin() {
  const phoneNumber = document.getElementById("loginPhoneNumber").value;

  if (!phoneNumber || phoneNumber.length < 10) {
    return alert("Please enter a valid phone number.");
  }

  if (!supabase) {
    return alert("Supabase client not available.");
  }

  // Lookup user by phone
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, phone_number, role')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (error || !user) {
    alert("User not found.");
    if (error) console.error(error);
    return;
  }

  // Fetch or create account for this user
  let accountId = null;
  const { data: acct } = await supabase
    .from('accounts')
    .select('id, balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (acct) {
    accountId = acct.id;
  } else {
    const { data: newAcct, error: acctErr } = await supabase
      .from('accounts')
      .insert({ user_id: user.id })
      .select('id')
      .maybeSingle();
    if (acctErr || !newAcct) {
      alert("Could not create account for this user.");
      if (acctErr) console.error(acctErr);
      return;
    }
    accountId = newAcct.id;
  }

  alert("Logged in successfully!");
  if (setStoredUser) {
    setStoredUser({
      id: user.id,
      phone_number: user.phone_number,
      username: user.username || phoneNumber,
      role: user.role,
      account_id: accountId
    });
  }
  window.location.href = 'index.html';
}

async function submitLoginByUsername() {
  const username = document.getElementById("loginUsername").value;

  if (!username) {
    return alert("Please enter a username.");
  }

  if (!supabase) {
    return alert("Supabase client not available.");
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, phone_number, role')
    .eq('username', username)
    .maybeSingle();

  if (error || !user) {
    alert("User not found.");
    if (error) console.error(error);
    return;
  }

  // Fetch or create account for this user
  let accountId = null;
  const { data: acct } = await supabase
    .from('accounts')
    .select('id, balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if (acct) {
    accountId = acct.id;
  } else {
    const { data: newAcct, error: acctErr } = await supabase
      .from('accounts')
      .insert({ user_id: user.id })
      .select('id')
      .maybeSingle();
    if (acctErr || !newAcct) {
      alert("Could not create account for this user.");
      if (acctErr) console.error(acctErr);
      return;
    }
    accountId = newAcct.id;
  }

  alert("Logged in successfully!");
  if (setStoredUser) {
    setStoredUser({
      id: user.id,
      phone_number: user.phone_number,
      username: user.username || username,
      role: user.role,
      account_id: accountId
    });
  }
  window.location.href = 'index.html';
}
