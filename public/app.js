document.getElementById('topup-button').addEventListener('click', () => handleTransaction('top-up', 100));
document.getElementById('transfer-button').addEventListener('click', () => handleTransaction('transfer', 50));

const balanceElement = document.getElementById('balance');

async function fetchBalance() {
    const response = await fetch('/api/getBalance');
    const data = await response.json();
    balanceElement.innerText = data.balance;
}

async function handleTransaction(transactionType, amount) {
    const response = await fetch('https://jcash.vercel.app/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionType, amount }),
});


    const data = await response.json();
    fetchBalance();  // Update balance after transaction
}
