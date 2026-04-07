/**
 * Supabase connection for saved draws (optional).
 *
 * 1) Create project at https://supabase.com
 * 2) Run SQL from supabase-schema.sql (new project) or supabase-schema-migrate-from-v1.sql (replacing old jsonb table)
 * 3) Settings → API: copy Project URL and anon public key into the strings below
 *
 * The anon key is safe in the browser if Row Level Security only allows INSERT
 * (see schema file). Do not put the service_role key here.
 */
(function (global) {
    "use strict";

    global.WAYS_TO_SAVE_CONFIG = {
        supabaseUrl: "https://zgghcmbxvwbinmolifmf.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZ2hjbWJ4dndiaW5tb2xpZm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDMxMDEsImV4cCI6MjA5MDkxOTEwMX0._l8hGiwde5x4aiIty0z8uc6fOkgCV2C1YoIscj7Ry40",
        /** PostgREST table name; default matches supabase-schema.sql */
        supabaseTable: "saved_draws",
    };
})(typeof window !== "undefined" ? window : globalThis);
