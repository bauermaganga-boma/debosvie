/* Couche de données : Supabase (production) ou localStorage (démonstration). */
(function () {
  'use strict';
  var CFG = window.GESTION_CONFIG || {};
  var TABLES = ['requests', 'clients', 'quotes', 'invoices', 'contracts', 'projects'];
  var LS = 'debosvie-gestion-v1';
  var sb = null, mode = 'demo';
  var db = {};
  TABLES.forEach(function (t) { db[t] = []; });
  var settings = {};

  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2)); }
  function flat(r) { var o = Object.assign({}, r.data || {}); o.id = r.id; o.created_at = r.created_at; o.updated_at = r.updated_at; return o; }
  function strip(o) { var d = Object.assign({}, o); delete d.id; delete d.created_at; delete d.updated_at; return d; }
  function persistLocal() { try { localStorage.setItem(LS, JSON.stringify({ db: db, settings: settings })); } catch (e) {} }
  function fail(e) { var m = e && e.message ? e.message : String(e); throw new Error(m); }

  var Store = {
    TABLES: TABLES,
    get mode() { return mode; },
    get db() { return db; },
    get settings() { return settings; },
    uid: uid,

    async init() {
      if (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase) {
        mode = 'live';
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
          db: { schema: CFG.schema || 'public' },
          auth: { persistSession: true, autoRefreshToken: true }
        });
        var s = await sb.auth.getSession();
        return !!(s.data && s.data.session);
      }
      mode = 'demo';
      try {
        var raw = JSON.parse(localStorage.getItem(LS) || 'null');
        if (raw && raw.db) { db = raw.db; TABLES.forEach(function (t) { db[t] = db[t] || []; }); settings = raw.settings || {}; }
      } catch (e) {}
      return true;
    },

    async login(email, password) {
      var r = await sb.auth.signInWithPassword({ email: email, password: password });
      if (r.error) throw new Error('Identifiants incorrects.');
      var a = await sb.from('admins').select('user_id').limit(1);
      if (a.error || !a.data || !a.data.length) { await sb.auth.signOut(); throw new Error('Ce compte n\'a pas accès au back-office.'); }
    },
    async logout() { if (sb) await sb.auth.signOut(); },
    async changePassword(pw) { var r = await sb.auth.updateUser({ password: pw }); if (r.error) fail(r.error); },

    async loadAll() {
      if (mode === 'demo') return;
      for (var i = 0; i < TABLES.length; i++) {
        var t = TABLES[i];
        var r = await sb.from(t).select('*').order('created_at', { ascending: false }).limit(2000);
        if (r.error) fail(r.error);
        db[t] = r.data.map(flat);
      }
      var s = await sb.from('settings').select('*').eq('id', 'main').maybeSingle();
      if (s.error) fail(s.error);
      settings = s.data ? s.data.data : {};
    },

    async refresh(t) {
      if (mode === 'demo') return db[t];
      var r = await sb.from(t).select('*').order('created_at', { ascending: false }).limit(2000);
      if (r.error) fail(r.error);
      db[t] = r.data.map(flat);
      return db[t];
    },

    get(t, id) { return db[t].find(function (x) { return x.id === id; }); },

    async save(t, rec) {
      var now = new Date().toISOString(), out;
      if (mode === 'demo') {
        if (!rec.id) { rec.id = uid(); rec.created_at = now; rec.updated_at = now; db[t].unshift(rec); }
        else { rec.updated_at = now; var i = db[t].findIndex(function (x) { return x.id === rec.id; }); if (i >= 0) db[t][i] = rec; else db[t].unshift(rec); }
        persistLocal(); return rec;
      }
      if (!rec.id) {
        var ins = await sb.from(t).insert({ data: strip(rec) }).select().single();
        if (ins.error) fail(ins.error);
        out = flat(ins.data); db[t].unshift(out); return out;
      }
      var up = await sb.from(t).update({ data: strip(rec) }).eq('id', rec.id).select().single();
      if (up.error) fail(up.error);
      out = flat(up.data);
      var j = db[t].findIndex(function (x) { return x.id === out.id; }); if (j >= 0) db[t][j] = out; else db[t].unshift(out);
      return out;
    },

    async remove(t, id) {
      if (mode === 'live') { var r = await sb.from(t).delete().eq('id', id); if (r.error) fail(r.error); }
      db[t] = db[t].filter(function (x) { return x.id !== id; });
      if (mode === 'demo') persistLocal();
    },

    async saveSettings(s) {
      settings = s;
      if (mode === 'demo') { persistLocal(); return; }
      var r = await sb.from('settings').upsert({ id: 'main', data: s });
      if (r.error) fail(r.error);
    },

    resetDemo() { try { localStorage.removeItem(LS); } catch (e) {} location.reload(); },
    persistDemo: persistLocal,
    setAll(newDb, newSettings) { db = newDb; settings = newSettings; TABLES.forEach(function (t) { db[t] = db[t] || []; }); persistLocal(); }
  };
  window.Store = Store;
})();
