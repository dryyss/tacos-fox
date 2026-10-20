/* Relaie les webhooks Stripe (mode test) vers le serveur de développement.
   Usage : npm run stripe:listen [-- --port 3000]
   Lit STRIPE_SECRET_KEY dans .env ; affiche le secret whsec_... à copier dans STRIPE_WEBHOOK_SECRET. */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => /^[A-Z_]+=/.test(l))
    .map(l => { const [k, ...v] = l.split('='); return [k, v.join('=').trim().replace(/^"(.*)"$/, '$1')]; }),
);

const key = env.STRIPE_SECRET_KEY;
if (!key?.startsWith('sk_test_')) {
  console.error('STRIPE_SECRET_KEY absente de .env ou pas une clé de test (sk_test_...).');
  process.exit(1);
}

const portIdx = process.argv.indexOf('--port');
const port = portIdx > -1 ? process.argv[portIdx + 1] : '3000';
const events = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired', 'checkout.session.async_payment_failed', 'charge.refunded'];

const child = spawn('stripe', ['listen', '--api-key', key, '--events', events.join(','), '--forward-to', `http://localhost:${port}/api/stripe/webhook`], { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', code => process.exit(code ?? 0));
