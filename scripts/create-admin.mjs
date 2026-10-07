// Create (or promote) an administrator for the Hub console.
//
//   npm run create-admin
//
// Prompts for an email and a password. The password is read with echo
// disabled and is never printed or logged; Supabase Auth stores only a hash.

import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).');
  process.exit(1);
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => (rl.close(), resolve(answer.trim()))));
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return reject(new Error('A terminal is required to enter the password securely.'));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          return resolve(value);
        }
        if (char === '\u0003') {
          stdout.write('\n');
          process.exit(130);
        }
        if (char === '\u007f' || char === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        value += char;
        stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const email = (await ask('Admin email: ')).toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Enter a valid email address.');
  process.exit(1);
}

// Find an existing auth user with this email.
let userId = null;
for (let page = 1; page < 50 && !userId; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  if (data.users.length < 200) break;
}

if (userId) {
  console.log('An account with this email exists; granting admin access.');
  const reset = (await ask('Set a new password for it? (y/N): ')).toLowerCase() === 'y';
  if (reset) {
    const password = await askHidden('New password (min 12 characters): ');
    if (password.length < 12) throw new Error('Password must be at least 12 characters.');
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
  }
} else {
  const password = await askHidden('Password (min 12 characters): ');
  const confirm = await askHidden('Confirm password: ');
  if (password.length < 12) throw new Error('Password must be at least 12 characters.');
  if (password !== confirm) throw new Error('Passwords do not match.');
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user.id;
}

const { error } = await supabase.from('admins').upsert({ user_id: userId });
if (error) throw error;

console.log(`Done. ${email} can now sign in to the console.`);
