/* Debos Vie — scripts du site */
(function () {
  'use strict';

  // À compléter par Debos Vie : laisser vide pour masquer
  var CONFIG = {
    email: '',        // ex. 'contact@debosvie.com' → active l'envoi du formulaire par e-mail
    tiktok: '',       // ex. 'https://www.tiktok.com/@...'
    instagram: ''     // ex. 'https://www.instagram.com/...'
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
    burger.setAttribute('aria-expanded', open);
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
  var form = $('#brief'), msg = $('#formMsg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    if (!String(d.get('nom')).trim() || !String(d.get('message')).trim()) {
      msg.className = 'form-msg'; msg.textContent = 'Merci de renseigner votre nom et votre projet.'; return;
    }
    var body = 'Bonjour Debos Vie,\n\nNom : ' + d.get('nom') + '\nEntreprise : ' + (d.get('societe') || '—') +
      '\nFormule : ' + d.get('pack') + '\nPlateforme : ' + d.get('plateforme') + '\n\nProjet :\n' + d.get('message');
    if (CONFIG.email) {
      window.location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Demande de devis UGC') + '&body=' + encodeURIComponent(body);
      msg.className = 'form-msg ok'; msg.textContent = 'Votre messagerie s\'ouvre avec la demande pré-remplie.';
    } else {
      var done = function (ok) {
        msg.className = 'form-msg ok';
        msg.textContent = ok ? 'Demande copiée ! Collez-la dans un message à Debos Vie via sa chaîne YouTube.' : 'Copiez votre demande puis envoyez-la via la chaîne YouTube.';
        window.open('https://www.youtube.com/@Debosvie/about', '_blank', 'noopener');
      };
      if (navigator.clipboard) navigator.clipboard.writeText(body).then(function () { done(true); }, function () { done(false); });
      else done(false);
    }
  });
})();
