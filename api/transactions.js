// /api/transactions.js
import { supabase } from '../../config/supabaseClient';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins, change if needed
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight request (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();  // Preflight request, return a successful response
        return;
    }

    // Handle POST requests for transactions
    if (req.method === 'POST') {
        const { transactionType, amount } = req.body;

        try {
            // Insert the transaction into the database
            const { data, error } = await supabase
                .from('transactions')
                .insert([{ transactionType, amount }]);

            if (error) {
                throw new Error(error.message);  // Throws error to be caught in catch block
            }

            // Return success response with data
            res.status(200).json({ success: true, data });
        } catch (error) {
            // Log the error and return an error message
            console.error('Transaction error:', error);
            res.status(500).json({ success: false, error: 'Transaction failed', details: error.message });
        }
    }
}
