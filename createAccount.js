const supabaseClient = window.supabaseClient;

async function submitCreateAccount() {
  const phoneNumber = document.getElementById("phoneNumber").value;
  const username = document.getElementById("username").value || null;
  const role = document.getElementById("roleSelect").value || 'user';

  if (!phoneNumber || phoneNumber.length < 10) {
    return alert("Please enter a valid phone number.");
  }

  if (!supabaseClient) {
    return alert("Supabase client not available.");
  }

  try {
    const { data: user, error: userErr } = await supabaseClient
      .from('users')
      .insert([{ phone_number: phoneNumber, username, role }])
      .select('id')
      .maybeSingle();

    if (userErr || !user) {
      alert("Error creating user: " + (userErr?.message || 'unknown'));
      if (userErr) console.error("Error creating user:", userErr);
      return;
    }

    const { error: acctErr } = await supabaseClient
      .from('accounts')
      .insert({ user_id: user.id });

    if (acctErr) {
      alert("User created, but account creation failed: " + acctErr.message);
      console.error("Account creation error:", acctErr);
      return;
    }

    alert("Account created successfully!");
    window.location.href = 'index.html';
  } catch (error) {
    console.error(error);
    alert("An error occurred during account creation.");
  }
}

