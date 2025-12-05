let balance = 0;
const balanceDisplay = document.getElementById("balance");
const list = document.getElementById("transactionList");
const historyList = document.getElementById("historyList");
const overlay = document.getElementById("modalOverlay");
const userNameDisplay = document.getElementById("userNameDisplay");
const refundSelect = document.getElementById("refundSource");
const merchantSelect = document.getElementById("merchantSelect");
const supabase = window.supabaseClient;
const getStoredUser = window.getStoredUser;
const clearStoredUser = window.clearStoredUser;

let storedUser = getStoredUser ? getStoredUser() : null;
let accountId = storedUser?.account_id || null;
const isMerchant = storedUser?.role === 'merchant';
let accountLabels = {};

function ensureLoggedIn() {
  if (!storedUser || !accountId) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function setUserName() {
  if (!userNameDisplay) return;
  if (storedUser && storedUser.username) {
    userNameDisplay.textContent = storedUser.username;
  }
}

function applyTheme() {
  const body = document.body;
  body.classList.remove('theme-user', 'theme-merchant');
  if (storedUser?.role === 'merchant') {
    body.classList.add('theme-merchant');
  } else {
    body.classList.add('theme-user');
  }
}

function configureActions() {
  if (isMerchant) {
    const hideIds = ['btnTopUp', 'btnTransfer', 'btnBuy'];
    hideIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  return d.toLocaleString();
}

function formatAmount(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function directionForTx(tx) {
  if (!tx) return 'out';
  switch (tx.type) {
    case 'top_up':
      return 'in';
    case 'buy':
      return tx.actor_account === accountId ? 'out' : 'in';
    case 'transfer':
      return tx.actor_account === accountId ? 'out' : 'in';
    case 'refund':
      // actor receives, counterparty pays
      return tx.actor_account === accountId ? 'in' : 'out';
    default:
      return 'out';
  }
}

function accountLabel(id) {
  if (!id) return 'Account';
  if (id === accountId && storedUser?.username) return storedUser.username;
  return accountLabels[id] || 'User';
}

function otherAccountForRefund(tx) {
  if (!tx) return null;
  return tx.actor_account === accountId ? tx.counterparty_account : tx.actor_account;
}

function transactionLabel(tx) {
  if (!tx) return '';
  if (tx.type === 'transfer') {
    const fromLabel = accountLabel(tx.actor_account);
    const toLabel = accountLabel(tx.counterparty_account);
    if (tx.actor_account === accountId) {
      return `Transfer to ${toLabel}`;
    }
    return `Transfer from ${fromLabel} to ${toLabel}`;
  }
  if (tx.type === 'refund') {
    if (tx.actor_account === accountId) {
      return `Refund from ${accountLabel(tx.counterparty_account)}`;
    }
    return `Refund to ${accountLabel(tx.actor_account)}`;
  }
  if (tx.type === 'buy') {
    if (tx.counterparty_account === accountId) {
      return `Purchase from ${accountLabel(tx.actor_account)}`;
    }
    return tx.description || `Purchase from ${accountLabel(tx.counterparty_account)}`;
  }
  if (tx.type === 'top_up') {
    return 'Top Up';
  }
  return tx.description || tx.type;
}

async function loadBalanceFromDb() {
  if (!ensureLoggedIn()) return;
  if (!supabase) {
    console.error('Supabase client not available.');
    return;
  }

  const { data, error } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching balance:', error);
    return;
  }

  balance = Number(data?.balance) || 0;
  updateUI();
}

async function loadTransactions() {
  if (!ensureLoggedIn()) return;
  if (!supabase) return console.error('Supabase client not available.');

  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount, description, created_at, actor_account, counterparty_account')
    .or(`actor_account.eq.${accountId},counterparty_account.eq.${accountId}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error loading transactions:', error);
    return;
  }

  const accountIds = Array.from(new Set(data.flatMap(tx => [tx.actor_account, tx.counterparty_account].filter(Boolean))));
  if (accountIds.length) {
    const { data: acctData, error: acctErr } = await supabase
      .from('accounts')
      .select('id, user_id, users(username, phone_number)')
      .in('id', accountIds);
    if (acctErr) {
      console.error('Error loading account labels:', acctErr);
    } else {
      acctData.forEach(a => {
        const label = a.users?.username || a.users?.phone_number || a.id;
        accountLabels[a.id] = label;
      });
    }
  }

  renderTransactionLists(data);
  renderRefundOptions(data);
}

async function loadMerchants() {
  if (!supabase || !merchantSelect) return;
  const { data, error } = await supabase
    .from('users')
    .select('id, username, phone_number')
    .eq('role', 'merchant')
    .order('username', { ascending: true });
  if (error) {
    console.error('Error loading merchants:', error);
    return;
  }
  merchantSelect.innerHTML = '';
  if (!data || !data.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No merchants available';
    merchantSelect.appendChild(opt);
    merchantSelect.disabled = true;
    return;
  }
  merchantSelect.disabled = false;
  data.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.username || m.phone_number || `Merchant ${m.id}`;
    opt.dataset.userId = m.id;
    merchantSelect.appendChild(opt);
  });
}

async function callWalletAction(type, amount, description, counterpartyAccount = null, originalTxId = null, actorOverride = null) {
  if (!ensureLoggedIn()) return;
  if (!supabase) return alert('Supabase not available.');
  if (!amount || amount <= 0) return alert('Enter a valid amount.');

  const actorAccount = actorOverride || accountId;

  const { error } = await supabase.rpc('rpc_wallet_action', {
    p_type: type,
    p_actor_account: actorAccount,
    p_counterparty_account: counterpartyAccount,
    p_amount: amount,
    p_description: description,
    p_original_transaction_id: originalTxId
  });

  if (error) {
    console.error('Wallet action failed:', error);
    alert(error.message || 'Action failed');
    return;
  }

  await loadBalanceFromDb();
  await loadTransactions();
}

async function logoutUser() {
  try {
    if (supabase && supabase.auth && supabase.auth.signOut) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.error('Error signing out of Supabase:', err);
  }

  if (clearStoredUser) {
    clearStoredUser();
  }

  window.location.href = 'login.html';
}

function updateUI() {
  balanceDisplay.textContent = '\u20b1' + formatAmount(balance);
}

function addTransaction(name, amount, direction, createdAt, targetList = list) {
  const div = document.createElement("div");
  div.classList.add("transaction-item");

  div.innerHTML = `
    <div class="tx-row">
      <span>${name}</span>
      <span class="tx-date">${formatDate(createdAt)}</span>
    </div>
    <span class="${direction === 'in' ? 'green' : 'red'}">${direction === 'in' ? '+' : '-'}\u20b1${formatAmount(amount)}</span>
  `;

  targetList?.appendChild(div);
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
  overlay.classList.remove("hidden");
}

function closeModal() {
  overlay.classList.add("hidden");
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

async function submitTopUp() {
  if (isMerchant) return alert('Merchants cannot top up here.');
  const amount = parseFloat(document.getElementById("topupAmount").value);
  if (!amount || amount <= 0) return alert("Enter valid amount");
  await callWalletAction('top_up', amount, "Top Up");
  closeModal();
}

async function getUserByPhone(phone) {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, phone_number')
    .eq('phone_number', phone)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getAccountByUserId(userId) {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function submitTransfer() {
  if (isMerchant) return alert('Merchants cannot transfer.');
  const userPhone = document.getElementById("transferUser").value;
  const amount = parseFloat(document.getElementById("transferAmount").value);
  if (!userPhone || !amount || amount <= 0) return alert("Invalid inputs");
  if (!ensureLoggedIn()) return;

  try {
    const recipient = await getUserByPhone(userPhone);
    if (!recipient) return alert("Recipient not found.");

    const recipientAccount = await getAccountByUserId(recipient.id);
    if (!recipientAccount) return alert("Recipient has no account.");

    const label = recipient.username || recipient.phone_number || 'Recipient';
    await callWalletAction('transfer', amount, `Transfer to ${label}`, recipientAccount.id);
    closeModal();
  } catch (err) {
    console.error('Transfer failed:', err);
    alert("Transfer failed. Please try again.");
  }
}

async function submitBuy() {
  if (isMerchant) return alert('Merchants cannot buy from this screen.');
  const merchantUserId = merchantSelect ? merchantSelect.value : '';
  const amount = parseFloat(document.getElementById("buyAmount").value);
  if (!merchantUserId || !amount || amount <= 0) return alert("Invalid inputs");
  if (!ensureLoggedIn()) return;

  try {
    const merchantAccount = await getAccountByUserId(merchantUserId);
    if (!merchantAccount) return alert("Merchant has no account.");

    let label = 'Merchant';
    if (merchantSelect) {
      const opt = merchantSelect.selectedOptions[0];
      if (opt) label = opt.textContent;
    }
    await callWalletAction('buy', amount, `Purchase from ${label}`, merchantAccount.id);
    closeModal();
  } catch (err) {
    console.error('Buy failed:', err);
    alert("Purchase failed. Please try again.");
  }
}

async function submitRefund() {
  const note = document.getElementById("refundNote").value || 'Refund';
  if (!refundSelect || !refundSelect.value) return alert("Select a transaction to refund.");
  if (!ensureLoggedIn()) return;

  const selectedTxId = refundSelect.value;
  const selectedTxAmount = parseFloat(refundSelect.dataset.amount || '0');
  const otherAccount = refundSelect.dataset.otheraccount || null;
  if (!otherAccount) return alert("Only the receiver can initiate this refund.");

  try {
    // actor = buyer (other account), counterparty = current (merchant)
    await callWalletAction('refund', selectedTxAmount, `${note} (refund of ${selectedTxId})`, accountId, selectedTxId, otherAccount);
    closeModal();
  } catch (err) {
    console.error('Refund failed:', err);
    alert("Refund failed. Please try again.");
  }
}

function renderRefundOptions(txList) {
  if (!refundSelect) return;
  refundSelect.innerHTML = '';

  const refundable = txList.filter(tx => tx.counterparty_account === accountId && (tx.type === 'transfer' || tx.type === 'buy'));
  if (refundable.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No refundable transactions';
    refundSelect.appendChild(opt);
    refundSelect.disabled = true;
    refundSelect.dataset.amount = '';
    refundSelect.dataset.otheraccount = '';
    return;
  }

  refundSelect.disabled = false;
  let firstUsable = null;
  refundable.forEach(tx => {
    const opt = document.createElement('option');
    const otherAccount = otherAccountForRefund(tx);
    opt.value = tx.id;
    opt.textContent = `${transactionLabel(tx)} — \u20b1${formatAmount(tx.amount)} — ${formatDate(tx.created_at)}`;
    opt.dataset.amount = tx.amount;
    opt.dataset.otheraccount = otherAccount || '';
    if (!firstUsable) firstUsable = opt;
    refundSelect.appendChild(opt);
  });

  if (firstUsable) {
    refundSelect.value = firstUsable.value;
    refundSelect.dataset.amount = firstUsable.dataset.amount;
    refundSelect.dataset.otheraccount = firstUsable.dataset.otheraccount;
  } else {
    refundSelect.value = '';
    refundSelect.dataset.amount = '';
    refundSelect.dataset.otheraccount = '';
    refundSelect.disabled = true;
  }
}

function renderTransactionLists(txList) {
  if (list) list.innerHTML = '';
  if (historyList) historyList.innerHTML = '';

  const recent = txList.slice(0, 3);
  recent.forEach(tx => {
    const direction = directionForTx(tx);
    addTransaction(transactionLabel(tx), tx.amount, direction, tx.created_at, list);
  });

  txList.forEach(tx => {
    const direction = directionForTx(tx);
    addTransaction(transactionLabel(tx), tx.amount, direction, tx.created_at, historyList || list);
  });
}

setUserName();
applyTheme();
if (ensureLoggedIn()) {
  configureActions();
  loadBalanceFromDb();
  loadTransactions();
  loadMerchants();
}
updateUI();











