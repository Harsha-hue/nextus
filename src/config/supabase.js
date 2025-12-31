const { createClient } = require('@supabase/supabase-js');
const config = require('./environment');

// Create Supabase client with service role key for backend operations
const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Create Supabase client with anon key for user-facing operations
const supabaseClient = createClient(
    config.supabase.url,
    config.supabase.anonKey
);

module.exports = {
    supabase,
    supabaseClient,
};
