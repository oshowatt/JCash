// Lost Update Test
async function testLostUpdate() {
    const response1 = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionType: 'top-up', amount: 100 }),
    });

    const response2 = await fetch('/api/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionType: 'top-up', amount: 50 }),
    });
}
