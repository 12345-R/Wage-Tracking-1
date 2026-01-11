
import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user
const supabaseUrl = 'https://itdjyhnovfhpbfajrudk.supabase.co';
const supabaseAnonKey = 'sb_publishable_MFMDVpTM_8ze1YxPWkq4Bg_M8PNal0d';

// Initialize the client with verified values
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Always true now that we have the credentials
export const isConfigured = true;
