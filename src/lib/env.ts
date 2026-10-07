import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Read lazily so a missing optional variable never breaks unrelated routes at import time.
export const serverEnv = {
  get supabaseUrl() {
    return required('SUPABASE_URL');
  },
  get supabasePublishableKey() {
    return required('SUPABASE_PUBLISHABLE_KEY');
  },
  get supabaseServiceRoleKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  get cloudinaryCloudName() {
    return required('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  },
  get cloudinaryApiKey() {
    return required('CLOUDINARY_API_KEY');
  },
  get cloudinaryApiSecret() {
    return required('CLOUDINARY_API_SECRET');
  },
};
