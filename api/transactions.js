import { supabase } from '../config/supabaseClient';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { transactionType, amount } = req.body;
        const userId = 1; // Example: replace with actual user ID from auth system

        try {
            // Simulate transaction logic: debit/credit balance
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            const newBalance = transactionType === 'top-up' 
                ? user.balance + amount 
                : user.balance - amount;

            // Update user balance
            const { error: updateError } = await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Log the transaction in ledger_entries table
            const { error: ledgerError } = await supabase
                .from('ledger_entries')
                .insert({
                    transaction_type: transactionType,
                    amount,
                    balance: newBalance,
                    user_id: userId,
                });

            if (ledgerError) throw ledgerError;

            res.status(200).json({ message: 'Transaction successful' });
        } catch (error) {
            res.status(500).json({ error: 'Transaction failed', details: error.message });
        }
    }
}
