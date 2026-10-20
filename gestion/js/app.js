/* Démarrage, connexion, navigation et événements. */
(function () {
  'use strict';
  var G = window.G, $ = G.$, $$ = G.$$, S = Store, A = G.act, V = G.views;

  A.closeModal = function () { G.closeModal(); };
  A.modalBg = function (el, e) { if (e.target === el) G.closeModal(); };
  A.chip = function (el) { G.ui[el.dataset.k] = el.dataset.v; G.render(); };

  function keepFocus(sel) {
    var el = $(sel); if (!el) return; el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
  }

  var ROUTES = {
    dashboard: function () { return V.dashboard(); },
    demandes: function () { return V.demandes(); },
    devis: function (id) { return id ? V.devisEdit(id) : V.devis(); },
    factures: function (id) { return id ? V.factureEdit(id) : V.factures(); },
    contrats: function (id) { return id ? V.contratEdit(id) : V.contrats(); },
    projets: function () { return V.projets(); },
    clients: function () { return V.clients(); },
    modeles: function () { return V.modeles(); },
    parametres: function () { return V.parametres(); }
  };

  G.render = function () {
    var parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/'), r = parts[0];
    if (!ROUTES[r]) { r = 'dashboard'; parts = ['dashboard']; }
    $$('.nav-a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === r); });
    try { $('#view').innerHTML = ROUTES[r](parts[1]); }
    catch (e) { console.error(e); $('#view').innerHTML = '<div class="card"><h2>Une erreur est survenue</h2><p>' + G.esc(e.message) + '</p></div>'; }
    var n = S.db.requests.filter(function (x) { return x.statut === 'nouvelle'; }).length, c = $('#cntReq');
    c.textContent = n; c.classList.toggle('hide', !n);
    if (r !== 'devis' && r !== 'factures' && r !== 'contrats') window.scrollTo(0, 0);
    if (parts[1] && !S.get(r === 'devis' ? 'quotes' : r === 'factures' ? 'invoices' : 'contracts', parts[1])) {}
    var imp = $('#impFile'); if (imp) imp.onchange = importFile;
  };

  function importFile(e) {
    var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function () { try { var j = JSON.parse(rd.result); S.setAll(j.db, j.settings || {}); G.toast('Sauvegarde restaurée ✓'); G.render(); } catch (x) { G.toast('Fichier invalide'); } };
    rd.readAsText(f);
  }

  document.addEventListener('click', async function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var name = el.dataset.act;
    if (name === 'search' || name === 'searchCli') return;
    var fn = A[name]; if (!fn) return;
    try { await fn(el, e); } catch (err) { console.error(err); G.toast('Erreur : ' + err.message); }
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.act === 'search') { G.ui.qs = t.value; G.render(); keepFocus('.search'); return; }
    if (t.dataset.act === 'searchCli') { G.ui.cli = t.value; G.render(); keepFocus('.search'); return; }
    var cur = null; try { cur = window.G.cur(); } catch (x) {}
    if (!cur) return;
    if (t.dataset.b) {
      cur[t.dataset.b] = t.value;
      if (t.dataset.b === 'client_id') { var c = S.get('clients', t.value); if (c) cur.client_nom = G.clientName(c); }
      G.refreshEditor();
    } else if (t.dataset.li !== undefined) { cur.lignes[+t.dataset.li][t.dataset.lf] = t.value; G.refreshEditor(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target, cur = null; try { cur = window.G.cur(); } catch (x) {}
    if (t.id === 'addCat' && t.value && cur) {
      var c = G.S().catalogue.find(function (x) { return x.id === t.value; });
      if (c) { cur.lignes.push({ desc: c.label + (c.desc ? ' — ' + c.desc : ''), qte: 1, pu: c.pu }); G.renderLines(); }
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') G.closeModal(); });
  window.addEventListener('hashchange', function () { G.closeModal(); G.render(); });

  function showApp() {
    $('#login').classList.add('hide'); $('#app').classList.remove('hide');
    $('#demoBar').classList.toggle('hide', S.mode !== 'demo');
    $('#btnLogout').classList.toggle('hide', S.mode !== 'live');
    $('#whoami').textContent = S.mode === 'live' ? 'Connectée' : 'Démo locale';
    G.render();
    if (S.mode === 'live') setInterval(async function () {
      try {
        var before = S.db.requests.filter(function (r) { return r.statut === 'nouvelle'; }).length;
        await S.refresh('requests');
        var after = S.db.requests.filter(function (r) { return r.statut === 'nouvelle'; }).length;
        if (after > before) { G.toast('🔔 Nouvelle demande reçue !'); var h = location.hash; if (!h || /dashboard|demandes/.test(h)) G.render(); }
      } catch (e) {}
    }, 60000);
  }

  async function boot() {
    try {
      var ok = await S.init();
      if (S.mode === 'demo') {
        if (!S.db.clients.length && !S.db.requests.length) { var d = Tpl.demoData(); S.setAll(d.db, d.settings); }
        showApp(); return;
      }
      if (ok) { await S.loadAll(); showApp(); } else { $('#login').classList.remove('hide'); }
    } catch (e) { console.error(e); $('#login').classList.remove('hide'); $('#lErr').textContent = 'Connexion à la base impossible : ' + e.message; }
  }

  $('#loginForm').addEventListener('submit', async function (e) {
    e.preventDefault(); $('#lErr').textContent = '';
    try { await S.login($('#lEmail').value.trim(), $('#lPass').value); await S.loadAll(); showApp(); }
    catch (err) { $('#lErr').textContent = err.message; }
  });
  $('#btnLogout').addEventListener('click', async function () { await S.logout(); location.reload(); });

  boot();
})();
