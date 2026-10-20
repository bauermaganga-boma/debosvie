/* Debos Vie — scripts du site */
(function () {
  'use strict';

  // À compléter par Debos Vie : laisser vide pour masquer
  var CONFIG = {
    email: '',        // ex. 'contact@debosvie.com' → active l'envoi du formulaire par e-mail
    tiktok: '',       // ex. 'https://www.tiktok.com/@...'
    instagram: '',    // ex. 'https://www.instagram.com/...'
    // Réception des demandes dans l'espace de gestion (clé « publishable » : publique par conception)
    supabaseUrl: '',
    supabaseKey: '',
    schema: 'debosvie'
  };

  var DE = document.documentElement.lang === 'de';
  var T = DE ? {
    need: 'Bitte Namen, E-Mail und Projekt angeben.',
    hello: 'Hallo Debos Vie,\n\n', nom: 'Name: ', soc: '\nUnternehmen: ', pack: '\nPaket: ', plat: '\nPlattform: ', proj: '\n\nProjekt:\n',
    subj: 'UGC-Angebotsanfrage', mail: 'Dein E-Mail-Programm öffnet sich mit der vorbereiteten Anfrage.',
    copied: 'Anfrage kopiert! Füge sie in eine Nachricht an Debos Vie über ihren YouTube-Kanal ein.', copy: 'Kopiere deine Anfrage und sende sie über den YouTube-Kanal.',
    open: 'Menü öffnen', close: 'Menü schließen',
    sent: 'Danke! Deine Anfrage ist angekommen – ich melde mich bald bei dir.', sending: 'Wird gesendet…', fail: 'Senden fehlgeschlagen. '
  } : {
    need: 'Merci de renseigner votre nom, votre e-mail et votre projet.',
    hello: 'Bonjour Debos Vie,\n\n', nom: 'Nom : ', soc: '\nEntreprise : ', pack: '\nFormule : ', plat: '\nPlateforme : ', proj: '\n\nProjet :\n',
    subj: 'Demande de devis UGC', mail: 'Votre messagerie s\'ouvre avec la demande pré-remplie.',
    copied: 'Demande copiée ! Collez-la dans un message à Debos Vie via sa chaîne YouTube.', copy: 'Copiez votre demande puis envoyez-la via la chaîne YouTube.',
    open: 'Ouvrir le menu', close: 'Fermer le menu',
    sent: 'Merci ! Votre demande est bien reçue, je reviens vers vous très vite.', sending: 'Envoi en cours…', fail: 'Envoi impossible pour le moment. '
  };

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  document.getElementById('year').textContent = new Date().getFullYear();

  // Miniatures YouTube (dégradé de secours si indisponible)
  $$('[data-thumb]').forEach(function (el) {
    var url = 'https://i.ytimg.com/vi/' + el.getAttribute('data-thumb') + '/hqdefault.jpg';
    var img = new Image();
    img.onload = function () { if (img.naturalWidth > 120) el.style.backgroundImage = 'url(' + url + ')'; };
    img.src = url;
  });

  // Menu mobile
  var burger = $('#burger'), nav = $('#nav');
  function closeNav() { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? T.close : T.open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', closeNav); });

  // Apparitions au défilement
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  // Filtres du portfolio
  $$('.filter').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.filter').forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('active'); b.setAttribute('aria-selected', 'true');
      var f = b.getAttribute('data-f');
      $$('.vid').forEach(function (v) { v.classList.toggle('hide', f !== 'all' && v.getAttribute('data-cat') !== f); });
    });
  });

  // Lecteur vidéo (YouTube sans cookies, chargé au clic)
  var modal = $('#modal'), frame = $('#mFrame'), lastFocus = null;
  function openVid(id) {
    lastFocus = document.activeElement;
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1';
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; $('#mClose').focus();
  }
  function closeVid() {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    frame.src = 'about:blank'; document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-vid]').forEach(function (b) { b.addEventListener('click', function () { openVid(b.getAttribute('data-vid')); }); });
  $('#mClose').addEventListener('click', closeVid);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeVid(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeVid(); });

  // Liens sociaux optionnels
  var links = $('#contactLinks');
  function addLink(label, url) {
    if (!url) return;
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = label; li.appendChild(a); links.appendChild(li);
  }
  addLink('TikTok', CONFIG.tiktok); addLink('Instagram', CONFIG.instagram);
  if (CONFIG.email) addLink(CONFIG.email, 'mailto:' + CONFIG.email);

  // Formules → pré-sélection du formulaire
  $$('[data-pack]').forEach(function (a) {
    a.addEventListener('click', function () { $('#packSel').value = a.getAttribute('data-pack'); });
  });

  // Formulaire de demande de devis
  var form = $('#brief'), msg = $('#formMsg'), btn = $('#sendBtn');

  function fallback(body, prefix) {
    if (CONFIG.email) {
      window.location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(T.subj) + '&body=' + encodeURIComponent(body);
      msg.className = 'form-msg ok'; msg.textContent = T.mail; return;
    }
    var done = function (ok) {
      msg.className = 'form-msg ok';
      msg.textContent = (prefix || '') + (ok ? T.copied : T.copy);
      window.open('https://www.youtube.com/@Debosvie/about', '_blank', 'noopener');
    };
    if (navigator.clipboard) navigator.clipboard.writeText(body).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form), v = function (k) { return String(d.get(k) || '').trim(); };
    if (!v('nom') || !v('message') || v('email').indexOf('@') < 1) {
      msg.className = 'form-msg'; msg.textContent = T.need; return;
    }
    if (v('website')) { msg.className = 'form-msg ok'; msg.textContent = T.sent; return; } // anti-spam : champ piège rempli
    var body = T.hello + T.nom + v('nom') + T.soc + (v('societe') || '—') + '\nE-mail : ' + v('email') + (v('telephone') ? '\nTel : ' + v('telephone') : '') +
      T.pack + v('pack') + T.plat + v('plateforme') + T.proj + v('message');

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) { fallback(body); return; }

    btn.disabled = true; msg.className = 'form-msg'; msg.textContent = T.sending;
    fetch(CONFIG.supabaseUrl + '/rest/v1/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'apikey': CONFIG.supabaseKey, 'Authorization': 'Bearer ' + CONFIG.supabaseKey,
        'Content-Profile': CONFIG.schema, 'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ data: { nom: v('nom'), societe: v('societe'), email: v('email'), telephone: v('telephone'), pack: v('pack'), plateforme: v('plateforme'), message: v('message'), lang: DE ? 'de' : 'fr' } })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      msg.className = 'form-msg ok'; msg.textContent = T.sent; form.reset();
    }).catch(function () {
      btn.disabled = false; fallback(body, T.fail);
    }).then(function () { btn.disabled = false; });
  });
})();
