/* Outils communs : formats, calculs, documents imprimables, modales. */
(function () {
  'use strict';
  var G = window.G = {};
  G.$ = function (s, c) { return (c || document).querySelector(s); };
  G.$$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  G.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var esc = G.esc;

  G.S = function () {
    var s = Object.assign({}, Tpl.DEFAULT_SETTINGS, Store.settings);
    if (!s.catalogue || !s.catalogue.length) s.catalogue = Tpl.DEFAULT_SETTINGS.catalogue;
    return s;
  };
  G.today = function () { return new Date().toISOString().slice(0, 10); };
  G.addDays = function (iso, n) { var d = new Date(iso || G.today()); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  G.fdate = function (iso) { if (!iso) return '—'; var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR'); };
  G.ftime = function (iso) {
    var d = new Date(iso), diff = (Date.now() - d) / 60000;
    if (diff < 1) return 'à l\'instant'; if (diff < 60) return Math.round(diff) + ' min';
    if (diff < 1440) return Math.round(diff / 60) + ' h'; if (diff < 10080) return Math.round(diff / 1440) + ' j';
    return d.toLocaleDateString('fr-FR');
  };
  G.money = function (n) {
    var s = G.S(); n = Number(n) || 0;
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (s.devise || '€');
  };
  G.num = function (v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  G.r2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };

  G.calc = function (doc) {
    var ht0 = 0; (doc.lignes || []).forEach(function (l) { ht0 += G.num(l.qte) * G.num(l.pu); });
    var remise = ht0 * G.num(doc.remise_pct) / 100, ht = ht0 - remise, tva = ht * G.num(doc.tva_taux) / 100;
    return { ht0: G.r2(ht0), remise: G.r2(remise), ht: G.r2(ht), tva: G.r2(tva), ttc: G.r2(ht + tva) };
  };
  G.paid = function (inv) { var t = 0; (inv.paiements || []).forEach(function (p) { t += G.num(p.montant); }); return G.r2(t); };
  G.invStatus = function (inv) {
    if (inv.statut === 'annulee') return 'annulee';
    var ttc = G.calc(inv).ttc;
    if (ttc > 0 && G.paid(inv) >= ttc - 0.005) return 'payee';
    if (inv.echeance && inv.echeance < G.today()) return 'retard';
    return 'apayer';
  };
  G.quoteStatus = function (q) { return (q.statut === 'envoye' && q.validite && q.validite < G.today()) ? 'expire' : q.statut; };

  var LBL = {
    nouvelle: 'Nouvelle', 'en cours': 'En cours', 'devis envoyé': 'Devis envoyé', 'gagnée': 'Gagnée', perdue: 'Perdue', 'archivée': 'Archivée',
    brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', expire: 'Expiré',
    apayer: 'À payer', payee: 'Payée', retard: 'En retard', annulee: 'Annulée', signe: 'Signé', resilie: 'Résilié',
    brief: 'Brief', script: 'Script', tournage: 'Tournage', montage: 'Montage', livre: 'Livré', valide: 'Validé'
  };
  var CLS = { nouvelle: 'nouvelle', 'en cours': 'encours', 'devis envoyé': 'envoye', 'gagnée': 'gagnee', perdue: 'perdue', 'archivée': 'archivee',
    brouillon: 'brouillon', envoye: 'envoye', accepte: 'accepte', refuse: 'refuse', expire: 'expire', apayer: 'apayer', payee: 'payee', retard: 'retard', annulee: 'annule', signe: 'signe', resilie: 'resilie',
    brief: 'nouvelle', script: 'encours', tournage: 'encours', montage: 'encours', livre: 'livre', valide: 'valide' };
  G.LBL = LBL;
  G.badge = function (k) { return '<span class="b b-' + (CLS[k] || 'neutre') + '">' + esc(LBL[k] || k) + '</span>'; };

  G.nextNumber = function (table, prefix) {
    var y = new Date().getFullYear(), p = prefix + '-' + y + '-', max = 0;
    Store.db[table].forEach(function (x) {
      if (x.numero && x.numero.indexOf(p) === 0) { var n = parseInt(x.numero.slice(p.length), 10); if (n > max) max = n; }
    });
    return p + String(max + 1).padStart(3, '0');
  };

  /* Modale & toast */
  G.modal = function (html, wide) {
    G.$('#modal').innerHTML = '<div class="mod" data-act="modalBg"><div class="mod-box' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    var f = G.$('#modal input, #modal select, #modal textarea'); if (f) f.focus();
  };
  G.closeModal = function () { G.$('#modal').innerHTML = ''; };
  var tt;
  G.toast = function (msg) {
    var t = G.$('#toast'); t.textContent = msg; t.classList.remove('hide'); clearTimeout(tt);
    tt = setTimeout(function () { t.classList.add('hide'); }, 3200);
  };
  G.mailto = function (to, subject, body) { return 'mailto:' + encodeURIComponent(to || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); };
  G.download = function (name, text, mime) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  G.clientName = function (c) { return c ? (c.societe || c.nom || '') : ''; };
  G.clientOf = function (doc) { return Store.get('clients', doc.client_id) || { nom: doc.client_nom || '', societe: doc.client_nom || '', adresse: '', email: '' }; };

  function emitter(s) {
    var l = [];
    if (s.forme) l.push(esc(s.forme)); if (s.adresse) l.push(esc(s.adresse).replace(/\n/g, '<br>'));
    var c = []; if (s.email) c.push(esc(s.email)); if (s.tel) c.push(esc(s.tel)); if (c.length) l.push(c.join(' · '));
    var id = []; if (s.siret) id.push('N° ' + esc(s.siret)); if (s.tva_num) id.push('TVA ' + esc(s.tva_num)); if (id.length) l.push(id.join(' · '));
    return '<div class="em"><b>' + esc(s.nom) + '</b>' + l.join('<br>') + '</div>';
  }
  function legalFoot(s) {
    var bits = [s.nom]; if (s.forme) bits.push(s.forme); if (s.adresse) bits.push(s.adresse.replace(/\n/g, ', ')); if (s.siret) bits.push('N° ' + s.siret); if (s.tva_num) bits.push('TVA ' + s.tva_num);
    return esc(bits.join(' — ') + (s.pied ? '\n' + s.pied : ''));
  }
  function rows(doc) {
    return (doc.lignes || []).map(function (l) {
      var t = G.num(l.qte) * G.num(l.pu);
      return '<tr><td>' + esc(l.desc).replace(/\n/g, '<br>') + '</td><td class="r">' + esc(String(l.qte)) + '</td><td class="r">' + G.money(l.pu) + '</td><td class="r">' + G.money(t) + '</td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:#999">Aucune prestation</td></tr>';
  }
  function totalsHtml(doc, s, extra) {
    var c = G.calc(doc), h = '<div class="tot"><div><span>Total HT</span><span>' + G.money(c.ht0) + '</span></div>';
    if (c.remise) h += '<div><span>Remise (' + G.num(doc.remise_pct) + ' %)</span><span>− ' + G.money(c.remise) + '</span></div><div><span>Total HT net</span><span>' + G.money(c.ht) + '</span></div>';
    h += '<div><span>TVA' + (G.num(doc.tva_taux) ? ' (' + G.num(doc.tva_taux) + ' %)' : '') + '</span><span>' + G.money(c.tva) + '</span></div>';
    h += '<div class="g"><span>Total TTC</span><span>' + G.money(c.ttc) + '</span></div>' + (extra || '') + '</div>';
    return h;
  }
  function clientBlock(cl, label) {
    return '<div class="cl"><b>' + esc(cl.societe || cl.nom) + '</b><br>' + (cl.societe && cl.nom ? esc(cl.nom) + '<br>' : '') + esc(cl.adresse || '').replace(/\n/g, '<br>') + (cl.email ? '<br>' + esc(cl.email) : '') + '</div>';
  }
  function tvaMention(doc, s) { return (G.num(doc.tva_taux) === 0 && s.mention_tva) ? '<div class="note"><h4>TVA</h4>' + esc(s.mention_tva) + '</div>' : ''; }

  G.docQuote = function (q) {
    var s = G.S(), cl = G.clientOf(q);
    return '<div class="doc"><div class="dh"><div><img src="../assets/img/logo-mark.svg" alt="">' + emitter(s) + '</div>' +
      '<div class="dt"><h2>Devis</h2><div>N° <b>' + esc(q.numero || '(brouillon)') + '</b></div><div>Date : ' + G.fdate(q.date) + '</div><div>Valable jusqu\'au : ' + G.fdate(q.validite) + '</div></div></div>' +
      clientBlock(cl) + (q.objet ? '<div class="obj">Objet : ' + esc(q.objet) + '</div>' : '') +
      '<table><thead><tr><th>Description</th><th class="r">Qté</th><th class="r">Prix unitaire</th><th class="r">Total</th></tr></thead><tbody>' + rows(q) + '</tbody></table>' +
      totalsHtml(q, s) + tvaMention(q, s) +
      (q.notes ? '<div class="note"><h4>Notes</h4>' + esc(q.notes) + '</div>' : '') +
      (s.conditions ? '<div class="note"><h4>Conditions</h4>' + esc(s.conditions) + '</div>' : '') +
      '<div class="note" style="margin-top:9mm"><h4>Bon pour accord</h4>Date, nom, signature précédés de « Bon pour accord » :<br><br><br></div>' +
      '<div class="legal">' + legalFoot(s) + '</div></div>';
  };

  G.docInvoice = function (inv) {
    var s = G.S(), cl = G.clientOf(inv), c = G.calc(inv), paid = G.paid(inv), st = G.invStatus(inv);
    var extra = '';
    if (paid) extra += '<div><span>Déjà réglé</span><span>− ' + G.money(paid) + '</span></div><div class="g" style="border:0;margin:0;padding-top:1mm"><span>Reste à payer</span><span>' + G.money(Math.max(0, G.r2(c.ttc - paid))) + '</span></div>';
    var bank = (s.iban ? '<div class="note"><h4>Règlement par virement</h4>' + esc((s.banque ? s.banque + '\n' : '') + 'IBAN : ' + s.iban + (s.bic ? '\nBIC : ' + s.bic : '') + '\nRéférence : ' + (inv.numero || '')) + '</div>' : '');
    return '<div class="doc"><div class="dh"><div><img src="../assets/img/logo-mark.svg" alt="">' + emitter(s) + '</div>' +
      '<div class="dt"><h2>Facture</h2><div>N° <b>' + esc(inv.numero || '(brouillon)') + '</b></div><div>Date : ' + G.fdate(inv.date) + '</div><div>Échéance : ' + G.fdate(inv.echeance) + '</div>' + (inv.devis_numero ? '<div>Réf. devis : ' + esc(inv.devis_numero) + '</div>' : '') + '</div></div>' +
      clientBlock(cl) + (inv.objet ? '<div class="obj">Objet : ' + esc(inv.objet) + '</div>' : '') +
      '<table><thead><tr><th>Description</th><th class="r">Qté</th><th class="r">Prix unitaire</th><th class="r">Total</th></tr></thead><tbody>' + rows(inv) + '</tbody></table>' +
      totalsHtml(inv, s, extra) + tvaMention(inv, s) + bank +
      (inv.notes ? '<div class="note"><h4>Notes</h4>' + esc(inv.notes) + '</div>' : '') +
      (s.penalites ? '<div class="note"><h4>Retard de paiement</h4>' + esc(s.penalites) + '</div>' : '') +
      (st === 'payee' ? '<div style="position:absolute;right:20mm;top:68mm;transform:rotate(-12deg);border:1mm solid #177A46;color:#177A46;font-weight:800;font-size:24pt;padding:1mm 6mm;border-radius:3mm;opacity:.75">PAYÉE</div>' : '') +
      '<div class="legal">' + legalFoot(s) + '</div></div>';
  };

  G.docContract = function (k) {
    var s = G.S();
    return '<div class="doc contract"><div class="dh"><div><img src="../assets/img/logo-mark.svg" alt=""></div><div class="dt"><div>' + esc(s.nom) + '</div></div></div>' +
      '<div class="ctext">' + esc(k.body || '') + '</div>' +
      '<div class="sig"><div>Le Prestataire<br><small>' + esc(s.nom) + '</small></div><div>Le Client<br><small>' + esc(G.clientName(G.clientOf(k))) + '</small></div></div></div>';
  };

  /* Remplissage d'un modèle de contrat */
  G.fillContract = function (body, ctx) {
    return body.replace(/\{\{(\w+)\}\}/g, function (m, k) { return (ctx[k] !== undefined && ctx[k] !== '') ? ctx[k] : '[' + k.replace(/_/g, ' ') + ' à compléter]'; });
  };

  G.contractTemplates = function () {
    var ov = G.S().contract_templates || {};
    return Tpl.CONTRACTS.map(function (t) { return Object.assign({}, t, { body: ov[t.key] != null ? ov[t.key] : t.body, custom: ov[t.key] != null }); });
  };
  G.quoteTemplates = function () { var s = G.S(); return s.quote_templates && s.quote_templates.length ? s.quote_templates : Tpl.QUOTE_TEMPLATES; };

  G.print = function () { window.print(); };
})();
