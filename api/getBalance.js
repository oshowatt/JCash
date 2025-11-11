import { supabase } from '../config/supabaseClient';

export default async function handler(req, res) {
    const userId = 1; // Example: replace with actual user ID from auth system

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

        if (error) throw error;

        res.status(200).json({ balance: user.balance });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch balance', details: error.message });
    }
}
