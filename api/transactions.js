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

    // Your regular API logic for POST requests
    if (req.method === 'POST') {
        const { transactionType, amount } = req.body;

        // Example transaction processing logic
        try {
            const response = await supabase.from('transactions').insert({ transactionType, amount });
            res.status(200).json({ success: true, data: response });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
