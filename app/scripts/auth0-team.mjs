/* R8 : comptes de l'équipe dans Auth0 (fait par MAGAR Développement).
   Ne touche qu'aux rôles « tacosfox:* » du tenant, qui sert aussi à d'autres projets.

   node scripts/auth0-team.mjs roles
     crée tacosfox:superadmin et tacosfox:staff:<restaurant> pour les 5 restaurants
   node scripts/auth0-team.mjs add <email> <restaurant|admin|superadmin> [mot de passe]
     crée le compte (e-mail + mot de passe) s'il n'existe pas et lui donne le rôle ;
     sans mot de passe, un mot de passe est généré et affiché
   node scripts/auth0-team.mjs grant <email> <restaurant|admin|superadmin>
     donne le rôle à un compte existant (y compris Google)
   node scripts/auth0-team.mjs list
     comptes ayant un rôle tacosfox:*
   node scripts/auth0-team.mjs logo https://<site>/logo.png
     logo de la page de connexion Auth0, pour l'application Tacos Fox seulement (AUTH_AUTH0_ID)

   Variables (.env) : AUTH_AUTH0_ISSUER, auth0_m2m_id, auth0_m2m_key */
import { randomInt } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dotenv = createRequire(import.meta.url)('dotenv');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const RESTAURANTS = ['stains-marcel-cachin', 'stains-louis-bordes', 'dugny-22-lariviere', 'dugny-21-lariviere', 'blanc-mesnil'];
const DESCRIPTIONS = {
  superadmin: 'Tacos Fox : MAGAR Développement, toute la gestion',
  admin: 'Tacos Fox : gérant, commandes des 5 restaurants',
  ...Object.fromEntries(RESTAURANTS.map(r => [`staff:${r}`, `Tacos Fox : équipe du restaurant ${r}`])),
};
const DB_CONNECTION = 'Username-Password-Authentication';

const issuer = (process.env.AUTH_AUTH0_ISSUER ?? '').replace(/\/$/, '');
if (!issuer || !process.env.auth0_m2m_id || !process.env.auth0_m2m_key) {
  console.error('AUTH_AUTH0_ISSUER, auth0_m2m_id et auth0_m2m_key sont requis dans .env');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let token;
async function api(method, url, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${issuer}/api/v2/${url}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 8) { await sleep(2000 * (attempt + 1)); continue; } // limite d'appels du tenant
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(`${method} ${url} : ${res.status} ${data?.message ?? text}`);
    return data;
  }
}

function roleName(target) {
  if (target === 'superadmin' || target === 'admin') return `tacosfox:${target}`;
  if (RESTAURANTS.includes(target)) return `tacosfox:staff:${target}`;
  throw new Error(`Restaurant inconnu « ${target} ». Valeurs : ${RESTAURANTS.join(', ')}, admin, superadmin`);
}

async function ensureRole(name) {
  const [found] = await api('GET', `roles?name_filter=${encodeURIComponent(name)}`).then(r => r.filter(x => x.name === name));
  if (found) return found;
  console.log(`  rôle créé : ${name}`);
  return api('POST', 'roles', { name, description: DESCRIPTIONS[name.slice('tacosfox:'.length)] ?? 'Tacos Fox' });
}

function password() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!?#@%+='];
  const all = sets.join('');
  const chars = [...sets.map(s => s[randomInt(s.length)]), ...Array.from({ length: 12 }, () => all[randomInt(all.length)])];
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}

const usersByEmail = email => api('GET', `users-by-email?email=${encodeURIComponent(email.toLowerCase())}`);

async function grant(email, target, { create = false, pwd } = {}) {
  const role = await ensureRole(roleName(target));
  let users = await usersByEmail(email);
  let created;
  if (!users.some(u => u.identities?.some(i => i.connection === DB_CONNECTION)) && create) {
    created = pwd || password();
    users = [...users, await api('POST', 'users', { connection: DB_CONNECTION, email: email.toLowerCase(), password: created, email_verified: true })];
  }
  if (!users.length) throw new Error(`Aucun compte Auth0 pour ${email}`);
  for (const u of users) await api('POST', `users/${encodeURIComponent(u.user_id)}/roles`, { roles: [role.id] });
  console.log(`${email} -> ${role.name}${created && !pwd ? `   mot de passe : ${created}` : created ? '   (mot de passe fourni)' : ''}`);
}

async function list() {
  const roles = (await api('GET', 'roles?per_page=100')).filter(r => r.name.startsWith('tacosfox:'));
  for (const r of roles) {
    const members = await api('GET', `roles/${r.id}/users?per_page=100`);
    console.log(`${r.name} : ${[...new Set(members.map(m => m.email))].join(', ') || '-'}`);
  }
}

const [cmd, ...args] = process.argv.slice(2);
const auth = await fetch(`${issuer}/oauth/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ grant_type: 'client_credentials', client_id: process.env.auth0_m2m_id, client_secret: process.env.auth0_m2m_key, audience: `${issuer}/api/v2/` }),
}).then(r => r.json());
if (!auth.access_token) { console.error('Connexion Auth0 impossible :', auth.error_description ?? auth.error); process.exit(1); }
token = auth.access_token;

try {
  if (cmd === 'roles') for (const r of ['superadmin', 'admin', ...RESTAURANTS]) await ensureRole(roleName(r));
  else if (cmd === 'add' && args.length >= 2) await grant(args[0], args[1], { create: true, pwd: args[2] });
  else if (cmd === 'grant' && args.length === 2) await grant(args[0], args[1]);
  else if (cmd === 'list') await list();
  else if (cmd === 'logo' && (args[0] ?? '').startsWith('https://')) {
    await api('PATCH', `clients/${process.env.AUTH_AUTH0_ID}`, { logo_uri: args[0] });
    console.log('Logo de la connexion :', args[0]);
  }
  else { console.log('Usage : roles | add <email> <restaurant|admin|superadmin> [mot de passe] | grant <email> <rôle> | list | logo <https://…/logo.png>'); process.exit(1); }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
