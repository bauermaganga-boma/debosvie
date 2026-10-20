/* Écrans du back-office. */
(function () {
  'use strict';
  var G = window.G, esc = G.esc, $ = G.$, $$ = G.$$, S = Store;
  var V = G.views = {}, A = G.act = {};
  var UI = G.ui = { req: 'all', qs: '', quo: 'all', inv: 'all', con: 'all', cli: '' };
  var cur = null; // document en cours d'édition

  function top(title, sub, actions) {
    return '<div class="top"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="btns">' + (actions || '') + '</div></div>';
  }
  function chips(list, key) {
    return '<div class="bar">' + list.map(function (c) { return '<button class="chip' + (UI[key] === c[0] ? ' on' : '') + '" data-act="chip" data-k="' + key + '" data-v="' + c[0] + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
  }
  function sum(arr, fn) { var t = 0; arr.forEach(function (x) { t += fn(x); }); return G.r2(t); }
  function cname(doc) { return doc.client_nom || G.clientName(S.get('clients', doc.client_id)) || '—'; }
  function setClientName(doc) { var c = S.get('clients', doc.client_id); if (c) doc.client_nom = G.clientName(c); }
  function fld(label, inner, cls) { return '<label class="fl ' + (cls || '') + '">' + label + inner + '</label>'; }
  function clientOptions(sel) { return '<option value="">— choisir —</option>' + S.db.clients.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(G.clientName(c)) + (c.societe && c.nom ? ' (' + esc(c.nom) + ')' : '') + '</option>'; }).join(''); }
  function goto(h) { location.hash = h; }

  /* ---------- TABLEAU DE BORD ---------- */
  V.dashboard = function () {
    var db = S.db, today = G.today(), ym = today.slice(0, 7), s = G.S();
    var newReq = db.requests.filter(function (r) { return r.statut === 'nouvelle'; });
    var sent = db.quotes.filter(function (q) { return G.quoteStatus(q) === 'envoye'; });
    var cashM = 0, cashY = 0, months = {};
    for (var i = 5; i >= 0; i--) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months[d.toISOString().slice(0, 7)] = 0; }
    db.invoices.forEach(function (inv) { (inv.paiements || []).forEach(function (p) {
      var m = (p.date || '').slice(0, 7), a = G.num(p.montant);
      if (m === ym) cashM += a; if (m.slice(0, 4) === ym.slice(0, 4)) cashY += a; if (m in months) months[m] += a; }); });
    var open = db.invoices.filter(function (i) { var st = G.invStatus(i); return st === 'apayer' || st === 'retard'; });
    var due = sum(open, function (i) { return G.calc(i).ttc - G.paid(i); });
    var late = open.filter(function (i) { return G.invStatus(i) === 'retard'; });
    var won = db.quotes.filter(function (q) { return q.statut === 'accepte'; }).length;
    var decided = won + db.quotes.filter(function (q) { return q.statut === 'refuse' || G.quoteStatus(q) === 'expire'; }).length;
    var maxM = Math.max.apply(null, Object.keys(months).map(function (k) { return months[k]; }).concat([1]));
    var chart = Object.keys(months).map(function (k) {
      var lab = new Date(k + '-15').toLocaleDateString('fr-FR', { month: 'short' });
      return '<div class="bar-c"><span>' + (months[k] ? Math.round(months[k]) : '') + '</span><i style="height:' + Math.max(2, months[k] / maxM * 100) + '%"></i>' + lab + '</div>';
    }).join('');
    var prods = db.projects.filter(function (p) { return p.etape !== 'valide' && p.etape !== 'livre'; }).sort(function (a, b) { return (a.echeance || '9') < (b.echeance || '9') ? -1 : 1; }).slice(0, 5);
    var feed = [];
    db.requests.forEach(function (r) { feed.push({ t: r.created_at, ic: '✉', txt: 'Demande de <b>' + esc(r.societe || r.nom) + '</b>', h: '#/demandes' }); });
    db.quotes.forEach(function (q) { feed.push({ t: q.updated_at, ic: '✎', txt: 'Devis <b>' + esc(q.numero) + '</b> — ' + esc(G.LBL[G.quoteStatus(q)] || ''), h: '#/devis/' + q.id }); });
    db.invoices.forEach(function (i) { feed.push({ t: i.updated_at, ic: '€', txt: 'Facture <b>' + esc(i.numero) + '</b> — ' + esc(G.LBL[G.invStatus(i)] || ''), h: '#/factures/' + i.id }); });
    db.contracts.forEach(function (k) { feed.push({ t: k.updated_at, ic: '§', txt: 'Contrat <b>' + esc(k.titre) + '</b>', h: '#/contrats/' + k.id }); });
    feed.sort(function (a, b) { return a.t < b.t ? 1 : -1; }); feed = feed.slice(0, 8);
    var alerts = '';
    if (late.length) alerts += '<div class="warn" style="background:var(--badbg);color:var(--bad)">⚠ ' + late.length + ' facture(s) en retard (' + G.money(sum(late, function (i) { return G.calc(i).ttc - G.paid(i); })) + ') — <a href="#/factures">voir</a></div>';
    if (!s.iban || !s.adresse) alerts += '<div class="warn">Complétez vos <a href="#/parametres">paramètres</a> (adresse, IBAN, numéro fiscal, tarifs) pour que vos devis et factures soient prêts à envoyer.</div>';
    var pipe = ['nouvelle', 'en cours', 'devis envoyé', 'gagnée', 'perdue'].map(function (k) {
      return '<tr><td>' + G.badge(k) + '</td><td class="num"><b>' + db.requests.filter(function (r) { return r.statut === k; }).length + '</b></td></tr>'; }).join('');
    return top('Tableau de bord', 'Votre activité en un coup d\'œil.', '<a class="btn btn-p" href="#/devis" data-act="newQuote">+ Nouveau devis</a><button class="btn btn-o" data-act="newRequest">+ Demande manuelle</button>') + alerts +
      '<div class="kpis">' +
      '<div class="kpi"><small>Nouvelles demandes</small><b>' + newReq.length + '</b><span><a href="#/demandes">à traiter</a></span></div>' +
      '<div class="kpi"><small>Devis en attente</small><b>' + sent.length + '</b><span>' + G.money(sum(sent, function (q) { return G.calc(q).ttc; })) + ' potentiels</span></div>' +
      '<div class="kpi"><small>Encaissé ce mois</small><b>' + G.money(cashM) + '</b><span>' + G.money(cashY) + ' sur l\'année</span></div>' +
      '<div class="kpi"><small>À encaisser</small><b>' + G.money(due) + '</b><span>' + (late.length ? late.length + ' en retard' : 'aucun retard') + '</span></div></div>' +
      '<div class="grid2"><div><div class="card"><h2>Encaissements des 6 derniers mois</h2><div class="chart">' + chart + '</div></div>' +
      '<div class="card"><h2>Prochaines livraisons</h2>' + (prods.length ? '<table class="t"><tbody>' + prods.map(function (p) {
        var l = p.echeance && p.echeance < today;
        return '<tr class="row" data-act="openProject" data-id="' + p.id + '"><td><b>' + esc(p.titre) + '</b><div class="sub">' + esc(cname(p)) + '</div></td><td>' + G.badge(p.etape) + '</td><td class="num ' + (l ? 'late' : '') + '" ' + (l ? 'style="color:var(--bad);font-weight:700"' : '') + '>' + G.fdate(p.echeance) + (l ? ' ⚠' : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">Aucune production en cours.</div>') + '</div></div>' +
      '<div><div class="card"><h2>Pipeline des demandes</h2><table class="t"><tbody>' + pipe + '</tbody></table><div class="sub" style="margin-top:8px">Taux de conversion des devis : <b>' + (decided ? Math.round(won / decided * 100) + ' %' : '—') + '</b></div></div>' +
      '<div class="card"><h2>Activité récente</h2><ul class="feed">' + (feed.map(function (f) { return '<li><span>' + f.ic + '</span><a href="' + f.h + '" style="text-decoration:none">' + f.txt + '</a><time>' + G.ftime(f.t) + '</time></li>'; }).join('') || '<li class="empty">Rien pour l\'instant.</li>') + '</ul></div></div></div>';
  };

  /* ---------- DEMANDES ---------- */
  V.demandes = function () {
    var list = S.db.requests.slice(), q = UI.qs.toLowerCase();
    if (UI.req !== 'all') list = list.filter(function (r) { return r.statut === UI.req; });
    if (q) list = list.filter(function (r) { return (r.nom + ' ' + r.societe + ' ' + r.email + ' ' + r.message).toLowerCase().indexOf(q) >= 0; });
    list.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    var cnt = function (k) { return S.db.requests.filter(function (r) { return r.statut === k; }).length; };
    return top('Demandes', 'Les demandes reçues depuis votre site, à transformer en devis.', '<button class="btn btn-p" data-act="newRequest">+ Demande manuelle</button>') +
      chips([['all', 'Toutes (' + S.db.requests.length + ')'], ['nouvelle', 'Nouvelles (' + cnt('nouvelle') + ')'], ['en cours', 'En cours'], ['devis envoyé', 'Devis envoyé'], ['gagnée', 'Gagnées'], ['perdue', 'Perdues'], ['archivée', 'Archivées']], 'req') +
      '<div class="bar"><input class="inp search" placeholder="Rechercher…" value="' + esc(UI.qs) + '" data-act="search"></div>' +
      '<div class="card tbl-wrap"><table class="t"><thead><tr><th>Reçue</th><th>Contact</th><th>Besoin</th><th>Statut</th></tr></thead><tbody>' +
      (list.map(function (r) {
        return '<tr class="row" data-act="openRequest" data-id="' + r.id + '"><td class="sub">' + G.fdate(r.created_at) + '</td><td><b>' + esc(r.nom) + '</b><div class="sub">' + esc(r.societe || '') + '</div></td><td>' + esc(r.pack || '—') + ' · ' + esc(r.plateforme || '—') + '<div class="sub">' + esc((r.message || '').slice(0, 80)) + (r.message && r.message.length > 80 ? '…' : '') + '</div></td><td>' + G.badge(r.statut) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="empty">Aucune demande.</td></tr>') + '</tbody></table></div>';
  };

  A.openRequest = function (el) {
    var r = S.get('requests', el.dataset.id); if (!r) return;
    var q = r.quote_id ? S.get('quotes', r.quote_id) : null;
    G.modal('<h2>' + esc(r.nom) + (r.societe ? ' — ' + esc(r.societe) : '') + '</h2>' +
      '<div class="sub" style="margin-bottom:10px">Reçue le ' + G.fdate(r.created_at) + ' · ' + esc(r.source || 'site') + ' · langue : ' + esc((r.lang || 'fr').toUpperCase()) + '</div>' +
      '<div class="f c2"><div><b>E-mail</b><br><a href="mailto:' + esc(r.email) + '">' + esc(r.email || '—') + '</a></div><div><b>Téléphone</b><br>' + esc(r.telephone || '—') + '</div>' +
      '<div><b>Formule souhaitée</b><br>' + esc(r.pack || '—') + '</div><div><b>Plateforme</b><br>' + esc(r.plateforme || '—') + '</div></div>' +
      '<p style="margin:14px 0;padding:12px;background:var(--cream);border-radius:12px;white-space:pre-wrap">' + esc(r.message) + '</p>' +
      '<div class="f c2">' + fld('Statut', '<select id="rStat">' + ['nouvelle', 'en cours', 'devis envoyé', 'gagnée', 'perdue', 'archivée'].map(function (k) { return '<option value="' + k + '"' + (k === r.statut ? ' selected' : '') + '>' + G.LBL[k] + '</option>'; }).join('') + '</select>') +
      fld('Note interne', '<input id="rNote" value="' + esc(r.note_interne || '') + '">') + '</div>' +
      '<div class="btns" style="justify-content:space-between"><div class="btns">' +
      (q ? '<a class="btn btn-d" href="#/devis/' + q.id + '" data-act="closeModal">Ouvrir le devis ' + esc(q.numero) + '</a>' : '<button class="btn btn-p" data-act="reqToQuote" data-id="' + r.id + '">Convertir en devis</button>') +
      '<a class="btn btn-o" href="' + G.mailto(r.email, 'Votre demande — ' + G.S().nom, 'Bonjour ' + r.nom + ',\n\nMerci pour votre demande. ') + '">Répondre par e-mail</a></div>' +
      '<div class="btns"><button class="btn btn-x btn-s" data-act="delRequest" data-id="' + r.id + '">Supprimer</button><button class="btn btn-d" data-act="saveRequest" data-id="' + r.id + '">Enregistrer</button></div></div>');
  };
  A.saveRequest = async function (el) {
    var r = S.get('requests', el.dataset.id); r = Object.assign({}, r, { statut: $('#rStat').value, note_interne: $('#rNote').value });
    await S.save('requests', r); G.closeModal(); G.toast('Demande mise à jour'); G.render();
  };
  A.delRequest = async function (el) {
    if (!confirm('Supprimer définitivement cette demande ?')) return;
    await S.remove('requests', el.dataset.id); G.closeModal(); G.render();
  };
  A.newRequest = function () {
    G.modal('<h2>Nouvelle demande manuelle</h2><p class="sub" style="margin-bottom:12px">Pour une demande reçue par message privé, e-mail ou téléphone.</p><div class="f">' +
      '<div class="f c2">' + fld('Nom *', '<input id="nrNom">') + fld('Société', '<input id="nrSoc">') + fld('E-mail', '<input id="nrMail" type="email">') + fld('Téléphone', '<input id="nrTel">') + '</div>' +
      '<div class="f c2">' + fld('Formule', '<select id="nrPack"><option>Starter</option><option>Boost</option><option>Signature</option><option value="">Autre</option></select>') + fld('Plateforme', '<select id="nrPlat"><option>TikTok</option><option>Instagram Reels</option><option>YouTube Shorts</option><option>LinkedIn</option><option>Plusieurs</option></select>') + '</div>' +
      fld('Message / besoin', '<textarea id="nrMsg"></textarea>') + '</div><div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="saveNewRequest">Créer</button></div>');
  };
  A.saveNewRequest = async function () {
    var nom = $('#nrNom').value.trim(); if (!nom) { G.toast('Le nom est obligatoire'); return; }
    await S.save('requests', { nom: nom, societe: $('#nrSoc').value, email: $('#nrMail').value, telephone: $('#nrTel').value, pack: $('#nrPack').value, plateforme: $('#nrPlat').value, message: $('#nrMsg').value, lang: 'fr', statut: 'nouvelle', source: 'manuel' });
    G.closeModal(); G.toast('Demande ajoutée'); goto('#/demandes'); G.render();
  };

  /* Demande → devis */
  A.reqToQuote = function (el) {
    var r = S.get('requests', el.dataset.id), tps = G.quoteTemplates();
    var pre = (tps.find(function (t) { return t.nom.toLowerCase() === String(r.pack || '').toLowerCase(); }) || tps[0]).key;
    G.modal('<h2>Convertir en devis</h2><p class="sub" style="margin-bottom:12px">Pour <b>' + esc(r.societe || r.nom) + '</b>. Choisissez un modèle, vous pourrez tout modifier ensuite.</p>' +
      '<div class="f">' + tps.map(function (t) { return '<label style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;cursor:pointer"><input type="radio" name="tpl" value="' + t.key + '"' + (t.key === pre ? ' checked' : '') + '><span><b>' + esc(t.nom) + '</b><br><span class="sub">' + esc(t.desc) + '</span></span></label>'; }).join('') + '</div>' +
      '<div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="doReqToQuote" data-id="' + r.id + '">Créer le devis</button></div>');
  };
  A.doReqToQuote = async function (el) {
    var r = S.get('requests', el.dataset.id), key = ($('input[name=tpl]:checked') || {}).value;
    var cl = S.db.clients.find(function (c) { return r.email && c.email && c.email.toLowerCase() === r.email.toLowerCase(); });
    if (!cl) cl = await S.save('clients', { nom: r.nom, societe: r.societe || '', email: r.email || '', tel: r.telephone || '', adresse: '', notes: 'Créé depuis une demande du ' + G.fdate(r.created_at) });
    var q = await createQuote(key, cl.id, r.id, r.message);
    await S.save('requests', Object.assign({}, r, { statut: 'en cours', quote_id: q.id }));
    G.closeModal(); G.toast('Devis créé'); goto('#/devis/' + q.id);
  };

  /* ---------- DEVIS ---------- */
  async function createQuote(tplKey, clientId, requestId, notes) {
    var s = G.S(), t = G.quoteTemplates().find(function (x) { return x.key === tplKey; }) || { lignes: [], objet: '' };
    var lignes = (t.lignes || []).map(function (a) { var c = s.catalogue.find(function (x) { return x.id === a[0]; }); return c ? { desc: c.label + (c.desc ? ' — ' + c.desc : ''), qte: a[1], pu: c.pu } : null; }).filter(Boolean);
    var q = { numero: G.nextNumber('quotes', s.prefix_devis), statut: 'brouillon', client_id: clientId || '', date: G.today(), validite: G.addDays(G.today(), s.validite_jours || 30), objet: t.objet || '', lignes: lignes, remise_pct: 0, tva_taux: s.tva_mode === 'applicable' ? G.num(s.tva_taux) : 0, notes: '', request_id: requestId || '', brief: notes || '' };
    setClientName(q); return S.save('quotes', q);
  }
  V.devis = function () {
    var list = S.db.quotes.slice();
    if (UI.quo !== 'all') list = list.filter(function (q) { return G.quoteStatus(q) === UI.quo; });
    list.sort(function (a, b) { return a.numero < b.numero ? 1 : -1; });
    return top('Devis', 'Créez, modifiez, envoyez et suivez vos devis.', '<button class="btn btn-p" data-act="newQuote">+ Nouveau devis</button>') +
      chips([['all', 'Tous'], ['brouillon', 'Brouillons'], ['envoye', 'Envoyés'], ['accepte', 'Acceptés'], ['refuse', 'Refusés'], ['expire', 'Expirés']], 'quo') +
      '<div class="card tbl-wrap"><table class="t"><thead><tr><th>N°</th><th>Client</th><th>Objet</th><th>Date</th><th class="num">Total TTC</th><th>Statut</th></tr></thead><tbody>' +
      (list.map(function (q) { return '<tr class="row" data-act="goto" data-h="#/devis/' + q.id + '"><td><b>' + esc(q.numero) + '</b></td><td>' + esc(cname(q)) + '</td><td>' + esc(q.objet || '—') + '</td><td class="sub">' + G.fdate(q.date) + '</td><td class="num">' + G.money(G.calc(q).ttc) + '</td><td>' + G.badge(G.quoteStatus(q)) + '</td></tr>'; }).join('') || '<tr><td colspan="6" class="empty">Aucun devis.</td></tr>') + '</tbody></table></div>';
  };
  A.goto = function (el) { goto(el.dataset.h); };
  A.newQuote = function (el, e) {
    if (e) e.preventDefault();
    var tps = G.quoteTemplates();
    G.modal('<h2>Nouveau devis</h2><div class="f">' + fld('Client', '<select id="nqCl">' + clientOptions('') + '</select>') +
      '<div class="sub">Pas encore dans la liste ? <a href="#" data-act="newClient" data-then="quote">Créer un client</a></div>' + fld('Modèle', '<select id="nqTpl">' + tps.map(function (t) { return '<option value="' + t.key + '">' + esc(t.nom) + ' — ' + esc(t.desc) + '</option>'; }).join('') + '</select>') +
      '</div><div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="doNewQuote">Créer</button></div>');
  };
  A.doNewQuote = async function () {
    var cl = $('#nqCl').value; if (!cl) { G.toast('Choisissez un client'); return; }
    var q = await createQuote($('#nqTpl').value, cl); G.closeModal(); goto('#/devis/' + q.id);
  };

  function linesEditor() {
    var s = G.S();
    return '<table class="lines"><thead><tr><th>Description</th><th>Qté</th><th>Prix unit.</th><th class="tt">Total</th><th></th></tr></thead><tbody>' +
      cur.lignes.map(function (l, i) {
        return '<tr><td><textarea class="inp" rows="2" data-li="' + i + '" data-lf="desc">' + esc(l.desc) + '</textarea></td><td class="q"><input data-li="' + i + '" data-lf="qte" value="' + esc(l.qte) + '" inputmode="decimal"></td><td class="p"><input data-li="' + i + '" data-lf="pu" value="' + esc(l.pu) + '" inputmode="decimal"></td><td class="tt" id="lt' + i + '">' + G.money(G.num(l.qte) * G.num(l.pu)) + '</td><td class="x"><button class="btn btn-x btn-s" data-act="delLine" data-i="' + i + '" title="Retirer">×</button></td></tr>'; }).join('') +
      '</tbody></table><div class="btns" style="margin-top:8px"><select class="inp" id="addCat" style="max-width:340px"><option value="">+ Ajouter depuis le catalogue…</option>' + s.catalogue.map(function (c) { return '<option value="' + c.id + '">' + esc(c.label) + ' — ' + G.money(c.pu) + '</option>'; }).join('') + '</select><button class="btn btn-o btn-s" data-act="addLine">+ Ligne libre</button></div>';
  }
  function totalsBox() {
    var c = G.calc(cur);
    return '<div class="totals"><div><span>Total HT</span><b>' + G.money(c.ht0) + '</b></div>' + (c.remise ? '<div><span>Remise</span><b>− ' + G.money(c.remise) + '</b></div>' : '') + '<div><span>TVA</span><b>' + G.money(c.tva) + '</b></div><div class="g"><span>Total TTC</span><span>' + G.money(c.ttc) + '</span></div></div>';
  }
  G.refreshEditor = function () {
    if (!cur) return; var c = $('#totals'); if (c) c.innerHTML = totalsBox();
    (cur.lignes || []).forEach(function (l, i) { var e = $('#lt' + i); if (e) e.textContent = G.money(G.num(l.qte) * G.num(l.pu)); });
    var p = $('#docprev'); if (p) p.innerHTML = cur._kind === 'quote' ? G.docQuote(cur) : cur._kind === 'invoice' ? G.docInvoice(cur) : G.docContract(cur);
  };
  function mailQuote(q) {
    var s = G.S(), cl = G.clientOf(q), c = G.calc(q);
    return G.mailto(cl.email, 'Devis ' + q.numero + ' — ' + s.nom, 'Bonjour ' + (cl.nom || '') + ',\n\nVeuillez trouver ci-joint le devis ' + q.numero + ' (« ' + (q.objet || '') + ' ») d\'un montant de ' + G.money(c.ttc) + ' TTC, valable jusqu\'au ' + G.fdate(q.validite) + '.\n\nN\'hésitez pas à me contacter pour toute question.\n\nCordialement,\n' + s.nom);
  }

  V.devisEdit = function (id) {
    var q = S.get('quotes', id); if (!q) return top('Devis introuvable') + '<div class="card"><a href="#/devis">← Retour aux devis</a></div>';
    cur = JSON.parse(JSON.stringify(q)); cur._kind = 'quote'; cur.lignes = cur.lignes || [];
    var invs = S.db.invoices.filter(function (i) { return i.quote_id === q.id; });
    return top('Devis ' + q.numero, G.badge(G.quoteStatus(q)) + ' &nbsp; ' + esc(cname(q)),
      '<a class="btn btn-o btn-s" href="#/devis">← Devis</a>' +
      '<button class="btn btn-d" data-act="saveDoc">Enregistrer</button>' +
      '<button class="btn btn-o" data-act="print">Imprimer / PDF</button>' +
      '<a class="btn btn-o" data-act="mailDoc" href="#">E-mail</a>') +
      '<div class="card"><div class="btns" style="margin-bottom:14px">' +
      '<button class="btn btn-s btn-o" data-act="qStat" data-s="envoye">Marquer envoyé</button><button class="btn btn-s btn-g" data-act="qStat" data-s="accepte">✓ Accepté</button><button class="btn btn-s btn-x" data-act="qStat" data-s="refuse">Refusé</button><button class="btn btn-s btn-o" data-act="qStat" data-s="brouillon">Repasser en brouillon</button>' +
      '<span style="flex:1"></span><button class="btn btn-p" data-act="toInvoice">Transformer en facture</button></div>' +
      (invs.length ? '<div class="sub" style="margin-bottom:10px">Factures liées : ' + invs.map(function (i) { return '<a href="#/factures/' + i.id + '">' + esc(i.numero) + '</a>'; }).join(', ') + '</div>' : '') +
      (q.brief ? '<div class="warn" style="background:var(--infobg);color:var(--info)"><b>Besoin du client :</b> ' + esc(q.brief) + '</div>' : '') +
      '<div class="f c3">' + fld('Client', '<select data-b="client_id">' + clientOptions(cur.client_id) + '</select>') + fld('Date', '<input type="date" data-b="date" value="' + esc(cur.date) + '">') + fld('Valable jusqu\'au', '<input type="date" data-b="validite" value="' + esc(cur.validite) + '">') + '</div>' +
      '<div class="f c3" style="margin-top:12px">' + fld('Objet', '<input data-b="objet" value="' + esc(cur.objet) + '">', '') + fld('TVA (%)', '<input data-b="tva_taux" value="' + esc(cur.tva_taux) + '" inputmode="decimal">') + fld('Remise (%)', '<input data-b="remise_pct" value="' + esc(cur.remise_pct) + '" inputmode="decimal">') + '</div>' +
      '<h3 style="margin-top:18px">Prestations</h3><div id="lines">' + linesEditor() + '</div><div id="totals">' + totalsBox() + '</div>' +
      '<div style="margin-top:12px">' + fld('Notes affichées sur le devis', '<textarea data-b="notes">' + esc(cur.notes) + '</textarea>') + '</div></div>' +
      '<h2 style="margin:18px 0 10px">Aperçu</h2><div class="docwrap" id="docprev">' + G.docQuote(cur) + '</div>';
  };

  G.cur = function () { return cur; };
  G.renderLines = function () { var l = $('#lines'); if (l) l.innerHTML = linesEditor(); G.refreshEditor(); };
  A.print = function () { G.print(); };
  A.mailDoc = function (el, e) {
    if (e) e.preventDefault(); if (!cur) return;
    var s = G.S(), cl = G.clientOf(cur);
    var href = cur._kind === 'quote' ? mailQuote(cur) : G.mailto(cl.email, 'Facture ' + cur.numero + ' — ' + s.nom, 'Bonjour ' + (cl.nom || '') + ',\n\nVeuillez trouver ci-joint la facture ' + cur.numero + ' d\'un montant de ' + G.money(G.calc(cur).ttc) + ', à régler avant le ' + G.fdate(cur.echeance) + '.\n\nCordialement,\n' + s.nom);
    G.toast('Pensez à joindre le PDF (Imprimer / PDF)'); location.href = href;
  };
  A.addLine = function () { cur.lignes.push({ desc: '', qte: 1, pu: 0 }); G.renderLines(); };
  A.delLine = function (el) { cur.lignes.splice(+el.dataset.i, 1); G.renderLines(); };
  A.saveDoc = async function () {
    if (!cur) return; var kind = cur._kind, tb = kind === 'quote' ? 'quotes' : kind === 'invoice' ? 'invoices' : 'contracts';
    var rec = Object.assign({}, cur); delete rec._kind; setClientName(rec);
    if (kind === 'quote' && !rec.client_id) { G.toast('Choisissez un client'); return; }
    var saved = await S.save(tb, rec); cur = Object.assign(saved, { _kind: kind }); G.toast('Enregistré ✓'); return saved;
  };
  async function syncRequestFromQuote(q) {
    if (!q.request_id) return; var r = S.get('requests', q.request_id); if (!r) return;
    var map = { envoye: 'devis envoyé', accepte: 'gagnée', refuse: 'perdue' }; if (!map[q.statut]) return;
    await S.save('requests', Object.assign({}, r, { statut: map[q.statut] }));
  }
  A.qStat = async function (el) {
    var st = el.dataset.s; cur.statut = st; var q = await A.saveDoc(); if (!q) return;
    await syncRequestFromQuote(q);
    if (st === 'accepte') {
      G.modal('<h2>Devis accepté 🎉</h2><p style="margin-bottom:6px">Que voulez-vous préparer maintenant ?</p><div class="btns" style="justify-content:flex-start;flex-direction:column;align-items:stretch"><button class="btn btn-p" data-act="afterAccept" data-w="project">Créer le projet de production</button><button class="btn btn-d" data-act="afterAccept" data-w="contract">Générer le contrat</button><button class="btn btn-o" data-act="afterAccept" data-w="invoice">Facturer (acompte ou totalité)</button><button class="btn btn-o" data-act="closeModal">Plus tard</button></div>');
    } else G.render();
  };
  A.afterAccept = async function (el) {
    var w = el.dataset.w, q = S.get('quotes', cur.id); G.closeModal();
    if (w === 'project') {
      var n = (q.lignes || []).filter(function (l) { return /vidéo|video|unboxing|témoignage|démo/i.test(l.desc); }).reduce(function (a, l) { return a + G.num(l.qte); }, 0) || 1;
      var p = await S.save('projects', { titre: q.objet || ('Projet ' + q.numero), client_id: q.client_id, client_nom: q.client_nom, quote_id: q.id, etape: 'brief', echeance: G.addDays(G.today(), 14), plateforme: '', nb_videos: n, notes: '' });
      G.toast('Projet créé'); goto('#/projets');
    } else if (w === 'contract') { A.newContract(null, null, q.id); }
    else { A.toInvoice(); }
  };

  /* Devis → facture */
  A.toInvoice = function () {
    var q = S.get('quotes', cur.id), prev = S.db.invoices.filter(function (i) { return i.quote_id === q.id && i.statut !== 'annulee'; });
    G.modal('<h2>Transformer en facture</h2><p class="sub" style="margin-bottom:12px">Devis ' + esc(q.numero) + ' — ' + G.money(G.calc(q).ttc) + ' TTC' + (prev.length ? ' · ' + prev.length + ' facture(s) déjà émise(s)' : '') + '</p><div class="f">' +
      '<label style="display:flex;gap:10px;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px"><input type="radio" name="it" value="full" checked><span><b>Facture complète</b><br><span class="sub">Reprend toutes les lignes du devis</span></span></label>' +
      '<label style="display:flex;gap:10px;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px"><input type="radio" name="it" value="acompte"><span><b>Facture d\'acompte</b><br><span class="sub">Pourcentage du total HT : <input id="itPct" value="30" style="width:60px;padding:3px 6px"> %</span></span></label>' +
      '<label style="display:flex;gap:10px;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px"><input type="radio" name="it" value="solde"><span><b>Facture de solde</b><br><span class="sub">Total HT du devis moins les acomptes déjà facturés</span></span></label></div>' +
      '<div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="doToInvoice">Créer la facture</button></div>');
  };
  A.doToInvoice = async function () {
    var q = S.get('quotes', cur.id), s = G.S(), type = ($('input[name=it]:checked') || {}).value, c = G.calc(q), lignes, remise = 0;
    var prev = S.db.invoices.filter(function (i) { return i.quote_id === q.id && i.statut !== 'annulee'; });
    if (type === 'full') { lignes = JSON.parse(JSON.stringify(q.lignes)); remise = q.remise_pct; }
    else if (type === 'acompte') { var pct = G.num($('#itPct').value) || 30; lignes = [{ desc: 'Acompte de ' + pct + ' % — ' + (q.objet || 'prestation') + ' (devis ' + q.numero + ')', qte: 1, pu: G.r2(c.ht * pct / 100) }]; }
    else { var done = sum(prev, function (i) { return G.calc(i).ht; }); lignes = [{ desc: 'Solde — ' + (q.objet || 'prestation') + ' (devis ' + q.numero + ')', qte: 1, pu: G.r2(c.ht - done) }]; }
    var inv = await S.save('invoices', { numero: G.nextNumber('invoices', s.prefix_facture), statut: 'apayer', quote_id: q.id, devis_numero: q.numero, client_id: q.client_id, client_nom: q.client_nom, date: G.today(), echeance: G.addDays(G.today(), s.delai_paiement_jours || 30), objet: q.objet, lignes: lignes, remise_pct: remise, tva_taux: q.tva_taux, paiements: [], notes: '' });
    G.closeModal(); G.toast('Facture ' + inv.numero + ' créée'); goto('#/factures/' + inv.id);
  };

  /* ---------- FACTURES ---------- */
  V.factures = function () {
    var list = S.db.invoices.slice();
    if (UI.inv !== 'all') list = list.filter(function (i) { return G.invStatus(i) === UI.inv; });
    list.sort(function (a, b) { return a.numero < b.numero ? 1 : -1; });
    var due = sum(S.db.invoices.filter(function (i) { var s = G.invStatus(i); return s === 'apayer' || s === 'retard'; }), function (i) { return G.calc(i).ttc - G.paid(i); });
    return top('Factures', 'Reste à encaisser : <b>' + G.money(due) + '</b>', '<button class="btn btn-p" data-act="newInvoice">+ Facture libre</button>') +
      chips([['all', 'Toutes'], ['apayer', 'À payer'], ['retard', 'En retard'], ['payee', 'Payées'], ['annulee', 'Annulées']], 'inv') +
      '<div class="card tbl-wrap"><table class="t"><thead><tr><th>N°</th><th>Client</th><th>Objet</th><th>Échéance</th><th class="num">Total TTC</th><th class="num">Reste</th><th>Statut</th></tr></thead><tbody>' +
      (list.map(function (i) { var c = G.calc(i); return '<tr class="row" data-act="goto" data-h="#/factures/' + i.id + '"><td><b>' + esc(i.numero) + '</b></td><td>' + esc(cname(i)) + '</td><td>' + esc(i.objet || '—') + '</td><td class="sub">' + G.fdate(i.echeance) + '</td><td class="num">' + G.money(c.ttc) + '</td><td class="num">' + G.money(Math.max(0, c.ttc - G.paid(i))) + '</td><td>' + G.badge(G.invStatus(i)) + '</td></tr>'; }).join('') || '<tr><td colspan="7" class="empty">Aucune facture.</td></tr>') + '</tbody></table></div>';
  };
  A.newInvoice = function () {
    G.modal('<h2>Nouvelle facture libre</h2><div class="f">' + fld('Client', '<select id="niCl">' + clientOptions('') + '</select>') + '<div class="sub">Pour facturer sans devis préalable.</div></div><div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="doNewInvoice">Créer</button></div>');
  };
  A.doNewInvoice = async function () {
    var cl = $('#niCl').value; if (!cl) { G.toast('Choisissez un client'); return; } var s = G.S();
    var inv = { numero: G.nextNumber('invoices', s.prefix_facture), statut: 'apayer', quote_id: '', client_id: cl, date: G.today(), echeance: G.addDays(G.today(), s.delai_paiement_jours || 30), objet: '', lignes: [], remise_pct: 0, tva_taux: s.tva_mode === 'applicable' ? G.num(s.tva_taux) : 0, paiements: [], notes: '' };
    setClientName(inv); inv = await S.save('invoices', inv); G.closeModal(); goto('#/factures/' + inv.id);
  };
  V.factureEdit = function (id) {
    var inv = S.get('invoices', id); if (!inv) return top('Facture introuvable') + '<div class="card"><a href="#/factures">← Retour</a></div>';
    cur = JSON.parse(JSON.stringify(inv)); cur._kind = 'invoice'; cur.lignes = cur.lignes || []; cur.paiements = cur.paiements || [];
    var c = G.calc(cur), paid = G.paid(cur), st = G.invStatus(cur), reste = Math.max(0, G.r2(c.ttc - paid));
    return top('Facture ' + inv.numero, G.badge(st) + ' &nbsp; ' + esc(cname(inv)) + (inv.devis_numero ? ' · devis ' + esc(inv.devis_numero) : ''),
      '<a class="btn btn-o btn-s" href="#/factures">← Factures</a><button class="btn btn-d" data-act="saveDoc">Enregistrer</button><button class="btn btn-o" data-act="print">Imprimer / PDF</button><a class="btn btn-o" data-act="mailDoc" href="#">E-mail</a>') +
      '<div class="card"><div class="btns" style="margin-bottom:12px">' + (reste > 0 && st !== 'annulee' ? '<button class="btn btn-g" data-act="payFull">✓ Marquer payée (' + G.money(reste) + ')</button><button class="btn btn-o btn-s" data-act="addPay">+ Paiement partiel</button>' : '') +
      (st === 'retard' ? '<a class="btn btn-x btn-s" href="' + G.mailto(G.clientOf(cur).email, 'Rappel — facture ' + inv.numero, 'Bonjour ' + (G.clientOf(cur).nom || '') + ',\n\nSauf erreur de ma part, la facture ' + inv.numero + ' de ' + G.money(reste) + ' échue le ' + G.fdate(inv.echeance) + ' reste impayée. Pourriez-vous procéder au règlement ?\n\nMerci d\'avance,\n' + G.S().nom) + '">Envoyer une relance</a>' : '') +
      (st !== 'annulee' ? '<button class="btn btn-x btn-s" data-act="cancelInv">Annuler la facture</button>' : '<button class="btn btn-o btn-s" data-act="uncancelInv">Rétablir</button>') + '</div>' +
      (cur.paiements.length ? '<div class="sub" style="margin-bottom:10px">Paiements : ' + cur.paiements.map(function (p, i) { return G.fdate(p.date) + ' — ' + G.money(p.montant) + ' (' + esc(p.mode || '') + ') <a href="#" data-act="delPay" data-i="' + i + '">✕</a>'; }).join(' · ') + '</div>' : '') +
      '<div class="f c3">' + fld('Client', '<select data-b="client_id">' + clientOptions(cur.client_id) + '</select>') + fld('Date', '<input type="date" data-b="date" value="' + esc(cur.date) + '">') + fld('Échéance', '<input type="date" data-b="echeance" value="' + esc(cur.echeance) + '">') + '</div>' +
      '<div class="f c3" style="margin-top:12px">' + fld('Objet', '<input data-b="objet" value="' + esc(cur.objet) + '">') + fld('TVA (%)', '<input data-b="tva_taux" value="' + esc(cur.tva_taux) + '" inputmode="decimal">') + fld('Remise (%)', '<input data-b="remise_pct" value="' + esc(cur.remise_pct) + '" inputmode="decimal">') + '</div>' +
      '<h3 style="margin-top:18px">Prestations</h3><div id="lines">' + linesEditor() + '</div><div id="totals">' + totalsBox() + '</div>' +
      '<div style="margin-top:12px">' + fld('Notes', '<textarea data-b="notes">' + esc(cur.notes) + '</textarea>') + '</div></div>' +
      '<h2 style="margin:18px 0 10px">Aperçu</h2><div class="docwrap" id="docprev">' + G.docInvoice(cur) + '</div>';
  };
  A.payFull = async function () {
    var reste = Math.max(0, G.r2(G.calc(cur).ttc - G.paid(cur)));
    cur.paiements.push({ date: G.today(), montant: reste, mode: 'Virement' }); cur.statut = 'payee';
    await A.saveDoc(); G.toast('Facture marquée payée'); G.render();
  };
  A.addPay = function () {
    G.modal('<h2>Enregistrer un paiement</h2><div class="f c3">' + fld('Date', '<input type="date" id="pyD" value="' + G.today() + '">') + fld('Montant', '<input id="pyM" inputmode="decimal">') + fld('Mode', '<select id="pyMo"><option>Virement</option><option>PayPal</option><option>Carte</option><option>Espèces</option><option>Autre</option></select>') + '</div><div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="doAddPay">Ajouter</button></div>');
  };
  A.doAddPay = async function () {
    var m = G.num($('#pyM').value); if (m <= 0) { G.toast('Montant invalide'); return; }
    cur.paiements.push({ date: $('#pyD').value, montant: m, mode: $('#pyMo').value }); G.closeModal(); await A.saveDoc(); G.render();
  };
  A.delPay = async function (el, e) { if (e) e.preventDefault(); cur.paiements.splice(+el.dataset.i, 1); await A.saveDoc(); G.render(); };
  A.cancelInv = async function () { if (!confirm('Annuler cette facture ?')) return; cur.statut = 'annulee'; await A.saveDoc(); G.render(); };
  A.uncancelInv = async function () { cur.statut = 'apayer'; await A.saveDoc(); G.render(); };

  /* ---------- CONTRATS ---------- */
  V.contrats = function () {
    var list = S.db.contracts.slice(); if (UI.con !== 'all') list = list.filter(function (k) { return k.statut === UI.con; });
    list.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    return top('Contrats', 'Vos contrats avec les marques, générés depuis vos modèles.', '<button class="btn btn-p" data-act="newContract">+ Nouveau contrat</button>') +
      chips([['all', 'Tous'], ['brouillon', 'Brouillons'], ['envoye', 'Envoyés'], ['signe', 'Signés'], ['resilie', 'Résiliés']], 'con') +
      '<div class="card tbl-wrap"><table class="t"><thead><tr><th>Contrat</th><th>Client</th><th>Date</th><th>Statut</th></tr></thead><tbody>' +
      (list.map(function (k) { return '<tr class="row" data-act="goto" data-h="#/contrats/' + k.id + '"><td><b>' + esc(k.titre) + '</b></td><td>' + esc(cname(k)) + '</td><td class="sub">' + G.fdate(k.date) + '</td><td>' + G.badge(k.statut) + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="empty">Aucun contrat. Générez-en un depuis un modèle.</td></tr>') + '</tbody></table></div>' +
      '<div class="warn">Les modèles de contrat sont fournis à titre indicatif et ne constituent pas un conseil juridique : faites-les valider par un professionnel du droit adapté à votre pays (France, Allemagne…).</div>';
  };
  A.newContract = function (el, e, quoteId) {
    if (e && e.preventDefault) e.preventDefault();
    var s = G.S(), tps = G.contractTemplates(), q = quoteId ? S.get('quotes', quoteId) : null, C = Tpl.CTX;
    G.modal('<h2>Nouveau contrat</h2><div class="f">' + fld('Modèle', '<select id="ncTpl">' + tps.map(function (t) { return '<option value="' + t.key + '">' + esc(t.nom) + '</option>'; }).join('') + '</select>') +
      '<div class="f c2">' + fld('Client', '<select id="ncCl">' + clientOptions(q ? q.client_id : '') + '</select>') + fld('Devis lié', '<select id="ncQ"><option value="">— aucun —</option>' + S.db.quotes.map(function (x) { return '<option value="' + x.id + '"' + (q && q.id === x.id ? ' selected' : '') + '>' + esc(x.numero + ' — ' + cname(x)) + '</option>'; }).join('') + '</select>') + '</div>' +
      '<div class="f c2">' + fld('Durée des droits d\'usage', '<input id="ncDuree" value="' + esc(C.duree) + '">') + fld('Territoire', '<input id="ncTerr" value="' + esc(C.territoire) + '">') + '</div>' +
      fld('Plateformes / supports', '<input id="ncPlat" value="' + esc(C.plateformes) + '">') +
      '<div class="f c2">' + fld('Délai de livraison', '<input id="ncDelai" value="' + esc(C.delai) + '">') + fld('Retouches incluses', '<input id="ncRet" value="' + esc(C.retouches) + '">') + '</div>' +
      '<div class="f c2">' + fld('Droit applicable (pays)', '<input id="ncPays" value="' + esc(s.pays || '') + '" placeholder="ex. français / allemand">') + fld('Juridiction', '<input id="ncJur" value="' + esc(C.juridiction) + '">') + '</div></div>' +
      '<div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="doNewContract">Générer</button></div>', true);
    if (q) $('#ncCl').value = q.client_id;
  };
  A.doNewContract = async function () {
    var s = G.S(), key = $('#ncTpl').value, clId = $('#ncCl').value, qId = $('#ncQ').value; if (!clId) { G.toast('Choisissez un client'); return; }
    var cl = S.get('clients', clId), q = qId ? S.get('quotes', qId) : null, c = q ? G.calc(q) : { ht: 0, ttc: 0 };
    var nbv = q ? (q.lignes || []).filter(function (l) { return /vidéo|video|unboxing|témoignage|démo/i.test(l.desc); }).reduce(function (a, l) { return a + G.num(l.qte); }, 0) : 0;
    var ctx = { prestataire_nom: s.nom, prestataire_forme: s.forme, prestataire_adresse: (s.adresse || '').replace(/\n/g, ', '), prestataire_id: s.siret ? ', n° ' + s.siret : '', client_societe: G.clientName(cl), client_contact: cl.nom, client_adresse: cl.adresse,
      objet: q ? q.objet : '', nb_videos: nbv || '', montant_ht: q ? G.money(c.ht) : '', montant_ttc: q ? G.money(c.ttc) : '', devis_numero: q ? q.numero : '', date: G.fdate(G.today()), ville: s.ville,
      duree: $('#ncDuree').value, territoire: $('#ncTerr').value, plateformes: $('#ncPlat').value, delai: $('#ncDelai').value, retouches: $('#ncRet').value, juridiction: $('#ncJur').value, pays_droit: $('#ncPays').value,
      paiement: 'à ' + (s.delai_paiement_jours || 30) + ' jours à compter de la date de facture', penalites: s.penalites, validite: s.validite_jours, devise: s.devise, mention_tva: s.mention_tva };
    var t = G.contractTemplates().find(function (x) { return x.key === key; });
    var k = await S.save('contracts', { titre: t.nom + ' — ' + G.clientName(cl), template_key: key, client_id: clId, client_nom: G.clientName(cl), quote_id: qId, statut: 'brouillon', date: G.today(), signed_date: '', body: G.fillContract(t.body, ctx) });
    G.closeModal(); G.toast('Contrat généré — relisez les champs [à compléter]'); goto('#/contrats/' + k.id);
  };
  V.contratEdit = function (id) {
    var k = S.get('contracts', id); if (!k) return top('Contrat introuvable') + '<div class="card"><a href="#/contrats">← Retour</a></div>';
    cur = JSON.parse(JSON.stringify(k)); cur._kind = 'contract';
    return top(k.titre, G.badge(k.statut), '<a class="btn btn-o btn-s" href="#/contrats">← Contrats</a><button class="btn btn-d" data-act="saveDoc">Enregistrer</button><button class="btn btn-o" data-act="print">Imprimer / PDF</button>') +
      '<div class="card"><div class="f c3">' + fld('Statut', '<select data-b="statut">' + ['brouillon', 'envoye', 'signe', 'resilie'].map(function (x) { return '<option value="' + x + '"' + (x === cur.statut ? ' selected' : '') + '>' + G.LBL[x] + '</option>'; }).join('') + '</select>') + fld('Date', '<input type="date" data-b="date" value="' + esc(cur.date) + '">') + fld('Date de signature', '<input type="date" data-b="signed_date" value="' + esc(cur.signed_date) + '">') + '</div>' +
      '<div style="margin-top:12px">' + fld('Texte du contrat (modifiable)', '<textarea class="ctx" data-b="body">' + esc(cur.body) + '</textarea>') + '</div>' +
      '<div class="btns" style="margin-top:12px;justify-content:space-between"><span class="sub">Les mentions « [… à compléter] » sont à remplir avant l\'envoi.</span><button class="btn btn-x btn-s" data-act="delDoc" data-t="contracts">Supprimer ce contrat</button></div></div>' +
      '<h2 style="margin:18px 0 10px">Aperçu</h2><div class="docwrap" id="docprev">' + G.docContract(cur) + '</div>';
  };
  A.delDoc = async function (el) {
    if (!confirm('Supprimer définitivement ?')) return; await S.remove(el.dataset.t, cur.id); cur = null;
    goto(el.dataset.t === 'contracts' ? '#/contrats' : el.dataset.t === 'invoices' ? '#/factures' : '#/devis');
  };

  /* ---------- PRODUCTION ---------- */
  var STAGES = ['brief', 'script', 'tournage', 'montage', 'livre', 'valide'];
  V.projets = function () {
    var today = G.today();
    return top('Production', 'Suivez chaque vidéo de la commande à la validation.', '<button class="btn btn-p" data-act="newProject">+ Nouveau projet</button>') +
      '<div class="kan">' + STAGES.map(function (st, si) {
        var items = S.db.projects.filter(function (p) { return p.etape === st; });
        return '<div class="col"><h3>' + G.LBL[st] + ' <span>' + items.length + '</span></h3>' + items.map(function (p) {
          var late = p.echeance && p.echeance < today && st !== 'valide' && st !== 'livre';
          return '<div class="pc" data-act="openProject" data-id="' + p.id + '"><b>' + esc(p.titre) + '</b><small>' + esc(cname(p)) + '</small><br><small class="' + (late ? 'late' : '') + '">' + (p.echeance ? '⏱ ' + G.fdate(p.echeance) : '') + (late ? ' · en retard' : '') + '</small>' +
            '<div class="btns" style="margin-top:6px">' + (si > 0 ? '<button class="btn btn-o btn-s" data-act="moveProject" data-id="' + p.id + '" data-d="-1">◀</button>' : '') + (si < STAGES.length - 1 ? '<button class="btn btn-o btn-s" data-act="moveProject" data-id="' + p.id + '" data-d="1">▶</button>' : '') + '</div></div>'; }).join('') + '</div>'; }).join('') + '</div>';
  };
  A.moveProject = async function (el, e) {
    if (e) e.stopPropagation(); var p = S.get('projects', el.dataset.id), i = STAGES.indexOf(p.etape) + (+el.dataset.d);
    if (i < 0 || i >= STAGES.length) return; await S.save('projects', Object.assign({}, p, { etape: STAGES[i] })); G.render();
  };
  function projectForm(p) {
    return '<div class="f">' + fld('Titre', '<input id="pjT" value="' + esc(p.titre || '') + '">') + '<div class="f c2">' + fld('Client', '<select id="pjC">' + clientOptions(p.client_id) + '</select>') + fld('Étape', '<select id="pjE">' + STAGES.map(function (x) { return '<option value="' + x + '"' + (x === (p.etape || 'brief') ? ' selected' : '') + '>' + G.LBL[x] + '</option>'; }).join('') + '</select>') + '</div>' +
      '<div class="f c3">' + fld('Livraison prévue', '<input type="date" id="pjD" value="' + esc(p.echeance || '') + '">') + fld('Plateforme', '<input id="pjP" value="' + esc(p.plateforme || '') + '">') + fld('Nb de vidéos', '<input id="pjN" value="' + esc(p.nb_videos || 1) + '">') + '</div>' + fld('Notes', '<textarea id="pjNo">' + esc(p.notes || '') + '</textarea>') + '</div>';
  }
  A.newProject = function () { G.modal('<h2>Nouveau projet</h2>' + projectForm({ etape: 'brief', echeance: G.addDays(G.today(), 14) }) + '<div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="saveProject">Créer</button></div>'); };
  A.openProject = function (el) {
    var p = S.get('projects', el.dataset.id); if (!p) return;
    G.modal('<h2>' + esc(p.titre) + '</h2>' + projectForm(p) + '<div class="btns" style="justify-content:space-between"><button class="btn btn-x btn-s" data-act="delProject" data-id="' + p.id + '">Supprimer</button><div class="btns"><button class="btn btn-o" data-act="closeModal">Fermer</button><button class="btn btn-p" data-act="saveProject" data-id="' + p.id + '">Enregistrer</button></div></div>');
  };
  A.saveProject = async function (el) {
    var old = el.dataset.id ? S.get('projects', el.dataset.id) : {}; if (!$('#pjT').value.trim()) { G.toast('Titre obligatoire'); return; }
    var p = Object.assign({}, old, { titre: $('#pjT').value, client_id: $('#pjC').value, etape: $('#pjE').value, echeance: $('#pjD').value, plateforme: $('#pjP').value, nb_videos: G.num($('#pjN').value) || 1, notes: $('#pjNo').value }); setClientName(p);
    await S.save('projects', p); G.closeModal(); G.render();
  };
  A.delProject = async function (el) { if (!confirm('Supprimer ce projet ?')) return; await S.remove('projects', el.dataset.id); G.closeModal(); G.render(); };

  /* ---------- CLIENTS ---------- */
  V.clients = function () {
    var q = UI.cli.toLowerCase(), list = S.db.clients.filter(function (c) { return !q || (c.nom + c.societe + c.email).toLowerCase().indexOf(q) >= 0; });
    return top('Clients', 'Vos marques et contacts.', '<button class="btn btn-p" data-act="newClient">+ Nouveau client</button>') +
      '<div class="bar"><input class="inp search" placeholder="Rechercher…" value="' + esc(UI.cli) + '" data-act="searchCli"></div>' +
      '<div class="card tbl-wrap"><table class="t"><thead><tr><th>Client</th><th>Contact</th><th class="num">Facturé</th><th class="num">Devis</th></tr></thead><tbody>' +
      (list.map(function (c) { var inv = S.db.invoices.filter(function (i) { return i.client_id === c.id && i.statut !== 'annulee'; }); return '<tr class="row" data-act="openClient" data-id="' + c.id + '"><td><b>' + esc(G.clientName(c)) + '</b></td><td>' + esc(c.nom || '') + '<div class="sub">' + esc(c.email || '') + '</div></td><td class="num">' + G.money(sum(inv, function (i) { return G.calc(i).ttc; })) + '</td><td class="num">' + S.db.quotes.filter(function (q2) { return q2.client_id === c.id; }).length + '</td></tr>'; }).join('') || '<tr><td colspan="4" class="empty">Aucun client.</td></tr>') + '</tbody></table></div>';
  };
  function clientForm(c) {
    return '<div class="f"><div class="f c2">' + fld('Société / marque', '<input id="clS" value="' + esc(c.societe || '') + '">') + fld('Contact', '<input id="clN" value="' + esc(c.nom || '') + '">') + fld('E-mail', '<input id="clE" type="email" value="' + esc(c.email || '') + '">') + fld('Téléphone', '<input id="clT" value="' + esc(c.tel || '') + '">') + '</div>' + fld('Adresse de facturation', '<textarea id="clA" rows="2">' + esc(c.adresse || '') + '</textarea>') + fld('Notes', '<input id="clNo" value="' + esc(c.notes || '') + '">') + '</div>';
  }
  A.newClient = function (el, e) {
    if (e && e.preventDefault) e.preventDefault(); var then = el && el.dataset ? el.dataset.then : '';
    G.modal('<h2>Nouveau client</h2>' + clientForm({}) + '<div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="saveClient" data-then="' + (then || '') + '">Enregistrer</button></div>');
  };
  A.openClient = function (el) {
    var c = S.get('clients', el.dataset.id); if (!c) return;
    var qs = S.db.quotes.filter(function (x) { return x.client_id === c.id; }), is = S.db.invoices.filter(function (x) { return x.client_id === c.id; }), ks = S.db.contracts.filter(function (x) { return x.client_id === c.id; });
    G.modal('<h2>' + esc(G.clientName(c)) + '</h2>' + clientForm(c) +
      '<div style="margin-top:14px" class="sub"><b>Historique</b><br>' + (qs.map(function (x) { return '<a href="#/devis/' + x.id + '" data-act="closeModal">' + esc(x.numero) + '</a> ' + G.badge(G.quoteStatus(x)); }).join(' · ') || 'Aucun devis') + '<br>' + (is.map(function (x) { return '<a href="#/factures/' + x.id + '" data-act="closeModal">' + esc(x.numero) + '</a> ' + G.badge(G.invStatus(x)); }).join(' · ') || 'Aucune facture') + '<br>' + (ks.map(function (x) { return '<a href="#/contrats/' + x.id + '" data-act="closeModal">' + esc(x.titre) + '</a>'; }).join(' · ') || 'Aucun contrat') + '</div>' +
      '<div class="btns" style="justify-content:space-between"><button class="btn btn-x btn-s" data-act="delClient" data-id="' + c.id + '">Supprimer</button><div class="btns"><button class="btn btn-o" data-act="closeModal">Fermer</button><button class="btn btn-p" data-act="saveClient" data-id="' + c.id + '">Enregistrer</button></div></div>');
  };
  A.saveClient = async function (el) {
    if (!$('#clS').value.trim() && !$('#clN').value.trim()) { G.toast('Indiquez une société ou un contact'); return; }
    var old = el.dataset.id ? S.get('clients', el.dataset.id) : {};
    var c = await S.save('clients', Object.assign({}, old, { societe: $('#clS').value, nom: $('#clN').value, email: $('#clE').value, tel: $('#clT').value, adresse: $('#clA').value, notes: $('#clNo').value }));
    G.closeModal(); G.toast('Client enregistré'); if (el.dataset.then === 'quote') A.newQuote(); else G.render();
  };
  A.delClient = async function (el) {
    var id = el.dataset.id; if (S.db.quotes.concat(S.db.invoices, S.db.contracts).some(function (d) { return d.client_id === id; })) { G.toast('Ce client a des documents : suppression impossible'); return; }
    if (!confirm('Supprimer ce client ?')) return; await S.remove('clients', id); G.closeModal(); G.render();
  };

  /* ---------- MODÈLES ---------- */
  V.modeles = function () {
    var qt = G.quoteTemplates(), ct = G.contractTemplates(), s = G.S();
    return top('Modèles', 'Vos modèles de devis et de contrats, entièrement modifiables.') +
      '<div class="card"><h2>Modèles de devis</h2><p class="sub" style="margin-bottom:10px">Un modèle = une liste de prestations de votre catalogue (Paramètres). Les prix viennent du catalogue.</p><div class="tbl-wrap"><table class="t"><tbody>' +
      qt.map(function (t) { return '<tr class="row" data-act="editQT" data-k="' + t.key + '"><td><b>' + esc(t.nom) + '</b><div class="sub">' + esc(t.desc) + '</div></td><td class="sub">' + (t.lignes || []).map(function (a) { var c = s.catalogue.find(function (x) { return x.id === a[0]; }); return a[1] + '× ' + (c ? esc(c.label) : a[0]); }).join(', ') + '</td></tr>'; }).join('') + '</tbody></table></div><div class="btns" style="margin-top:10px"><button class="btn btn-o btn-s" data-act="editQT" data-k="">+ Nouveau modèle de devis</button></div></div>' +
      '<div class="card"><h2>Modèles de contrats et documents</h2><p class="sub" style="margin-bottom:10px">Variables de type {{client_societe}} remplies automatiquement lors de la génération.</p><div class="tbl-wrap"><table class="t"><tbody>' +
      ct.map(function (t) { return '<tr class="row" data-act="editCT" data-k="' + t.key + '"><td><b>' + esc(t.nom) + '</b>' + (t.custom ? ' <span class="b b-encours">modifié</span>' : '') + '<div class="sub">' + esc(t.desc) + '</div></td><td class="num"><button class="btn btn-o btn-s">Modifier</button></td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="warn">Modèles indicatifs, à faire valider par un juriste selon votre pays.</div>';
  };
  A.editCT = function (el) {
    var t = G.contractTemplates().find(function (x) { return x.key === el.dataset.k; });
    G.modal('<h2>' + esc(t.nom) + '</h2><textarea class="ctx" id="ctBody" style="min-height:420px">' + esc(t.body) + '</textarea><div class="sub" style="margin-top:6px">Variables : {{prestataire_nom}} {{prestataire_adresse}} {{client_societe}} {{client_contact}} {{client_adresse}} {{objet}} {{nb_videos}} {{montant_ht}} {{montant_ttc}} {{devis_numero}} {{duree}} {{territoire}} {{plateformes}} {{delai}} {{retouches}} {{ville}} {{date}} {{pays_droit}} {{juridiction}} {{paiement}} {{penalites}}</div>' +
      '<div class="btns"><button class="btn btn-o" data-act="closeModal">Fermer</button><button class="btn btn-x" data-act="resetCT" data-k="' + t.key + '">Rétablir l\'original</button><button class="btn btn-p" data-act="saveCT" data-k="' + t.key + '">Enregistrer</button></div>', true);
  };
  A.saveCT = async function (el) { var s = Object.assign({}, G.S()); s.contract_templates = Object.assign({}, s.contract_templates); s.contract_templates[el.dataset.k] = $('#ctBody').value; await S.saveSettings(s); G.closeModal(); G.toast('Modèle enregistré'); G.render(); };
  A.resetCT = async function (el) { var s = Object.assign({}, G.S()); s.contract_templates = Object.assign({}, s.contract_templates); delete s.contract_templates[el.dataset.k]; await S.saveSettings(s); G.closeModal(); G.render(); };
  A.editQT = function (el) {
    var key = el.dataset.k, t = key ? G.quoteTemplates().find(function (x) { return x.key === key; }) : { key: '', nom: '', desc: '', objet: '', lignes: [] }, cat = G.S().catalogue;
    var row = function (a) { return '<div class="btns qrow" style="margin-bottom:6px"><select class="inp qc" style="flex:1">' + cat.map(function (c) { return '<option value="' + c.id + '"' + (c.id === a[0] ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('') + '</select><input class="inp qq" style="width:70px" value="' + a[1] + '"><button class="btn btn-x btn-s" data-act="rmQRow">×</button></div>'; };
    G.modal('<h2>' + (key ? 'Modifier' : 'Nouveau') + ' modèle de devis</h2><div class="f">' + fld('Nom', '<input id="qtN" value="' + esc(t.nom) + '">') + fld('Description', '<input id="qtD" value="' + esc(t.desc) + '">') + fld('Objet du devis', '<input id="qtO" value="' + esc(t.objet) + '">') + '<div id="qtRows"><b style="font-size:.86rem">Prestations</b>' + (t.lignes || []).map(row).join('') + '</div><button class="btn btn-o btn-s" data-act="addQRow">+ Prestation</button></div>' +
      '<div class="btns" style="justify-content:space-between">' + (key ? '<button class="btn btn-x btn-s" data-act="delQT" data-k="' + key + '">Supprimer</button>' : '<span></span>') + '<div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="saveQT" data-k="' + key + '">Enregistrer</button></div></div>');
    G.qrow = row;
  };
  A.addQRow = function () { var d = document.createElement('div'); d.innerHTML = G.qrow([G.S().catalogue[0].id, 1]); $('#qtRows').appendChild(d.firstChild); };
  A.rmQRow = function (el) { el.closest('.qrow').remove(); };
  A.saveQT = async function (el) {
    var name = $('#qtN').value.trim(); if (!name) { G.toast('Nom obligatoire'); return; }
    var lignes = $$('.qrow').map(function (r) { return [$('.qc', r).value, G.num($('.qq', r).value) || 1]; });
    var s = Object.assign({}, G.S()), list = G.quoteTemplates().map(function (x) { return Object.assign({}, x); }), key = el.dataset.k || ('t' + Date.now());
    var rec = { key: key, nom: name, desc: $('#qtD').value, objet: $('#qtO').value, lignes: lignes }, i = list.findIndex(function (x) { return x.key === key; });
    if (i >= 0) list[i] = rec; else list.push(rec); s.quote_templates = list; await S.saveSettings(s); G.closeModal(); G.toast('Modèle enregistré'); G.render();
  };
  A.delQT = async function (el) { if (!confirm('Supprimer ce modèle ?')) return; var s = Object.assign({}, G.S()); s.quote_templates = G.quoteTemplates().filter(function (x) { return x.key !== el.dataset.k; }); await S.saveSettings(s); G.closeModal(); G.render(); };

  /* ---------- PARAMÈTRES ---------- */
  V.parametres = function () {
    var s = G.S(), p = function (k, label, extra) { return fld(label, '<input data-set="' + k + '" value="' + esc(s[k] == null ? '' : s[k]) + '" ' + (extra || '') + '>'); };
    return top('Paramètres', 'Ces informations apparaissent sur vos devis, factures et contrats.', '<button class="btn btn-p" data-act="saveSettings">Enregistrer</button>') +
      '<div class="card"><h2>Votre entreprise</h2><div class="f c2">' + p('nom', 'Nom commercial') + p('forme', 'Statut (ex. micro-entrepreneuse, Einzelunternehmerin)') + p('email', 'E-mail') + p('tel', 'Téléphone') + p('siret', 'N° d\'identification (SIRET / Steuernummer)') + p('tva_num', 'N° de TVA (si applicable)') + p('ville', 'Ville (pour les contrats)') + p('pays', 'Pays (droit applicable)') + '</div><div style="margin-top:14px">' + fld('Adresse', '<textarea data-set="adresse" rows="3">' + esc(s.adresse || '') + '</textarea>') + '</div></div>' +
      '<div class="card"><h2>TVA, numérotation et paiement</h2><div class="f c3">' + fld('Régime de TVA', '<select data-set="tva_mode"><option value="franchise"' + (s.tva_mode === 'franchise' ? ' selected' : '') + '>Franchise / petite entreprise (sans TVA)</option><option value="applicable"' + (s.tva_mode === 'applicable' ? ' selected' : '') + '>TVA applicable</option></select>') + p('tva_taux', 'Taux de TVA par défaut (%)') + p('devise', 'Devise') + p('prefix_devis', 'Préfixe des devis') + p('prefix_facture', 'Préfixe des factures') + p('validite_jours', 'Validité des devis (jours)') + p('delai_paiement_jours', 'Délai de paiement (jours)') + '</div>' +
      '<div class="f" style="margin-top:14px">' + fld('Mention TVA affichée quand le taux est 0 %', '<input data-set="mention_tva" value="' + esc(s.mention_tva || '') + '">') + fld('Conditions affichées sur les devis', '<textarea data-set="conditions" rows="3">' + esc(s.conditions || '') + '</textarea>') + fld('Mention de retard de paiement (factures)', '<textarea data-set="penalites" rows="3">' + esc(s.penalites || '') + '</textarea>') + fld('Texte de pied de page (optionnel)', '<input data-set="pied" value="' + esc(s.pied || '') + '">') + '</div></div>' +
      '<div class="card"><h2>Coordonnées bancaires</h2><div class="f c3">' + p('banque', 'Banque') + p('iban', 'IBAN') + p('bic', 'BIC') + '</div></div>' +
      '<div class="card"><h2>Catalogue de prestations et tarifs</h2><p class="sub" style="margin-bottom:8px">Vos prix de référence : ils alimentent les modèles de devis.</p><table class="lines"><thead><tr><th>Prestation</th><th>Description</th><th class="p">Prix unit.</th></tr></thead><tbody>' +
      s.catalogue.map(function (c, i) { return '<tr><td><input data-cat="' + i + '" data-cf="label" value="' + esc(c.label) + '"></td><td><input data-cat="' + i + '" data-cf="desc" value="' + esc(c.desc) + '"></td><td class="p"><input data-cat="' + i + '" data-cf="pu" value="' + esc(c.pu) + '" inputmode="decimal"></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card"><h2>Données et sécurité</h2><div class="btns"><button class="btn btn-o" data-act="exportAll">Télécharger une sauvegarde (JSON)</button>' + (S.mode === 'live' ? '<button class="btn btn-o" data-act="changePw">Changer mon mot de passe</button>' : '<label class="btn btn-o">Restaurer une sauvegarde<input type="file" id="impFile" accept=".json" class="hide"></label><button class="btn btn-x" data-act="resetDemo">Réinitialiser la démo</button>') + '</div></div>';
  };
  A.saveSettings = async function () {
    var s = Object.assign({}, G.S());
    $$('[data-set]').forEach(function (e) { var v = e.value; s[e.dataset.set] = (['tva_taux', 'validite_jours', 'delai_paiement_jours'].indexOf(e.dataset.set) >= 0) ? G.num(v) : v; });
    s.catalogue = s.catalogue.map(function (c) { return Object.assign({}, c); });
    $$('[data-cat]').forEach(function (e) { var c = s.catalogue[+e.dataset.cat]; c[e.dataset.cf] = e.dataset.cf === 'pu' ? G.num(e.value) : e.value; });
    await S.saveSettings(s); G.toast('Paramètres enregistrés ✓');
  };
  A.exportAll = function () { G.download('debosvie-sauvegarde-' + G.today() + '.json', JSON.stringify({ db: S.db, settings: S.settings }, null, 1), 'application/json'); };
  A.changePw = function () {
    G.modal('<h2>Changer mon mot de passe</h2><div class="f">' + fld('Nouveau mot de passe (10 caractères minimum)', '<input type="password" id="pw1" autocomplete="new-password">') + fld('Confirmer', '<input type="password" id="pw2" autocomplete="new-password">') + '</div><div class="btns"><button class="btn btn-o" data-act="closeModal">Annuler</button><button class="btn btn-p" data-act="doChangePw">Valider</button></div>');
  };
  A.doChangePw = async function () {
    var a = $('#pw1').value; if (a.length < 10 || a !== $('#pw2').value) { G.toast('10 caractères minimum, identiques'); return; }
    try { await S.changePassword(a); G.closeModal(); G.toast('Mot de passe modifié ✓'); } catch (e) { G.toast(e.message); }
  };
  A.resetDemo = function () { if (confirm('Remettre les données de démonstration à zéro ?')) S.resetDemo(); };
})();
