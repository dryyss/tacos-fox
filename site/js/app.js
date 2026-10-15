/* ============================================================
   TACOS FOX : application de commande (prototype interface)
   Vanilla JS, routage par ancre, panier conservé en localStorage.
   ============================================================ */
(() => {
  'use strict';

  /* ---------- Utilitaires ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = n => n.toFixed(2).replace('.', ',') + '\u202f€';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } };
  const byId = id => PRODUCTS.find(p => p.id === id);
  const catLabel = id => (CATEGORIES.find(c => c.id === id) || {}).label || '';
  const icon = (name, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const pad = n => String(n).padStart(2, '0');
  const hm = s => s === '00:00' ? 'minuit' : s.replace(':', 'h');

  const MODES = {
    surplace: { label: 'Sur place', icon: 'store', note: 'Commandez depuis votre table ou avant d\'arriver, on vous appelle quand c\'est prêt.' },
    emporter: { label: 'À emporter', icon: 'takeaway', note: 'Prêt en 15 à 20 minutes. Passez directement au comptoir, votre commande vous attend.' },
    livraison: { label: 'Livraison', icon: 'scooter', note: `Livraison ${fmt(RESTAURANT.delivery.fee)}, offerte dès ${fmt(RESTAURANT.delivery.freeFrom)}. Minimum de commande ${fmt(RESTAURANT.delivery.minimum)}.` },
  };
  const ZONE_CP = { 'Stains': '93240', 'Pierrefitte-sur-Seine': '93380', 'Saint-Denis': '93200', 'La Courneuve': '93120', 'Garges-lès-Gonesse': '95140', 'Villetaneuse': '93430', 'Dugny': '93440' };
  const TITLES = { carte: 'La carte', panier: 'Mon panier', commande: 'Retrait', paiement: 'Paiement', confirmation: 'Suivi de commande', compte: 'Mon compte', infos: 'Infos pratiques' };

  /* ---------- État ---------- */
  const state = {
    cart: load('tfx_cart', []),
    mode: load('tfx_mode', 'emporter'),
    checkout: Object.assign({ slot: 'asap', name: '', phone: '', email: '', address: '', extra: '', city: 'Stains', pay: 'card', note: '', addrId: null }, load('tfx_checkout', {})),
    orders: load('tfx_orders', DEMO_ORDERS),
    addresses: load('tfx_addresses', DEMO_ADDRESSES),
    accountTab: 'orders',
    user: { name: 'Sofiane', email: 'sofiane.b@mail.fr', phone: '06 12 34 56 78' },
  };
  const persist = () => { save('tfx_cart', state.cart); save('tfx_mode', state.mode); save('tfx_checkout', state.checkout); save('tfx_orders', state.orders); save('tfx_addresses', state.addresses); };

  /* ---------- Horaires ---------- */
  function todayIndex() { return (new Date().getDay() + 6) % 7; }
  function parseHM(s) { const [h, m] = s.split(':').map(Number); return (h === 0 ? 24 : h) * 60 + m; }
  function openStatus() {
    const h = RESTAURANT.hours[todayIndex()];
    const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
    const o = parseHM(h.open), c = parseHM(h.close);
    if (cur >= o && cur < c) return { open: true, label: `Ouvert, jusqu'à ${hm(h.close)}` };
    if (cur < o) return { open: false, label: `Fermé, ouvre à ${hm(h.open)}` };
    return { open: false, label: 'Fermé, à demain dès ' + hm(RESTAURANT.hours[(todayIndex() + 1) % 7].open) };
  }
  function timeSlots() {
    const h = RESTAURANT.hours[todayIndex()];
    const now = new Date();
    let start = now.getHours() * 60 + now.getMinutes() + 30;
    start = Math.ceil(start / 15) * 15;
    const o = parseHM(h.open), c = parseHM(h.close);
    if (start < o) start = o;
    const slots = [];
    for (let t = start; t <= c - 15 && slots.length < 10; t += 15) slots.push(`${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`);
    return slots;
  }

  /* ---------- Composants ---------- */
  const ph = (cls = '', label = 'Photo du plat') => `<div class="ph ${cls}">${icon('fox', 'ph__fox')}${label ? `<span class="ph__tag">${icon('camera')}${label}</span>` : ''}</div>`;
  const BADGE_ICON = { best: 'star', nouveau: 'spark', epice: 'flame' };
  function badges(p) {
    const list = (p.badges || []).map(b => `<span class="badge badge--${b}">${icon(BADGE_ICON[b])}${BADGE_LABELS[b]}</span>`);
    if (p.bogo) list.unshift('<span class="badge badge--bogo">1 achetée = 1 offerte</span>');
    return list.join('');
  }
  function cardHTML(p, extraCls = '') {
    const price = p.sizes ? p.sizes[0].price : p.price;
    return `<article class="card ${extraCls}" data-product="${p.id}">
      <div class="card__media">${ph()}<div class="card__badges">${badges(p)}</div></div>
      <div class="card__body">
        <h3 class="card__name">${esc(p.name)}</h3>
        <p class="card__desc">${esc(p.desc)}</p>
        ${p.formula ? `<span class="card__formula">${esc(p.formula)}</span>` : ''}
        <div class="card__foot">
          <div class="card__price">${p.priceFrom ? '<small>dès</small>' : ''}<span class="price">${fmt(price)}</span>${p.tbc ? '<small>prix à confirmer</small>' : ''}</div>
          <button class="add" data-action="add" data-id="${p.id}" aria-label="Ajouter ${esc(p.name)}">${icon('plus', 'ico add__plus')}${icon('check', 'ico add__check')}</button>
        </div>
      </div>
    </article>`;
  }
  function tacosCardHTML() {
    return `<article class="card card--compose" data-action="open-tacos" data-size="M">
      <div class="card__media">${ph('ph--red')}<div class="card__badges"><span class="badge badge--best">${icon('star')}Best-seller</span></div></div>
      <div class="card__body">
        <h3 class="card__name">Tacos à composer</h3>
        <p class="card__desc">${TACOS.included}. Choisissez la taille, vos viandes et 2 sauces parmi 15.</p>
        <div class="card__foot">
          <div class="card__price"><small>dès</small><span class="price">${fmt(TACOS.sizes[0].price)}</span></div>
          <button class="add add--wide" aria-label="Composer mon tacos">Composer ${icon('plus')}</button>
        </div>
      </div>
    </article>`;
  }
  function footerHTML() {
    return `<footer class="footer">
      <div class="footer__grid">
        <div>
          <div class="footer__brand">TACOS<span>FOX</span></div>
          <p class="small">by Paris, since 1998. ${RESTAURANT.slogan}.</p>
          <p class="small" style="margin-top:10px;display:flex;gap:6px;align-items:center">${icon('halal')} ${RESTAURANT.halal}</p>
        </div>
        <div class="footer__links">
          <strong>Commander</strong>
          <a href="#/carte">La carte</a><a href="#/carte?cat=tacos">Composer un tacos</a><a href="#/carte?cat=pizzas">Pizzas : 1 achetée = 1 offerte</a><a href="#/compte">Mon compte</a>
        </div>
        <div class="footer__links">
          <strong>Le restaurant</strong>
          <a href="#/infos">Horaires et accès</a><a href="${RESTAURANT.phoneHref}">${RESTAURANT.phone}</a><span>${RESTAURANT.address.line1}, ${RESTAURANT.address.city}</span>
        </div>
      </div>
      <div class="footer__legal"><span>Mentions légales</span><span>CGV</span><span>Confidentialité</span><span>Allergènes</span><span>Prix TTC, service compris</span></div>
    </footer>`;
  }

  /* ---------- Vue : Accueil ---------- */
  function viewHome() {
    const o = openStatus();
    const best = BEST_SELLERS.map(b => b.kind === 'tacos' ? tacosCardHTML() : cardHTML(byId(b.id))).join('');
    const h = RESTAURANT.hours[todayIndex()];
    return `<div class="page">
      <section class="hero">
        <div class="hero__inner">
          <div class="hero__copy">
            <div class="hero__badges">
              <span class="badge badge--halal">${icon('halal')}${RESTAURANT.halal}</span>
              <span class="badge hero__badge-direct">Commande directe, sans appli</span>
            </div>
            <h1 class="hero__title">La meilleure excuse pour <em>ne pas cuisiner</em> ce soir</h1>
            <p class="hero__text">Tacos généreux, burgers XXL, pizzas, bowls et Crousty Fox. Préparés à Stains, prêts en 15 minutes, au prix de la carte.</p>
            <div class="hero__cta">
              <a class="btn btn--primary btn--xl" href="#/carte">Commander</a>
              <div class="hero__sub"><span class="dot ${o.open ? '' : 'is-closed'}"></span>${o.label}</div>
            </div>
            <ul class="hero__facts">
              <li><strong>15 min</strong>de préparation</li>
              <li><strong>0 €</strong>de commission</li>
              <li><strong>7j/7</strong>${hm(h.open)} à ${hm(h.close)}</li>
            </ul>
          </div>
          <div class="hero__visual">
            ${ph('ph--hero ph--red', 'Photo tacos XXL')}
            <div class="hero__sticker">Tacos dès<strong>${TACOS.sizes[0].price.toFixed(2).replace('.', ',')}€</strong></div>
          </div>
        </div>
      </section>

      <a class="promo" href="#/carte?cat=pizzas" aria-label="Voir l'offre pizza">
        <div class="promo__pizza">2x</div>
        <div>
          <span class="promo__kicker">Offre pizza</span>
          <div class="promo__title">1 pizza achetée <span>= 1 offerte</span></div>
        </div>
        <p class="promo__text">Sur les tailles Senior et Mega, sur place et à emporter. Deux Senior pour ${fmt(PIZZA_SIZES[1].price)}, deux Mega pour ${fmt(PIZZA_SIZES[2].price)}.</p>
        <span class="btn btn--dark promo__cta">Voir les pizzas</span>
      </a>

      <section class="section">
        <div class="section__head">
          <h2 class="section__title">Les <em>incontournables</em></h2>
          <a class="section__link" href="#/carte">Toute la carte ${icon('chevron')}</a>
        </div>
        <div class="scroller">${best}</div>
      </section>

      <section class="section section--white">
        <div class="section__head"><h2 class="section__title">Comme vous <em>voulez</em></h2></div>
        <div class="modes">
          ${Object.entries(MODES).map(([id, m]) => `<a class="mode" href="#/carte" data-action="set-mode-go" data-mode="${id}">
            <div class="mode__ico">${icon(m.icon)}</div>
            <div><div class="mode__title">${m.label}</div><div class="mode__text">${m.note}</div></div>
            ${icon('chevron', 'ico mode__chevron')}
          </a>`).join('')}
        </div>
      </section>

      <section class="section why">
        <div class="section__head"><h2 class="section__title">Pourquoi commander ici plutôt que sur une appli ?</h2></div>
        <ul class="why__list">
          <li><span class="num">01</span><div><strong>Les prix de la carte, rien de plus</strong><span>Pas de majoration, pas de frais de service cachés.</span></div></li>
          <li><span class="num">02</span><div><strong>Votre commande arrive direct en cuisine</strong><span>Moins d'attente, moins d'erreurs, suivi en temps réel.</span></div></li>
          <li><span class="num">03</span><div><strong>Vous soutenez le resto du quartier</strong><span>100 % de ce que vous payez revient à Tacos Fox.</span></div></li>
        </ul>
      </section>

      <section class="section">
        <div class="section__head"><h2 class="section__title">On vous <em>attend</em></h2><a class="section__link" href="#/infos">Infos pratiques ${icon('chevron')}</a></div>
        <div class="info-card">
          <div class="info-row">${icon('clock')}<div><strong>Aujourd'hui ${hm(h.open)} à ${hm(h.close)}</strong><span class="open-pill ${o.open ? '' : 'is-closed'}">${o.label}</span></div></div>
          <div class="info-row">${icon('pin')}<div><strong>${RESTAURANT.address.line1}</strong><span>${RESTAURANT.address.city}</span></div></div>
          <div class="info-card__actions">
            <a class="btn btn--light" href="${RESTAURANT.phoneHref}">${icon('phone')} Appeler</a>
            <a class="btn btn--light" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RESTAURANT.mapsQuery)}" target="_blank" rel="noopener">${icon('route')} Itinéraire</a>
          </div>
        </div>
      </section>
      ${footerHTML()}
    </div>`;
  }

  /* ---------- Vue : La carte ---------- */
  const SECTION_SUBS = {
    tacos: TACOS.included + '. Taille S et M : 1 viande, L : 2, XL : 3, XXL : 4.',
    burgers: 'Tous nos burgers sont servis en menu avec frites et boisson.',
    sandwichs: 'Pain frais, viandes halal, crudités au choix. Menu frites et boisson inclus.',
    pizzas: 'Pâte maison. 1 achetée = 1 offerte sur Senior et Mega, sur place et à emporter.',
    bowls: 'Frites, 4 fromages fondus, viande et sauce au choix. Boisson incluse.',
    crousty: 'La galette croustillante signature Tacos Fox.',
    assiettes: 'Viande, salade, tomate, oignon, frites. Boisson incluse.',
  };
  function sectionHTML(cat) {
    let body, count;
    if (cat.id === 'tacos') {
      count = TACOS.sizes.length;
      body = `<div class="grid grid--1">${tacosCardHTML()}</div>
        <div class="sizes-row">${TACOS.sizes.map(s => `<button class="size-chip" data-action="open-tacos" data-size="${s.id}" aria-label="Composer un tacos ${s.id}">
          <b>${s.id}</b><small>${s.hint}</small><span class="price">${fmt(s.price)}</span></button>`).join('')}</div>`;
    } else {
      const items = PRODUCTS.filter(p => p.cat === cat.id); count = items.length;
      body = `<div class="grid">${items.map(p => cardHTML(p)).join('')}</div>`;
    }
    return `<section class="menu-section" id="cat-${cat.id}" data-cat="${cat.id}">
      <h2 class="menu-section__title"><button type="button" class="menu-section__toggle" aria-expanded="false" aria-controls="body-${cat.id}" data-toggle="${cat.id}"><span class="cat-thumb">${catThumb(cat.id)}</span><span class="menu-section__name">${cat.label}</span><small>${count} choix</small>${icon('chevron', 'ico menu-section__chev')}</button></h2>
      <div class="menu-section__body" id="body-${cat.id}" hidden>
        ${SECTION_SUBS[cat.id] ? `<p class="menu-section__sub">${SECTION_SUBS[cat.id]}</p>` : ''}
        ${body}
      </div>
    </section>`;
  }
  const catThumb = id => CAT_IMAGES[id] ? `<img src="${CAT_IMAGES[id]}" alt="" loading="lazy" width="44" height="44">` : icon('fox', 'ico');
  const catCount = id => id === 'tacos' ? TACOS.sizes.length : PRODUCTS.filter(p => p.cat === id).length;
  function sideCartHTML() {
    const n = cartCount();
    if (!n) return `<div class="menu-cart__inner">
      <h2 class="menu-cart__title">Mon panier</h2>
      <div class="menu-cart__empty">${icon('bag')}<p>Votre panier est vide.</p><small>Ajoutez un plat avec le bouton +</small></div>
      <button type="button" class="btn btn--dark btn--block" data-action="open-tacos" data-size="M">Composer un tacos</button>
    </div>`;
    const mode = MODES[state.mode];
    return `<div class="menu-cart__inner">
      <h2 class="menu-cart__title">Mon panier <small>${n} article${n > 1 ? 's' : ''}</small></h2>
      <ul class="menu-cart__list">${state.cart.map(i => `<li class="menu-cart__item">
        <div class="qty qty--sm"><button data-action="cart-qty" data-key="${esc(i.key)}" data-delta="-1" aria-label="Moins">${icon('minus')}</button><span>${i.qty}</span><button data-action="cart-qty" data-key="${esc(i.key)}" data-delta="1" aria-label="Plus">${icon('plus')}</button></div>
        <div class="menu-cart__info"><strong>${esc(i.name)}</strong>${i.details.length ? `<small>${i.details.map(esc).join(' · ')}</small>` : ''}</div>
        <span class="menu-cart__price">${fmt(i.unit * i.qty)}</span>
      </li>`).join('')}</ul>
      <div class="menu-cart__mode">${icon(mode.icon)}<span>${mode.label}</span><a href="#/panier">Modifier</a></div>
      ${totalsHTML()}
      <a class="btn btn--primary btn--xl btn--block" href="#/panier">Passer commande</a>
      <p class="menu-cart__note">${icon('lock')} Paiement sécurisé, sans appli</p>
    </div>`;
  }
  function viewMenu() {
    return `<div class="page menu-page">
      <div class="menu-top"><div class="menu-top__inner">
        <div class="search">${icon('search')}<input id="search" type="search" inputmode="search" placeholder="Un plat, une viande, une sauce..." autocomplete="off" aria-label="Rechercher dans la carte"><button class="search__clear" id="searchClear" hidden aria-label="Effacer la recherche">${icon('close')}</button></div>
        <nav class="cats" id="cats" aria-label="Catégories">${CATEGORIES.map(c => `<a href="#/carte?cat=${c.id}" data-cat="${c.id}">${c.label}</a>`).join('')}</nav>
      </div></div>
      <div class="menu-layout">
        <aside class="menu-side" id="menuSide" aria-label="Catégories">
          <div class="menu-side__inner">
            <p class="menu-side__title">Catégories</p>
            ${CATEGORIES.map(c => `<a href="#/carte?cat=${c.id}" data-cat="${c.id}"><span class="cat-thumb cat-thumb--sm">${catThumb(c.id)}</span><span class="menu-side__label">${c.label}</span><small>${catCount(c.id)}</small></a>`).join('')}
          </div>
        </aside>
        <div class="menu-main">
          <div id="menuSections">${CATEGORIES.map(sectionHTML).join('')}</div>
          <div class="empty" id="menuEmpty" hidden><p class="display">Rien trouvé</p><p>Essayez « tacos », « kebab », « chèvre miel »...</p></div>
          <div style="height:40px"></div>
        </div>
        <aside class="menu-cart" id="menuCart" aria-label="Mon panier">${sideCartHTML()}</aside>
      </div>
    </div>`;
  }
  let spy = null;
  function mountMenu(params) {
    const cats = $('#cats');
    let spyPaused = false;
    const home = params.cat && $(`#cat-${params.cat}`) ? params.cat : 'tacos';
    const setOpen = (id, open) => {
      const sec = $(`#cat-${id}`); if (!sec) return;
      $('.menu-section__body', sec).hidden = !open;
      $('.menu-section__toggle', sec).setAttribute('aria-expanded', String(open));
      sec.classList.toggle('is-open', open);
    };
    const collapseAllBut = id => CATEGORIES.forEach(c => setOpen(c.id, c.id === id));
    $('#menuSections').addEventListener('click', e => {
      const t = e.target.closest('[data-toggle]'); if (!t) return;
      const open = t.getAttribute('aria-expanded') !== 'true';
      setOpen(t.dataset.toggle, open);
      if (open) { spyPaused = true; setActive(t.dataset.toggle); setTimeout(() => { spyPaused = false; }, 600); }
    });
    const side = $('#menuSide');
    const setActive = id => {
      $$('a[data-cat]', side).forEach(a => a.classList.toggle('is-active', a.dataset.cat === id));
      $$('a', cats).forEach(a => a.classList.toggle('is-active', a.dataset.cat === id));
      const a = $(`a[data-cat="${id}"]`, cats);
      if (a) {
        const ar = a.getBoundingClientRect(), cr = cats.getBoundingClientRect();
        cats.scrollTo({ left: cats.scrollLeft + (ar.left - cr.left) - cr.width / 2 + ar.width / 2, behavior: 'smooth' });
      }
    };
    [cats, side].forEach(nav => nav.addEventListener('click', e => {
      const a = e.target.closest('a[data-cat]'); if (!a) return;
      e.preventDefault();
      const sec = $(`#cat-${a.dataset.cat}`);
      if (!sec) return;
      spyPaused = true;
      setOpen(a.dataset.cat, true);
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(a.dataset.cat);
      history.replaceState(null, '', `#/carte?cat=${a.dataset.cat}`);
      setTimeout(() => { spyPaused = false; }, 800);
    }));
    spy = new IntersectionObserver(entries => {
      if (spyPaused) return;
      const vis = entries.filter(e => e.isIntersecting && e.target.classList.contains('is-open')).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.dataset.cat);
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    $$('.menu-section').forEach(s => spy.observe(s));

    const input = $('#search'), clear = $('#searchClear');
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filter = () => {
      const q = norm(input.value.trim());
      clear.hidden = !q;
      let any = false;
      $$('.menu-section').forEach(sec => {
        let visible = 0;
        if (sec.dataset.cat === 'tacos') {
          visible = (!q || 'tacos viande sauce frites composer'.includes(q)) ? 1 : 0;
        } else {
          $$('.card', sec).forEach(c => {
            const p = byId(c.dataset.product);
            const ok = !q || norm(p.name + ' ' + p.desc + ' ' + catLabel(p.cat)).includes(q);
            c.hidden = !ok; if (ok) visible++;
          });
        }
        sec.hidden = visible === 0;
        if (visible) any = true;
        if (q && visible) setOpen(sec.dataset.cat, true);
      });
      if (!q) collapseAllBut(home);
      $('#menuEmpty').hidden = any;
    };
    input.addEventListener('input', filter);
    clear.addEventListener('click', () => { input.value = ''; filter(); input.focus(); });

    collapseAllBut(home);
    const target = params.cat && $(`#cat-${params.cat}`);
    if (target) requestAnimationFrame(() => { target.scrollIntoView({ block: 'start' }); setActive(params.cat); });
    else setActive('tacos');
  }

  /* ---------- Feuille modale ---------- */
  const sheet = $('#sheet'), sheetInner = $('#sheetInner'), backdrop = $('#sheetBackdrop');
  function openSheet(html, onClick) {
    sheetInner.innerHTML = html;
    sheetInner.onclick = onClick || null;
    sheet.hidden = false; backdrop.hidden = false;
    document.body.classList.add('is-locked');
    setTimeout(() => { const f = $('.sheet__close', sheet); f && f.focus({ preventScroll: true }); }, 50);
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.hidden = true; backdrop.hidden = true; sheetInner.innerHTML = ''; sheetInner.onclick = null;
    document.body.classList.remove('is-locked');
  }
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  let touchY = null;
  sheet.addEventListener('touchstart', e => { if (e.target.closest('.sheet__handle, .sheet__head')) touchY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => { if (touchY !== null && e.changedTouches[0].clientY - touchY > 80) closeSheet(); touchY = null; });

  function sheetShell({ title, sub, media, body, foot }) {
    return `<div class="sheet__head">
        <div><h2 class="sheet__title" id="sheetTitle">${title}</h2>${sub ? `<p class="sheet__sub">${sub}</p>` : ''}</div>
        <button class="sheet__close" data-action="sheet-close" aria-label="Fermer">${icon('close')}</button>
      </div>
      <div class="sheet__body" id="sheetBody">${media || ''}${body}</div>
      <div class="sheet__foot" id="sheetFoot">${foot}</div>`;
  }
  function rerenderSheetBody(html, footHtml) {
    const b = $('#sheetBody'); const st = b.scrollTop; b.innerHTML = html; b.scrollTop = st;
    if (footHtml !== undefined) { $('#sheetFoot').innerHTML = footHtml; const t = $('#sheetTotal'); t && t.classList.add('is-bump'); }
  }
  const qtyHTML = (q, act) => `<div class="qty" role="group" aria-label="Quantité"><button data-action="${act}" data-delta="-1" aria-label="Moins">${icon('minus')}</button><span>${q}</span><button data-action="${act}" data-delta="1" aria-label="Plus">${icon('plus')}</button></div>`;
  const stepHead = (n, title, hint, count) => `<div class="step__head"><span class="step__num">${n}</span><div><div class="step__title">${title}</div>${hint ? `<div class="step__hint">${hint}</div>` : ''}</div>${count ? `<span class="step__count ${count.cls || ''}">${count.text}</span>` : ''}</div>`;
  const chip = (label, o) => `<button type="button" class="chip ${o.sel ? 'is-selected' : ''} ${o.dis ? 'is-disabled' : ''}" data-act="${o.act}" data-v="${esc(o.v || label)}" ${o.g ? `data-g="${o.g}"` : ''}>${icon('check', 'ico chip__check')}${esc(label)}${o.price ? `<span class="chip__price">+${fmt(o.price)}</span>` : ''}${o.after || ''}</button>`;

  /* ---------- Composer son tacos ---------- */
  function openTacos(sizeId = 'M') {
    const c = { size: sizeId, meats: [], sauces: [], cheeses: [], gratin: null, fries: false, drink: null, qty: 1, errors: [] };
    const size = () => TACOS.sizes.find(s => s.id === c.size);
    const unit = () => size().price + c.cheeses.reduce((a, l) => a + CHEESES.find(x => x.label === l).price, 0) + (c.gratin ? 2.5 : 0) + (c.fries ? TACOS.friesPrice : 0);
    const total = () => unit() * c.qty;

    const body = () => {
      const s = size(); const max = s.meats; const full = c.meats.length >= max;
      const err = k => c.errors.includes(k) ? 'is-error' : '';
      return `
      <div class="step">
        ${stepHead(1, 'La taille', TACOS.included, { text: s.label + ' · ' + s.hint, cls: 'is-ok' })}
        <div class="sizes">${TACOS.sizes.map(x => `<button type="button" class="size ${x.id === c.size ? 'is-selected' : ''}" data-act="size" data-v="${x.id}"><b>${x.id}</b><small>${x.meats} viande${x.meats > 1 ? 's' : ''}</small><span class="price">${fmt(x.price)}</span></button>`).join('')}</div>
      </div>
      <div class="step ${err('meats')}">
        ${stepHead(2, max > 1 ? 'Vos viandes' : 'Votre viande', max > 1 ? `Jusqu'à ${max} viandes. Appuyez sur +1 pour doubler une viande.` : 'Appuyez pour choisir', { text: `${c.meats.length}/${max}`, cls: c.meats.length ? 'is-ok' : 'is-need' })}
        <div class="chips">${MEATS.map(m => {
          const n = c.meats.filter(x => x === m).length;
          const after = (n > 1 ? `<span class="chip__price">x${n}</span>` : '') + ((n && max > 1 && !full) ? `<span class="chip__more" data-act="meat-more" data-v="${esc(m)}" role="button" aria-label="Doubler ${esc(m)}">+1</span>` : '');
          return chip(m, { sel: n > 0, dis: !n && full, act: 'meat', after });
        }).join('')}</div>
        ${c.meats.length ? `<p class="step__hint" style="margin-top:8px">Sélection : ${c.meats.join(', ')}. Appuyez sur une viande sélectionnée pour la retirer.</p>` : ''}
      </div>
      <div class="step">
        ${stepHead(3, 'Vos sauces', '2 maximum, incluses', { text: `${c.sauces.length}/2`, cls: c.sauces.length ? 'is-ok' : '' })}
        <div class="chips">${SAUCES.map(sa => chip(sa, { sel: c.sauces.includes(sa), dis: !c.sauces.includes(sa) && c.sauces.length >= 2, act: 'sauce' })).join('')}</div>
      </div>
      <div class="step">
        ${stepHead(4, 'Suppléments fromage', 'Optionnel', c.cheeses.length ? { text: c.cheeses.length + ' ajouté' + (c.cheeses.length > 1 ? 's' : ''), cls: 'is-ok' } : null)}
        <div class="chips">${CHEESES.map(ch => chip(ch.label, { sel: c.cheeses.includes(ch.label), act: 'cheese', price: ch.price })).join('')}</div>
      </div>
      <div class="step">
        ${stepHead(5, 'Gratinage', 'Passage au four, 1 choix, +2,50 €', c.gratin ? { text: 'Gratiné', cls: 'is-ok' } : null)}
        <div class="opt-list">${GRATINS.map(g => `<button type="button" class="opt ${c.gratin === g.label ? 'is-selected' : ''}" data-act="gratin" data-v="${esc(g.label)}"><span class="opt__box opt__box--round">${icon('check')}</span><span class="opt__label">${esc(g.label)}</span><span class="opt__price">+${fmt(g.price)}</span></button>`).join('')}</div>
      </div>
      <div class="step">
        ${stepHead(6, 'Frites en plus', 'Une portion supplémentaire dans le tacos')}
        <div class="opt-list"><button type="button" class="opt ${c.fries ? 'is-selected' : ''}" data-act="fries"><span class="opt__box">${icon('check')}</span><span class="opt__label">Frites supplémentaires</span><span class="opt__price">+${fmt(TACOS.friesPrice)}</span></button></div>
      </div>
      <div class="step ${err('drink')}">
        ${stepHead(7, 'Votre boisson', 'Incluse dans le prix', { text: c.drink || 'À choisir', cls: c.drink ? 'is-ok' : 'is-need' })}
        <div class="chips">${DRINKS.map(d => chip(d, { sel: c.drink === d, act: 'drink' })).join('')}</div>
      </div>`;
    };
    const foot = () => `${qtyHTML(c.qty, 'tacos-qty')}<button class="btn btn--primary" data-act="add">Ajouter au panier <span class="price" id="sheetTotal">${fmt(total())}</span></button>`;
    const refresh = () => rerenderSheetBody(body(), foot());

    openSheet(sheetShell({ title: 'Composer mon tacos', sub: 'Prix mis à jour en direct', body: body(), foot: foot() }), e => {
      const b = e.target.closest('[data-act], [data-action]'); if (!b) return;
      if (b.dataset.action === 'sheet-close') return closeSheet();
      if (b.dataset.action === 'tacos-qty') { c.qty = Math.max(1, Math.min(9, c.qty + Number(b.dataset.delta))); return refresh(); }
      const v = b.dataset.v; const max = size().meats;
      switch (b.dataset.act) {
        case 'size': c.size = v; c.meats = c.meats.slice(0, size().meats); break;
        case 'meat': {
          const i = c.meats.indexOf(v);
          if (i >= 0) c.meats = c.meats.filter(x => x !== v);
          else if (c.meats.length < max) c.meats.push(v);
          else return toast(`${max} viande${max > 1 ? 's' : ''} maximum en taille ${c.size}`);
          c.errors = c.errors.filter(x => x !== 'meats'); break;
        }
        case 'meat-more': if (c.meats.length < max) c.meats.push(v); break;
        case 'sauce': { const i = c.sauces.indexOf(v); if (i >= 0) c.sauces.splice(i, 1); else if (c.sauces.length < 2) c.sauces.push(v); else return toast('2 sauces maximum. Retirez-en une d\'abord.'); break; }
        case 'cheese': { const i = c.cheeses.indexOf(v); if (i >= 0) c.cheeses.splice(i, 1); else c.cheeses.push(v); break; }
        case 'gratin': c.gratin = c.gratin === v ? null : v; break;
        case 'fries': c.fries = !c.fries; break;
        case 'drink': c.drink = v; c.errors = c.errors.filter(x => x !== 'drink'); break;
        case 'add': {
          c.errors = []; if (!c.meats.length) c.errors.push('meats'); if (!c.drink) c.errors.push('drink');
          if (c.errors.length) { refresh(); const el = $('.step.is-error'); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return toast(c.errors[0] === 'meats' ? 'Choisissez au moins une viande' : 'Choisissez votre boisson'); }
          const s = size();
          const details = [c.meats.join(', '), c.sauces.length ? c.sauces.join(', ') : 'Sans sauce'];
          if (c.cheeses.length) details.push('Suppl. ' + c.cheeses.join(', '));
          if (c.gratin) details.push('Gratiné ' + c.gratin.toLowerCase());
          if (c.fries) details.push('Frites supplémentaires');
          details.push(c.drink);
          addToCart({ name: `Tacos ${s.id}`, cat: 'tacos', qty: c.qty, unit: unit(), details });
          closeSheet(); return;
        }
        default: return;
      }
      refresh();
    });
  }

  /* ---------- Fiche produit générique (tailles et options) ---------- */
  function openProduct(p) {
    const s = { size: p.sizes ? (p.sizes.find(x => x.bogo) || p.sizes[0]).id : null, opts: {}, qty: 1, free: p.name, errors: [] };
    (p.options || []).forEach(g => { s.opts[g.id] = []; });
    const size = () => p.sizes && p.sizes.find(x => x.id === s.size);
    const unit = () => (p.sizes ? size().price : p.price) + (p.options || []).reduce((a, g) => a + s.opts[g.id].reduce((b, l) => b + ((g.choices.find(ch => ch.label === l) || {}).price || 0), 0), 0);

    const body = () => {
      let n = 0; const parts = [];
      if (p.sizes) {
        n++; parts.push(`<div class="step">${stepHead(n, 'La taille', p.bogo ? 'Senior et Mega : la 2e pizza est offerte' : '', { text: size().label, cls: 'is-ok' })}
          <div class="sizes" style="grid-template-columns:repeat(${p.sizes.length},1fr)">${p.sizes.map(x => `<button type="button" class="size ${x.id === s.size ? 'is-selected' : ''}" data-act="size" data-v="${x.id}"><b>${x.label}</b><small>${x.hint}</small><span class="price">${fmt(x.price)}</span></button>`).join('')}</div></div>`);
        if (p.bogo && size().bogo) {
          n++; const recipes = PRODUCTS.filter(x => x.cat === 'pizzas');
          parts.push(`<div class="step">${stepHead(n, 'Votre pizza offerte', 'Même taille, recette au choix', { text: s.free, cls: 'is-ok' })}
            <div class="bogo-note" style="margin:0 0 10px">${icon('star')}1 ${size().label} achetée = 1 ${size().label} offerte, sur place et à emporter.</div>
            <div class="chips">${recipes.map(r => chip(r.name, { sel: s.free === r.name, act: 'free' })).join('')}</div></div>`);
        }
      }
      (p.options || []).forEach(g => {
        n++; const sel = s.opts[g.id]; const req = g.min > 0;
        const count = g.max > 1
          ? { text: `${sel.length}/${g.max}`, cls: sel.length >= g.min ? 'is-ok' : (req ? 'is-need' : '') }
          : (sel.length ? { text: sel[0], cls: 'is-ok' } : (req ? { text: 'À choisir', cls: 'is-need' } : null));
        const hint = g.max > 1 ? `${req ? 'Au moins ' + g.min + ', ' : ''}${g.max} maximum` : (req ? '1 choix' : 'Optionnel');
        parts.push(`<div class="step ${s.errors.includes(g.id) ? 'is-error' : ''}">${stepHead(n, g.label, hint, count)}
          <div class="chips">${g.choices.map(ch => chip(ch.label, { sel: sel.includes(ch.label), dis: !sel.includes(ch.label) && sel.length >= g.max && g.max > 1, act: 'opt', g: g.id, price: ch.price })).join('')}</div></div>`);
      });
      if (!parts.length) parts.push(`<div class="step"><p class="muted">${p.formula ? esc(p.formula) + '. ' : ''}Ajoutez directement au panier, ou précisez une demande au moment du paiement.</p></div>`);
      return parts.join('');
    };
    const media = `<div class="sheet__media" style="margin-top:12px">${ph('', 'Photo ' + esc(p.name))}</div>`;
    const foot = () => `${qtyHTML(s.qty, 'p-qty')}<button class="btn btn--primary" data-act="add">Ajouter <span class="price" id="sheetTotal">${fmt(unit() * s.qty)}</span></button>`;
    const refresh = () => rerenderSheetBody(media + body(), foot());
    const sub = [p.desc, p.formula].filter(Boolean).join(' · ') + (p.tbc ? ' · Prix à confirmer' : '');

    openSheet(sheetShell({ title: esc(p.name), sub: esc(sub), media, body: body(), foot: foot() }), e => {
      const b = e.target.closest('[data-act], [data-action]'); if (!b) return;
      if (b.dataset.action === 'sheet-close') return closeSheet();
      if (b.dataset.action === 'p-qty') { s.qty = Math.max(1, Math.min(9, s.qty + Number(b.dataset.delta))); return refresh(); }
      const v = b.dataset.v;
      switch (b.dataset.act) {
        case 'size': s.size = v; break;
        case 'free': s.free = v; break;
        case 'opt': {
          const g = p.options.find(x => x.id === b.dataset.g); const sel = s.opts[g.id]; const i = sel.indexOf(v);
          if (g.max === 1) s.opts[g.id] = (i >= 0 && g.min === 0) ? [] : [v];
          else if (i >= 0) sel.splice(i, 1);
          else if (sel.length < g.max) sel.push(v);
          else return toast(`${g.max} maximum pour « ${g.label} »`);
          s.errors = s.errors.filter(x => x !== g.id); break;
        }
        case 'add': {
          s.errors = (p.options || []).filter(g => s.opts[g.id].length < g.min).map(g => g.id);
          if (s.errors.length) { refresh(); const el = $('.step.is-error'); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return toast('Il manque un choix : ' + p.options.find(g => g.id === s.errors[0]).label.toLowerCase()); }
          const details = [];
          if (p.sizes) { details.push(size().label); if (p.bogo && size().bogo) details.push('Pizza offerte : ' + s.free); }
          (p.options || []).forEach(g => { if (s.opts[g.id].length) details.push(s.opts[g.id].join(', ')); });
          if (!p.sizes && !p.options && p.formula) details.push(p.formula);
          addToCart({ name: (p.cat === 'pizzas' ? 'Pizza ' : '') + p.name, cat: p.cat, qty: s.qty, unit: unit(), details, tbc: p.tbc });
          closeSheet(); return;
        }
        default: return;
      }
      refresh();
    });
  }

  /* ---------- Panier ---------- */
  function addToCart(item) {
    item.unit = Math.round(item.unit * 100) / 100;
    item.key = item.name + '|' + item.details.join('|');
    const same = state.cart.find(i => i.key === item.key);
    if (same) same.qty += item.qty; else state.cart.push(item);
    persist(); updateCartUI();
    bumpCart();
    toast(`${item.name} ajouté au panier`, 'bag');
  }
  function bumpCart() {
    $$('.cart-btn, .tabbar__cartwrap').forEach(el => { el.classList.remove('is-cart-bump'); void el.offsetWidth; el.classList.add('is-cart-bump'); });
  }
  function flashAdded(btn) {
    if (!btn || !btn.classList.contains('add')) return;
    btn.classList.add('is-added');
    setTimeout(() => btn.classList.remove('is-added'), 1100);
  }
  const onCarte = () => (location.hash || '#/').startsWith('#/carte');
  const cartCount = () => state.cart.reduce((a, i) => a + i.qty, 0);
  const subtotal = () => state.cart.reduce((a, i) => a + i.qty * i.unit, 0);
  const deliveryFee = () => state.mode === 'livraison' && subtotal() < RESTAURANT.delivery.freeFrom ? RESTAURANT.delivery.fee : 0;
  const total = () => subtotal() + deliveryFee();
  function updateCartUI() {
    const n = cartCount();
    $$('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
    $$('[data-cart-total]').forEach(el => el.textContent = fmt(subtotal()));
    const onMenu = onCarte();
    $('#cartBar').hidden = !(onMenu && n > 0);
    const side = $('#menuCart'); if (side) side.innerHTML = sideCartHTML();
  }

  /* ---------- Vue : Panier et tunnel (3 étapes) ---------- */
  const stepper = cur => `<ol class="stepper">${['Panier', 'Retrait', 'Paiement'].map((l, i) => `<li class="${i + 1 < cur ? 'is-done' : i + 1 === cur ? 'is-current' : ''}">${i + 1}. ${l}</li>`).join('')}</ol>`;
  function totalsHTML() {
    const fee = deliveryFee();
    return `<div class="totals">
      <div><span>Sous-total (${cartCount()} article${cartCount() > 1 ? 's' : ''})</span><span>${fmt(subtotal())}</span></div>
      ${state.mode === 'livraison' ? `<div class="${fee ? '' : 'is-free'}"><span>Livraison</span><span>${fee ? fmt(fee) : 'Offerte'}</span></div>` : '<div><span>Frais de service</span><span class="is-free">0,00 €</span></div>'}
      <div class="total"><span>Total TTC</span><span class="price price--red">${fmt(total())}</span></div>
    </div>`;
  }
  function modePanel() {
    return `<div class="panel"><div class="panel__title">${icon('store')} Comment récupérer la commande ?</div>
      <div class="segmented">${Object.entries(MODES).map(([id, m]) => `<button type="button" class="${state.mode === id ? 'is-selected' : ''}" data-action="set-mode" data-mode="${id}">${icon(m.icon)}${m.label}</button>`).join('')}</div>
      <p class="mode-note">${icon('check')}<span>${MODES[state.mode].note}</span></p></div>`;
  }
  const miniSummary = () => `<div class="summary-mini">${state.cart.map(i => `<div><span>${i.qty} x ${esc(i.name)}</span><b>${fmt(i.unit * i.qty)}</b></div>`).join('')}</div>`;
  function viewCart() {
    if (!state.cart.length) {
      return `<div class="page checkout"><div class="checkout__head">${stepper(1)}<h1 class="page-title">Mon panier</h1></div>
        <div class="empty" style="grid-column:1/-1"><p class="display">Votre panier est vide</p><p>Il est encore temps de ne pas cuisiner ce soir.</p><a class="btn btn--primary btn--xl" href="#/carte" style="margin-top:18px">Voir la carte</a></div></div>`;
    }
    const items = state.cart.map(i => `<div class="cart-item">
      ${ph('', '')}
      <div>
        <div class="cart-item__name"><span>${esc(i.name)}</span><span class="price">${fmt(i.unit * i.qty)}</span></div>
        <div class="cart-item__details">${i.details.map(esc).join(' · ')}${i.tbc ? ' · <em>prix à confirmer</em>' : ''}</div>
        <div class="cart-item__row">
          <div class="qty qty--sm"><button data-action="cart-qty" data-key="${esc(i.key)}" data-delta="-1" aria-label="Moins">${icon('minus')}</button><span>${i.qty}</span><button data-action="cart-qty" data-key="${esc(i.key)}" data-delta="1" aria-label="Plus">${icon('plus')}</button></div>
          <button class="cart-item__remove" data-action="cart-remove" data-key="${esc(i.key)}">${icon('trash')} Retirer</button>
        </div>
      </div></div>`).join('');
    const minOk = state.mode !== 'livraison' || subtotal() >= RESTAURANT.delivery.minimum;
    return `<div class="page checkout">
      <div class="checkout__head">${stepper(1)}<h1 class="page-title">Mon panier</h1><p class="page-sub">${cartCount()} article${cartCount() > 1 ? 's' : ''}, modifiable jusqu'au paiement.</p></div>
      <div class="checkout__main">
        <div class="cart-list">${items}</div>
        <a href="#/carte" class="btn btn--ghost btn--block" style="margin-top:12px">${icon('plus')} Ajouter des articles</a>
        ${modePanel()}
      </div>
      <aside class="checkout__aside">
        <div class="panel"><div class="panel__title">Récapitulatif</div>${totalsHTML()}
          ${!minOk ? `<p class="mode-note" style="color:var(--red)">${icon('clock')}<span>Minimum de commande en livraison : ${fmt(RESTAURANT.delivery.minimum)}. Ajoutez ${fmt(RESTAURANT.delivery.minimum - subtotal())} pour continuer.</span></p>` : ''}
        </div>
        <div class="cta-sticky"><a class="btn btn--primary btn--xl btn--block ${minOk ? '' : 'is-disabled'}" ${minOk ? '' : 'aria-disabled="true"'} href="#/commande">Continuer <span class="price">${fmt(total())}</span></a></div>
      </aside>
    </div>`;
  }
  function viewRetrait() {
    const ck = state.checkout; const m = MODES[state.mode]; const slots = timeSlots(); const o = openStatus();
    if (!o.open && ck.slot === 'asap' && slots.length) ck.slot = slots[0];
    const addr = state.mode === 'livraison' ? `<div class="panel"><div class="panel__title">${icon('pin')} Adresse de livraison</div>
        ${state.addresses.length ? `<div class="saved-addr">${state.addresses.map(a => `<button type="button" class="opt ${ck.addrId === a.id ? 'is-selected' : ''}" data-action="use-addr" data-id="${a.id}"><span class="opt__box opt__box--round">${icon('check')}</span><span class="opt__label">${esc(a.label)}<small>${esc(a.line1)}${a.extra ? ', ' + esc(a.extra) : ''}, ${esc(a.city)}</small></span></button>`).join('')}
          <button type="button" class="opt ${ck.addrId === 'new' ? 'is-selected' : ''}" data-action="use-addr" data-id="new"><span class="opt__box opt__box--round">${icon('check')}</span><span class="opt__label">Une autre adresse</span></button></div>` : ''}
        <div id="addrForm" ${(state.addresses.length && ck.addrId !== 'new') ? 'hidden' : ''}>
          <div class="field"><label for="f-address">Adresse</label><input id="f-address" name="address" autocomplete="street-address" placeholder="N° et rue" value="${esc(ck.address)}"><span class="field__err">Indiquez votre adresse</span></div>
          <div class="field-row">
            <div class="field"><label for="f-extra">Complément</label><input id="f-extra" name="extra" placeholder="Bât., étage, code" value="${esc(ck.extra)}"></div>
            <div class="field"><label for="f-city">Ville</label><select id="f-city" name="city">${RESTAURANT.delivery.zones.map(z => `<option ${ck.city === z ? 'selected' : ''}>${z}</option>`).join('')}</select></div>
          </div>
        </div>
        <p class="mode-note">${icon('scooter')}<span>Zones livrées : ${RESTAURANT.delivery.zones.join(', ')}.</span></p>
      </div>` : '';
    return `<div class="page checkout">
      <div class="checkout__head">${stepper(2)}<a class="back-link" href="#/panier">${icon('back')} Retour au panier</a><h1 class="page-title">${m.label}</h1><p class="page-sub">${state.mode === 'livraison' ? 'Quand et où voulez-vous être livré ?' : 'Quand souhaitez-vous récupérer votre commande ?'}</p></div>
      <form class="checkout__main" id="retraitForm" novalidate>
        <div class="panel"><div class="panel__title">${icon('clock')} Créneau</div>
          <div class="slots">
            <button type="button" class="slot ${ck.slot === 'asap' ? 'is-selected' : ''}" data-action="set-slot" data-slot="asap" ${o.open ? '' : 'disabled'}>Dès que possible<small>${state.mode === 'livraison' ? 'env. 35 min' : 'env. 20 min'}</small></button>
            ${slots.map(s => `<button type="button" class="slot ${ck.slot === s ? 'is-selected' : ''}" data-action="set-slot" data-slot="${s}">${s.replace(':', 'h')}<small>${state.mode === 'livraison' ? 'livré vers' : 'prêt à'}</small></button>`).join('')}
          </div>
          ${!o.open ? `<p class="mode-note">${icon('clock')}<span>${o.label}. ${slots.length ? 'Vous pouvez précommander pour plus tard.' : 'Les commandes rouvrent demain à l\'ouverture.'}</span></p>` : ''}
        </div>
        ${addr}
        <div class="panel"><div class="panel__title">${icon('user')} Vos coordonnées</div>
          <div class="field"><label for="f-name">Prénom</label><input id="f-name" name="name" autocomplete="given-name" placeholder="Pour vous appeler quand c'est prêt" value="${esc(ck.name)}" required><span class="field__err">Indiquez votre prénom</span></div>
          <div class="field-row">
            <div class="field"><label for="f-phone">Téléphone</label><input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="06 00 00 00 00" value="${esc(ck.phone)}" required><span class="field__err">Numéro à 10 chiffres</span></div>
            <div class="field"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="Pour le reçu" value="${esc(ck.email)}" required><span class="field__err">E-mail invalide</span></div>
          </div>
          <div class="field"><label for="f-note">Un mot pour la cuisine (optionnel)</label><textarea id="f-note" name="note" placeholder="Sans oignons, sauce à part, bien gratiné...">${esc(ck.note)}</textarea></div>
        </div>
      </form>
      <aside class="checkout__aside">
        <div class="panel"><div class="panel__title">Récapitulatif</div>${miniSummary()}<div style="height:12px"></div>${totalsHTML()}</div>
        <div class="cta-sticky"><button class="btn btn--primary btn--xl btn--block" data-action="go-pay">Vers le paiement <span class="price">${fmt(total())}</span></button></div>
      </aside>
    </div>`;
  }
  function viewPaiement() {
    const ck = state.checkout; const m = MODES[state.mode];
    const slotLabel = ck.slot === 'asap' ? 'Dès que possible' : ck.slot.replace(':', 'h');
    const canOnsite = state.mode !== 'livraison';
    if (!canOnsite) ck.pay = 'card';
    return `<div class="page checkout">
      <div class="checkout__head">${stepper(3)}<a class="back-link" href="#/commande">${icon('back')} Retour</a><h1 class="page-title">Paiement</h1><p class="page-sub">Dernière étape. Votre commande part en cuisine dès validation.</p></div>
      <form class="checkout__main" id="payForm" novalidate>
        <div class="panel"><div class="panel__title">${icon('card')} Moyen de paiement</div>
          <div class="pay-methods">
            <button type="button" class="opt ${ck.pay === 'card' ? 'is-selected' : ''}" data-action="set-pay" data-pay="card"><span class="opt__box opt__box--round">${icon('check')}</span><span class="opt__label">Carte bancaire<small>Visa, Mastercard, CB. Paiement sécurisé 3-D Secure.</small></span></button>
            ${canOnsite ? `<button type="button" class="opt ${ck.pay === 'onsite' ? 'is-selected' : ''}" data-action="set-pay" data-pay="onsite"><span class="opt__box opt__box--round">${icon('check')}</span><span class="opt__label">Payer au restaurant<small>Carte, espèces ou ticket resto au comptoir.</small></span></button>` : ''}
          </div>
          <div id="cardForm" ${ck.pay === 'card' ? '' : 'hidden'}>
            <div class="card-visual">
              <div class="field"><label for="c-num">Numéro de carte</label><input id="c-num" name="cnum" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" maxlength="19"><span class="field__err">16 chiffres attendus</span></div>
              <div class="field-row">
                <div class="field"><label for="c-exp">Expiration</label><input id="c-exp" name="cexp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" maxlength="5"><span class="field__err">Format MM/AA</span></div>
                <div class="field"><label for="c-cvc">CVC</label><input id="c-cvc" name="ccvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"><span class="field__err">3 chiffres</span></div>
              </div>
              <div class="field" style="margin:0"><label for="c-name">Nom sur la carte</label><input id="c-name" name="cname" autocomplete="cc-name" placeholder="Comme indiqué sur la carte"><span class="field__err">Nom requis</span></div>
            </div>
            <p class="secure">${icon('lock')} Paiement chiffré, aucune donnée bancaire stockée par le restaurant.</p>
          </div>
        </div>
      </form>
      <aside class="checkout__aside">
        <div class="panel"><div class="panel__title">Votre commande</div>
          <div class="summary-mini">
            <div><span>Mode</span><b>${m.label}</b></div>
            <div><span>Créneau</span><b>${slotLabel}</b></div>
            ${state.mode === 'livraison' ? `<div><span>Adresse</span><b style="text-align:right">${esc(resolvedAddress())}</b></div>` : ''}
            <div><span>Contact</span><b>${esc(ck.name)} · ${esc(ck.phone)}</b></div>
          </div>
          <div style="height:10px;border-bottom:1px dashed var(--grey-2);margin-bottom:10px"></div>
          ${miniSummary()}
          <div style="height:12px"></div>${totalsHTML()}
        </div>
        <div class="cta-sticky"><button class="btn btn--primary btn--xl btn--block" data-action="place-order">${ck.pay === 'card' ? 'Payer' : 'Commander'} <span class="price">${fmt(total())}</span></button></div>
      </aside>
    </div>`;
  }
  function mountPaiement() {
    const num = $('#c-num'), exp = $('#c-exp');
    num && num.addEventListener('input', () => { num.value = num.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
    exp && exp.addEventListener('input', () => { const d = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; });
  }
  function resolvedAddress() {
    const ck = state.checkout;
    const a = state.addresses.find(x => x.id === ck.addrId);
    if (a) return `${a.line1}${a.extra ? ', ' + a.extra : ''}, ${a.city}`;
    return `${ck.address}${ck.extra ? ', ' + ck.extra : ''}, ${ZONE_CP[ck.city] || ''} ${ck.city}`.trim();
  }
  function readForm(form) { const d = {}; new FormData(form).forEach((v, k) => d[k] = String(v).trim()); return d; }
  function markInvalid(form, name, bad) { const el = form.elements[name]; if (!el) return; el.classList.toggle('is-invalid', bad); el.closest('.field').classList.toggle('is-invalid', bad); }
  function validateRetrait() {
    const form = $('#retraitForm'); const d = readForm(form); Object.assign(state.checkout, d);
    let ok = true; const bad = (n, cond) => { markInvalid(form, n, cond); if (cond) ok = false; };
    bad('name', !d.name);
    bad('phone', !/^(\+33|0)\s?[1-9](\s?\d{2}){4}$/.test(d.phone.replace(/[.\-]/g, '')));
    bad('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email));
    if (state.mode === 'livraison') {
      const usingSaved = state.addresses.some(a => a.id === state.checkout.addrId);
      if (!usingSaved) { bad('address', !d.address); if (!d.address) { const f = $('#addrForm'); if (f) f.hidden = false; } }
    }
    if (!openStatus().open && state.checkout.slot === 'asap') { ok = false; toast('Le restaurant est fermé, choisissez un créneau'); }
    else if (!ok) { toast('Vérifiez les champs en rouge'); const f = $('input.is-invalid', form); f && f.focus(); }
    persist(); return ok;
  }
  function validatePay() {
    if (state.checkout.pay !== 'card') return true;
    const form = $('#payForm'); const d = readForm(form); let ok = true;
    const bad = (n, cond) => { markInvalid(form, n, cond); if (cond) ok = false; };
    bad('cnum', d.cnum.replace(/\s/g, '').length !== 16); bad('cexp', !/^\d{2}\/\d{2}$/.test(d.cexp)); bad('ccvc', !/^\d{3,4}$/.test(d.ccvc)); bad('cname', !d.cname);
    if (!ok) toast('Vérifiez les informations de carte');
    return ok;
  }
  function placeOrder() {
    const ck = state.checkout;
    const id = 'TF-' + (2041 + state.orders.length);
    const order = {
      id, date: new Date().toISOString(), createdAt: Date.now(), mode: state.mode, slot: ck.slot, pay: ck.pay,
      name: ck.name, phone: ck.phone, address: state.mode === 'livraison' ? resolvedAddress() : '',
      items: state.cart.map(i => Object.assign({}, i)), subtotal: subtotal(), fee: deliveryFee(), total: total(), note: ck.note, status: 'received',
    };
    state.orders.unshift(order);
    state.cart = []; persist(); updateCartUI();
    location.hash = '#/confirmation/' + id;
  }

  /* ---------- Vue : Confirmation et suivi ---------- */
  let trackTimer = null;
  function orderStatus(o) {
    if (o.status === 'done') return 3;
    const t = (Date.now() - (o.createdAt || 0)) / 1000; /* démonstration : progression accélérée */
    return t < 8 ? 0 : t < 22 ? 1 : 2;
  }
  function viewConfirmation(id) {
    const o = state.orders.find(x => x.id === id);
    if (!o) return `<div class="page empty"><p class="display">Commande introuvable</p><a class="btn btn--primary" href="#/carte" style="margin-top:16px">Voir la carte</a></div>`;
    const m = MODES[o.mode]; const st = orderStatus(o);
    const eta = o.slot && o.slot !== 'asap' ? o.slot.replace(':', 'h') : (o.mode === 'livraison' ? '30 à 40 min' : '15 à 20 min');
    const steps = [
      { t: 'Commande reçue', d: 'Le restaurant a bien reçu votre commande' + (o.pay === 'card' ? ' et votre paiement.' : '. Règlement au comptoir.') },
      { t: 'En préparation', d: 'La cuisine s\'en occupe. On vous prévient dès que c\'est prêt.' },
      o.mode === 'livraison' ? { t: 'En livraison', d: 'Le livreur est en route vers ' + (o.address || 'votre adresse') + '.' } : { t: 'Prête à récupérer', d: o.mode === 'surplace' ? 'Présentez-vous au comptoir avec votre numéro.' : 'Passez au comptoir, votre sac vous attend.' },
    ];
    const when = new Date(o.date);
    return `<div class="page">
      <section class="confirm">
        <div class="confirm__check">${icon('check')}</div>
        <h1 class="confirm__title">Merci ${esc(o.name || '')} !</h1>
        <p class="muted">Commande passée le ${when.toLocaleDateString('fr-FR')} à ${pad(when.getHours())}h${pad(when.getMinutes())}</p>
        <div class="confirm__num" aria-label="Numéro de commande">${o.id}</div>
        <div class="eta">${icon('clock', 'ico')}<div class="eta__label"><strong>${m.label}</strong>${o.slot && o.slot !== 'asap' ? 'Créneau choisi' : 'Temps estimé'}</div><div class="eta__time">${eta}</div></div>
        <div class="timeline" id="timeline">${steps.map((s, i) => `<div class="tl ${i < st ? 'is-done' : i === st ? 'is-current' : ''}" data-step="${i}">
          <div class="tl__dot">${icon('check')}</div><div><div class="tl__title">${s.t}</div><div class="tl__text">${s.d}</div></div></div>`).join('')}</div>
        <div class="recap panel"><div class="panel__title">Récapitulatif</div>
          <div class="recap__items">${o.items.map(i => `<div class="recap__item"><div>${i.qty} x ${esc(i.name)}<small>${i.details.map(esc).join(' · ')}</small></div><b>${fmt(i.unit * i.qty)}</b></div>`).join('')}</div>
          <div style="height:12px"></div>
          <div class="totals">${o.fee ? `<div><span>Livraison</span><span>${fmt(o.fee)}</span></div>` : ''}<div class="total"><span>Total ${o.pay === 'card' ? 'payé' : 'à régler sur place'}</span><span class="price price--red">${fmt(o.total)}</span></div></div>
        </div>
        <div class="actions-row" style="max-width:420px;margin-inline:auto">
          <a class="btn btn--light" href="${RESTAURANT.phoneHref}">${icon('phone')} Appeler le resto</a>
          <a class="btn btn--dark" href="#/compte">Mes commandes</a>
        </div>
        <p class="small muted" style="margin:18px auto 0;max-width:420px">Un reçu a été envoyé par e-mail. Un problème ? Appelez-nous, on règle ça tout de suite.</p>
      </section>
      <div style="height:32px"></div>
    </div>`;
  }
  function mountTracking(id) {
    const o = state.orders.find(x => x.id === id); if (!o || o.status === 'done') return;
    trackTimer = setInterval(() => {
      const st = orderStatus(o);
      $$('#timeline .tl').forEach((el, i) => { el.classList.toggle('is-done', i < st); el.classList.toggle('is-current', i === st); });
      if (st >= 2) { clearInterval(trackTimer); trackTimer = null; }
    }, 1000);
  }

  /* ---------- Vue : Espace client ---------- */
  function viewAccount() {
    const tab = state.accountTab;
    const orders = state.orders.map(o => {
      const live = o.status !== 'done' && (Date.now() - (o.createdAt || 0)) < 3600 * 1000;
      const d = new Date(o.date);
      return `<div class="order-card">
        <div class="order-card__head"><div><div class="order-card__num">${o.id}</div><div class="order-card__date">${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${MODES[o.mode].label}</div></div><span class="status-pill ${live ? 'is-live' : 'is-done'}">${live ? 'En cours' : 'Terminée'}</span></div>
        <div class="order-card__items">${o.items.map(i => `${i.qty} x ${esc(i.name)}`).join(', ')}</div>
        <div class="order-card__foot"><span class="price">${fmt(o.total)}</span>
          <div style="display:flex;gap:6px">${live ? `<a class="btn btn--ghost btn--sm" href="#/confirmation/${o.id}">Suivre</a>` : ''}<button class="btn btn--primary btn--sm" data-action="reorder" data-id="${o.id}">${icon('redo')} Recommander</button></div></div>
      </div>`;
    }).join('');
    const addresses = state.addresses.map(a => `<div class="addr-card ${a.isDefault ? 'is-default' : ''}">${icon('pin')}
      <div><div class="addr-card__label">${esc(a.label)} ${a.isDefault ? '<span class="badge badge--outline">Par défaut</span>' : ''}</div><div class="addr-card__text">${esc(a.line1)}${a.extra ? ', ' + esc(a.extra) : ''}<br>${esc(a.city)}</div></div>
      <div class="addr-card__actions">${a.isDefault ? '' : `<button data-action="addr-default" data-id="${a.id}" aria-label="Définir par défaut" title="Définir par défaut">${icon('check')}</button>`}<button data-action="addr-remove" data-id="${a.id}" aria-label="Supprimer" title="Supprimer">${icon('trash')}</button></div></div>`).join('');
    const panels = {
      orders: `<div class="list">${orders || '<div class="empty">Aucune commande pour le moment.</div>'}</div>`,
      addresses: `<div class="list">${addresses || '<div class="empty">Aucune adresse enregistrée.</div>'}<button class="btn btn--ghost btn--block" data-action="addr-add">${icon('plus')} Ajouter une adresse</button></div>`,
      profile: `<div class="panel" style="margin:0"><div class="field"><label>Prénom</label><input value="${esc(state.user.name)}"></div><div class="field"><label>Téléphone</label><input value="${esc(state.user.phone)}"></div><div class="field"><label>E-mail</label><input value="${esc(state.user.email)}"></div>
        <button type="button" class="opt is-selected" style="margin-bottom:12px;width:100%" data-action="toggle-opt"><span class="opt__box">${icon('check')}</span><span class="opt__label">Recevoir les offres par SMS<small>Promos pizza, nouveautés, 2 fois par mois maximum</small></span></button>
        <div class="actions-row" style="margin:0"><button class="btn btn--dark" type="button" data-action="toast" data-msg="Informations enregistrées">Enregistrer</button><button class="btn btn--ghost" type="button" data-action="toast" data-msg="Déconnexion (démo)">Se déconnecter</button></div></div>`,
    };
    return `<div class="page">
      <div class="account-head"><div class="account-head__inner"><div class="avatar">${esc(state.user.name[0])}</div><div><h1>Salut ${esc(state.user.name)}</h1><p>${state.orders.length} commande${state.orders.length > 1 ? 's' : ''} · membre depuis septembre 2026</p></div></div></div>
      <div class="tabs" role="tablist">
        <button role="tab" class="${tab === 'orders' ? 'is-active' : ''}" data-action="account-tab" data-tab="orders">Mes commandes</button>
        <button role="tab" class="${tab === 'addresses' ? 'is-active' : ''}" data-action="account-tab" data-tab="addresses">Adresses</button>
        <button role="tab" class="${tab === 'profile' ? 'is-active' : ''}" data-action="account-tab" data-tab="profile">Mes infos</button>
      </div>
      <div class="section account-body" style="padding-top:16px">${panels[tab]}</div>
    </div>`;
  }

  /* ---------- Vue : Infos pratiques ---------- */
  function viewInfos() {
    const o = openStatus(); const ti = todayIndex();
    const colors = { instagram: '#E1306C', snapchat: '#E5C300', tiktok: '#141414', facebook: '#1877F2' };
    return `<div class="page">
      <section class="section" style="padding-bottom:0"><div class="section__head" style="max-width:var(--max);margin-inline:auto"><div><span class="kicker">Infos pratiques</span><h1 class="section__title">Venir, appeler, <em>suivre</em></h1></div></div></section>
      <section class="section infos-grid" style="padding-top:12px">
        <div>
          <div class="panel" style="margin:0">
            <div class="panel__title">${icon('clock')} Horaires <span class="open-pill ${o.open ? '' : 'is-closed'}" style="margin-left:auto">${o.label}</span></div>
            <ul class="hours">${RESTAURANT.hours.map((h, i) => `<li class="${i === ti ? 'is-today' : ''}"><span>${h.day}</span><span>${hm(h.open)} à ${hm(h.close)}</span></li>`).join('')}</ul>
          </div>
          <div class="panel">
            <div class="panel__title">${icon('pin')} Adresse</div>
            <p><strong>${RESTAURANT.address.line1}</strong><br>${RESTAURANT.address.city}</p>
            <div class="actions-row" style="margin-top:14px">
              <a class="btn btn--primary" href="${RESTAURANT.phoneHref}">${icon('phone')} ${RESTAURANT.phone}</a>
              <a class="btn btn--dark" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(RESTAURANT.mapsQuery)}" target="_blank" rel="noopener">${icon('route')} Itinéraire</a>
            </div>
          </div>
          <div class="panel">
            <div class="panel__title">${icon('scooter')} Zones de livraison</div>
            <div class="zones">${RESTAURANT.delivery.zones.map(z => `<span>${z}</span>`).join('')}</div>
            <p class="small muted" style="margin-top:10px">Livraison ${fmt(RESTAURANT.delivery.fee)}, offerte dès ${fmt(RESTAURANT.delivery.freeFrom)} de commande. Minimum ${fmt(RESTAURANT.delivery.minimum)}.</p>
          </div>
        </div>
        <div>
          <div class="map"><iframe title="Plan d'accès Tacos Fox" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(RESTAURANT.mapsQuery)}&output=embed"></iframe></div>
          <div class="panel">
            <div class="panel__title">Suivez-nous</div>
            <div class="social">${RESTAURANT.social.map(s => `<a href="${s.href}" target="_blank" rel="noopener"><span class="social__dot" style="background:${colors[s.id]}">${s.label[0]}</span>${s.label}</a>`).join('')}</div>
          </div>
          <div class="panel" style="background:var(--black);color:#fff">
            <div class="panel__title" style="color:#fff">${icon('halal')} ${RESTAURANT.halal}</div>
            <p class="small" style="color:rgba(255,255,255,.75)">Toutes nos viandes sont contrôlées et certifiées. Le certificat est affiché en salle et disponible sur demande.</p>
          </div>
        </div>
      </section>
      ${footerHTML()}
    </div>`;
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg, ico = 'check') {
    const t = $('#toast'); t.innerHTML = `${icon(ico)}<span>${esc(msg)}</span>`; t.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2200);
  }

  /* ---------- Actions déléguées ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    if (sheet.contains(el)) return; /* géré par la feuille */
    const a = el.dataset.action;
    switch (a) {
      case 'add': { e.preventDefault(); const p = byId(el.dataset.id); if (p.sizes || p.options) openProduct(p); else { addToCart({ name: p.name, cat: p.cat, qty: 1, unit: p.price, details: p.formula ? [p.formula] : [], tbc: p.tbc }); flashAdded(el); } break; }
      case 'open-tacos': e.preventDefault(); openTacos(el.dataset.size || 'M'); break;
      case 'set-mode-go': state.mode = el.dataset.mode; persist(); break;
      case 'set-mode': state.mode = el.dataset.mode; persist(); render(); break;
      case 'set-slot': state.checkout.slot = el.dataset.slot; persist(); $$('.slot').forEach(s => s.classList.toggle('is-selected', s.dataset.slot === el.dataset.slot)); break;
      case 'use-addr': { state.checkout.addrId = el.dataset.id; persist(); $$('[data-action="use-addr"]').forEach(s => s.classList.toggle('is-selected', s.dataset.id === el.dataset.id)); const f = $('#addrForm'); if (f) f.hidden = el.dataset.id !== 'new'; break; }
      case 'set-pay': {
        state.checkout.pay = el.dataset.pay; persist();
        $$('[data-action="set-pay"]').forEach(s => s.classList.toggle('is-selected', s.dataset.pay === el.dataset.pay));
        const cf = $('#cardForm'); if (cf) cf.hidden = el.dataset.pay !== 'card';
        const btn = $('[data-action="place-order"]'); if (btn) btn.innerHTML = `${el.dataset.pay === 'card' ? 'Payer' : 'Commander'} <span class="price">${fmt(total())}</span>`;
        break;
      }
      case 'go-pay': e.preventDefault(); if (validateRetrait()) location.hash = '#/paiement'; break;
      case 'place-order': e.preventDefault(); if (validatePay()) { el.setAttribute('aria-disabled', 'true'); el.innerHTML = 'Validation...'; setTimeout(placeOrder, 700); } break;
      case 'cart-qty': { const it = state.cart.find(i => i.key === el.dataset.key); if (!it) break; it.qty += Number(el.dataset.delta); if (it.qty <= 0) state.cart = state.cart.filter(i => i !== it); persist(); updateCartUI(); if (!onCarte()) render(); break; }
      case 'cart-remove': state.cart = state.cart.filter(i => i.key !== el.dataset.key); persist(); updateCartUI(); if (!onCarte()) render(); toast('Article retiré'); break;
      case 'reorder': {
        const o = state.orders.find(x => x.id === el.dataset.id); if (!o) break;
        o.items.forEach(i => { const c = Object.assign({}, i); const same = state.cart.find(x => x.key === c.key); if (same) same.qty += c.qty; else state.cart.push(c); });
        state.mode = o.mode; persist(); updateCartUI(); toast('Commande ajoutée au panier', 'bag'); location.hash = '#/panier'; break;
      }
      case 'account-tab': state.accountTab = el.dataset.tab; render(); break;
      case 'addr-default': state.addresses.forEach(x => x.isDefault = x.id === el.dataset.id); persist(); render(); break;
      case 'addr-remove': state.addresses = state.addresses.filter(x => x.id !== el.dataset.id); if (state.addresses.length && !state.addresses.some(x => x.isDefault)) state.addresses[0].isDefault = true; persist(); render(); toast('Adresse supprimée'); break;
      case 'addr-add': openAddressSheet(); break;
      case 'toggle-opt': el.classList.toggle('is-selected'); break;
      case 'toast': toast(el.dataset.msg); break;
    }
  });

  /* Carte produit : un appui en dehors du bouton + ouvre la fiche */
  document.addEventListener('click', e => {
    const card = e.target.closest('.card[data-product]'); if (!card || e.target.closest('[data-action]')) return;
    openProduct(byId(card.dataset.product));
  });

  function openAddressSheet() {
    openSheet(sheetShell({
      title: 'Nouvelle adresse', sub: 'Enregistrée pour vos prochaines livraisons',
      body: `<form id="addrNew" class="step" novalidate>
        <div class="field"><label for="a-label">Nom</label><input id="a-label" name="label" placeholder="Maison, Travail, Chez Mamie..."></div>
        <div class="field"><label for="a-line1">Adresse</label><input id="a-line1" name="line1" placeholder="N° et rue"><span class="field__err">Adresse requise</span></div>
        <div class="field-row"><div class="field"><label for="a-extra">Complément</label><input id="a-extra" name="extra" placeholder="Bât., étage, code"></div>
        <div class="field"><label for="a-city">Ville</label><select id="a-city" name="city">${RESTAURANT.delivery.zones.map(z => `<option>${z}</option>`).join('')}</select></div></div>
      </form>`,
      foot: `<span></span><button class="btn btn--primary" data-act="save">Enregistrer l'adresse</button>`,
    }), e => {
      const b = e.target.closest('[data-act], [data-action]'); if (!b) return;
      if (b.dataset.action === 'sheet-close') return closeSheet();
      if (b.dataset.act === 'save') {
        const f = $('#addrNew'); const d = readForm(f);
        if (!d.line1) { markInvalid(f, 'line1', true); return; }
        state.addresses.push({ id: 'a' + Date.now(), label: d.label || 'Adresse', line1: d.line1, extra: d.extra, city: `${ZONE_CP[d.city] || ''} ${d.city}`.trim(), isDefault: !state.addresses.length });
        persist(); closeSheet(); render(); toast('Adresse enregistrée');
      }
    });
  }

  /* ---------- Routeur ---------- */
  const app = $('#app');
  let current = null;
  function parse() {
    const hash = location.hash || '#/';
    const [path, qs] = hash.slice(1).split('?');
    return { seg: path.split('/').filter(Boolean), params: Object.fromEntries(new URLSearchParams(qs || '')) };
  }
  function render() {
    const { seg, params } = parse();
    closeSheet();
    if (spy) { spy.disconnect(); spy = null; }
    if (trackTimer) { clearInterval(trackTimer); trackTimer = null; }
    let html, nav = seg[0] || 'home';
    switch (seg[0]) {
      case undefined: html = viewHome(); break;
      case 'carte': html = viewMenu(); break;
      case 'panier': html = viewCart(); break;
      case 'commande': if (!state.cart.length) { location.hash = '#/panier'; return; } html = viewRetrait(); nav = 'panier'; break;
      case 'paiement': if (!state.cart.length) { location.hash = '#/panier'; return; } html = viewPaiement(); nav = 'panier'; break;
      case 'confirmation': html = viewConfirmation(seg[1]); nav = 'compte'; break;
      case 'compte': html = viewAccount(); break;
      case 'infos': html = viewInfos(); break;
      default: html = viewHome(); nav = 'home';
    }
    const sameRoute = current === seg.join('/');
    const y = window.scrollY;
    app.innerHTML = html;
    $$('[data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === nav));
    if (seg[0] === 'carte') mountMenu(params);
    if (seg[0] === 'paiement') mountPaiement();
    if (seg[0] === 'confirmation') mountTracking(seg[1]);
    if (sameRoute) window.scrollTo(0, y); else if (seg[0] !== 'carte' || !params.cat) window.scrollTo(0, 0);
    current = seg.join('/');
    updateCartUI();
    document.title = (TITLES[seg[0]] ? TITLES[seg[0]] + ' · ' : '') + 'TACOS FOX Stains';
  }
  window.addEventListener('hashchange', render);
  render();
})();
