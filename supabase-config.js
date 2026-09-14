const SUPABASE_URL = "https://zdldffgxbnpuxlwsqtah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SWm1QkGmTh-iUWCDRbc-jA_hqrBB6Cu";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Beryl: Supabase connected!");