/* Modèles : paramètres par défaut, catalogue de prestations, modèles de devis et de contrats, données de démo. */
(function () {
  'use strict';

  var DEFAULT_SETTINGS = {
    nom: 'Debos Vie', forme: 'Créatrice de contenu UGC (indépendante)', adresse: '', ville: '', pays: '',
    email: '', tel: '', siret: '', tva_num: '', tva_mode: 'franchise', tva_taux: 20, devise: '€',
    mention_tva: 'TVA non applicable (régime de la franchise en base).',
    iban: '', bic: '', banque: '',
    prefix_devis: 'D', prefix_facture: 'F', validite_jours: 30, delai_paiement_jours: 30,
    conditions: 'Devis valable 30 jours. Le démarrage de la prestation est conditionné à la validation du devis et à la réception de l\'acompte éventuel.',
    penalites: 'Tout retard de paiement entraîne des pénalités de retard et, pour un professionnel, une indemnité forfaitaire pour frais de recouvrement, selon la législation applicable.',
    pied: '',
    catalogue: [
      { id: 'video',   label: 'Vidéo UGC produit',            desc: 'Vidéo verticale 9:16 (30 à 60 s), script et hook inclus, sous-titres, 1 retouche', pu: 0 },
      { id: 'unbox',   label: 'Unboxing & avis',              desc: 'Vidéo de découverte et d\'avis sincère du produit', pu: 0 },
      { id: 'temoin',  label: 'Témoignage face caméra',       desc: 'Message direct face caméra, format vertical', pu: 0 },
      { id: 'demo',    label: 'Démo & tutoriel',              desc: 'Présentation pas-à-pas d\'un produit, outil ou service', pu: 0 },
      { id: 'hook',    label: 'Hook supplémentaire',          desc: 'Variante d\'accroche (3 premières secondes) pour tests publicitaires', pu: 0 },
      { id: 'photos',  label: 'Photos lifestyle (lot de 5)',  desc: '5 photos retouchées du produit en situation', pu: 0 },
      { id: 'droits3', label: 'Droits d\'usage publicitaire — 3 mois',  desc: 'Utilisation du contenu dans vos publicités payantes pendant 3 mois', pu: 0 },
      { id: 'droits6', label: 'Droits d\'usage publicitaire — 6 mois',  desc: 'Utilisation du contenu dans vos publicités payantes pendant 6 mois', pu: 0 },
      { id: 'droits12',label: 'Droits d\'usage publicitaire — 12 mois', desc: 'Utilisation du contenu dans vos publicités payantes pendant 12 mois', pu: 0 },
      { id: 'retouche',label: 'Retouche supplémentaire',      desc: 'Modification au-delà des retouches incluses', pu: 0 },
      { id: 'express', label: 'Livraison express (48 h)',     desc: 'Supplément pour livraison prioritaire', pu: 0 }
    ]
  };

  /* Modèles de devis : liste de [id catalogue, quantité] */
  var QUOTE_TEMPLATES = [
    { key: 'starter',   nom: 'Starter',    desc: '1 vidéo UGC', lignes: [['video', 1]], objet: 'Création d\'une vidéo UGC' },
    { key: 'boost',     nom: 'Boost',      desc: '3 vidéos + 3 hooks + droits 3 mois', lignes: [['video', 3], ['hook', 3], ['droits3', 1]], objet: 'Pack UGC Boost — 3 vidéos' },
    { key: 'signature', nom: 'Signature',  desc: '5 vidéos + photos + droits 6 mois', lignes: [['video', 5], ['photos', 1], ['droits6', 1]], objet: 'Campagne UGC Signature — 5 vidéos' },
    { key: 'avis',      nom: 'Unboxing & avis', desc: 'Unboxing + avis sincère', lignes: [['unbox', 1]], objet: 'Vidéo unboxing & avis' },
    { key: 'vierge',    nom: 'Devis vierge', desc: 'Partir de zéro', lignes: [], objet: '' }
  ];

  var CTX = {
    duree: '3 mois', territoire: 'Monde entier', plateformes: 'TikTok, Instagram, YouTube et publicités en ligne (Meta, TikTok Ads, YouTube Ads)',
    delai: '10 jours ouvrés après réception du produit et validation du script', retouches: '2', juridiction: 'tribunaux compétents du lieu du siège du Prestataire'
  };

  var CONTRACTS = [
    { key: 'prestation', nom: 'Contrat de prestation UGC', desc: 'Contrat principal : livrables, délais, paiement, droits.',
      body:
`CONTRAT DE PRESTATION DE CRÉATION DE CONTENU (UGC)

Entre les soussignés :

{{prestataire_nom}}, {{prestataire_forme}}, {{prestataire_adresse}}{{prestataire_id}}
ci-après « le Prestataire »,

et

{{client_societe}}, représentée par {{client_contact}}, {{client_adresse}}
ci-après « le Client »,

Il a été convenu ce qui suit :

Article 1 — Objet
Le Prestataire réalise pour le Client des contenus vidéo de type « UGC » (User Generated Content) décrits ci-après : {{objet}}. Nombre de vidéos prévues : {{nb_videos}}. Plateformes cibles : {{plateformes}}.

Article 2 — Livrables, délais et validation
2.1 Le Prestataire propose un script ou une trame avant tournage ; le Client la valide par écrit (e-mail suffisant).
2.2 Les vidéos sont livrées au format vertical 9:16, en haute définition, sous-titrées, dans un délai de {{delai}}.
2.3 Le Client dispose de 5 jours ouvrés pour demander des modifications. {{retouches}} retouche(s) sont incluses ; toute modification supplémentaire fait l'objet d'un devis complémentaire.
2.4 À défaut de retour dans ce délai, les contenus sont réputés validés.

Article 3 — Obligations du Client
Le Client fournit le produit ou l'accès au service nécessaire en temps utile, ainsi que les informations et messages clés à respecter. Un retard du Client décale d'autant les délais de livraison.

Article 4 — Rémunération et paiement
4.1 Montant : {{montant_ht}} HT, soit {{montant_ttc}} TTC (voir devis {{devis_numero}}).
4.2 Conditions de paiement : {{paiement}}.
4.3 {{penalites}}

Article 5 — Droits de propriété intellectuelle
5.1 Le Prestataire reste titulaire des droits d'auteur sur les contenus. Il concède au Client, à compter du paiement intégral, une licence non exclusive d'utilisation pour : durée {{duree}} ; territoire : {{territoire}} ; supports : {{plateformes}}.
5.2 Toute utilisation au-delà (durée, territoire, supports, modification substantielle) nécessite un accord écrit et une rémunération complémentaire.
5.3 Le Client ne peut céder ni sous-licencier ces droits à un tiers sans accord écrit du Prestataire.

Article 6 — Image et voix du Prestataire
Le Prestataire autorise l'utilisation de son image, de sa voix et de son nom dans les contenus livrés, uniquement dans les limites de l'article 5. Le Client s'interdit tout usage détourné, déformant ou portant atteinte à la réputation du Prestataire.

Article 7 — Transparence publicitaire
Le Prestataire indique le caractère publicitaire ou partenarial de ses publications lorsque la loi l'exige. Le Client ne demande aucune allégation mensongère, trompeuse ou non justifiée sur le produit.

Article 8 — Exclusivité
Sauf mention contraire écrite, aucune exclusivité n'est consentie : le Prestataire reste libre de travailler avec d'autres marques, y compris du même secteur.

Article 9 — Confidentialité
Chaque partie garde confidentielles les informations non publiques reçues de l'autre dans le cadre du contrat, pendant sa durée et 2 ans après son terme.

Article 10 — Responsabilité
Le Prestataire est tenu d'une obligation de moyens. Il ne garantit aucun résultat commercial (ventes, vues, engagement). Sa responsabilité est limitée au montant des sommes perçues au titre du présent contrat.

Article 11 — Résiliation
En cas de manquement grave non corrigé dans les 15 jours suivant une mise en demeure, la partie lésée peut résilier le contrat. Les travaux déjà réalisés restent dus.

Article 12 — Données personnelles
Chaque partie traite les données personnelles de l'autre conformément à la réglementation applicable (RGPD).

Article 13 — Droit applicable et litiges
Le présent contrat est soumis au droit {{pays_droit}}. À défaut d'accord amiable, les litiges relèvent des {{juridiction}}.

Fait à {{ville}}, le {{date}}, en deux exemplaires.` },

    { key: 'licence', nom: 'Licence d\'utilisation (annexe droits)', desc: 'Annexe courte précisant durée, territoire, supports.',
      body:
`ANNEXE — LICENCE D'UTILISATION DES CONTENUS

Concédant : {{prestataire_nom}}, {{prestataire_adresse}}
Bénéficiaire : {{client_societe}}, {{client_adresse}}
Contenus concernés : {{objet}} ({{nb_videos}} vidéo(s))
Devis de référence : {{devis_numero}}

1. Étendue : licence non exclusive, non cessible, accordée après paiement intégral.
2. Durée : {{duree}} à compter de la première mise en ligne ou diffusion.
3. Territoire : {{territoire}}.
4. Supports : {{plateformes}}.
5. Modifications autorisées : sous-titrage, recadrage, découpage, ajout de logo et de call-to-action, sans altérer le sens des propos.
6. Renouvellement : possible sur demande avant l'expiration, selon tarif en vigueur.
7. Fin de licence : à l'expiration, le Bénéficiaire retire les contenus des publicités payantes ; les publications organiques déjà en ligne peuvent rester accessibles.

Fait à {{ville}}, le {{date}}.` },

    { key: 'nda', nom: 'Accord de confidentialité (NDA)', desc: 'Pour les produits ou lancements non publics.',
      body:
`ACCORD DE CONFIDENTIALITÉ

Entre {{prestataire_nom}} ({{prestataire_adresse}}) et {{client_societe}} ({{client_adresse}}).

1. Objet : protéger les informations confidentielles échangées en vue de la prestation « {{objet}} ».
2. Informations confidentielles : produits, fonctionnalités, dates de lancement, stratégies, tarifs et tout document désigné comme confidentiel.
3. Engagements : ne pas divulguer, ne pas utiliser en dehors de la prestation, ne publier aucun contenu avant l'accord écrit du Client.
4. Exceptions : informations publiques, déjà connues du Prestataire ou imposées par la loi.
5. Durée : pendant la prestation et 2 ans après son terme.
6. Retour : à la demande du Client, les supports contenant des informations confidentielles sont restitués ou détruits.

Fait à {{ville}}, le {{date}}.` },

    { key: 'cgv', nom: 'Conditions générales de vente', desc: 'À joindre à chaque devis.',
      body:
`CONDITIONS GÉNÉRALES DE VENTE — {{prestataire_nom}}

1. Champ d'application : les présentes conditions s'appliquent à toute prestation de création de contenu UGC fournie par {{prestataire_nom}}.
2. Devis et commande : le devis signé ou accepté par écrit vaut commande. Il est valable {{validite}} jours.
3. Prix : exprimés en {{devise}}. {{mention_tva}}
4. Paiement : {{paiement}}. Un acompte peut être exigé au démarrage.
5. Délais : indicatifs, ils courent à compter de la réception du produit et de la validation du script.
6. Retouches : le nombre de retouches incluses figure au devis.
7. Propriété intellectuelle : voir licence d'utilisation. Aucun droit publicitaire n'est cédé sans mention au devis.
8. Annulation : toute annulation après validation du script donne lieu à facturation du travail déjà réalisé.
9. Responsabilité : obligation de moyens ; aucun résultat commercial n'est garanti.
10. Droit applicable : droit {{pays_droit}}.` },

    { key: 'brief', nom: 'Brief & validation de script', desc: 'Document de cadrage avant tournage.',
      body:
`BRIEF & VALIDATION DE SCRIPT

Client : {{client_societe}} — contact : {{client_contact}}
Projet : {{objet}}
Date : {{date}}

1. Produit / service à présenter :
2. Cible et ton souhaité :
3. Messages clés (3 maximum) :
4. À éviter :
5. Plateformes et formats : {{plateformes}}
6. Hook proposé :
7. Script proposé :
8. Call-to-action :
9. Date limite de livraison : {{delai}}

Validation du client (nom, date) :` }
  ];

  function d(offsetDays) { var x = new Date(); x.setDate(x.getDate() + offsetDays); return x.toISOString().slice(0, 10); }
  function iso(off) { var x = new Date(); x.setDate(x.getDate() + off); return x.toISOString(); }

  function demoData() {
    var s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    var prices = { video: 250, unbox: 180, temoin: 220, demo: 260, hook: 40, photos: 120, droits3: 150, droits6: 250, droits12: 400, retouche: 30, express: 60 };
    s.catalogue.forEach(function (c) { c.pu = prices[c.id] || 0; });
    s.email = 'contact@debosvie.example'; s.ville = 'Berlin'; s.pays = 'Allemagne';
    var ids = { c1: 'demo-c1', c2: 'demo-c2', c3: 'demo-c3', q1: 'demo-q1', q2: 'demo-q2', q3: 'demo-q3', i1: 'demo-i1', i2: 'demo-i2' };
    var clients = [
      { id: ids.c1, nom: 'Lena Fischer', societe: 'Lumio Tech (démo)', email: 'lena@lumio.example', tel: '', adresse: 'Musterstraße 1, 10115 Berlin', notes: 'Marque fictive de démonstration', created_at: iso(-40), updated_at: iso(-40) },
      { id: ids.c2, nom: 'Camille Roy', societe: 'Maison Kaya (démo)', email: 'camille@kaya.example', tel: '', adresse: '12 rue des Lilas, 75011 Paris', notes: '', created_at: iso(-25), updated_at: iso(-25) },
      { id: ids.c3, nom: 'Jonas Weber', societe: 'Nordlicht GmbH (démo)', email: 'jonas@nordlicht.example', tel: '', adresse: 'Hafenweg 8, 20457 Hamburg', notes: '', created_at: iso(-10), updated_at: iso(-10) }
    ];
    var mkLines = function (arr) { return arr.map(function (a) { var c = s.catalogue.find(function (x) { return x.id === a[0]; }); return { desc: c.label + ' — ' + c.desc, qte: a[1], pu: c.pu }; }); };
    var yr = new Date().getFullYear();
    var quotes = [
      { id: ids.q1, numero: s.prefix_devis + '-' + yr + '-001', statut: 'accepte', client_id: ids.c1, client_nom: 'Lumio Tech (démo)', date: d(-38), validite: d(-8), objet: 'Pack UGC Boost — 3 vidéos', lignes: mkLines([['video', 3], ['hook', 3], ['droits3', 1]]), remise_pct: 0, tva_taux: 0, notes: '', created_at: iso(-38), updated_at: iso(-30) },
      { id: ids.q2, numero: s.prefix_devis + '-' + yr + '-002', statut: 'envoye', client_id: ids.c2, client_nom: 'Maison Kaya (démo)', date: d(-6), validite: d(24), objet: 'Vidéo unboxing & avis', lignes: mkLines([['unbox', 1], ['droits3', 1]]), remise_pct: 0, tva_taux: 0, notes: '', created_at: iso(-6), updated_at: iso(-6) },
      { id: ids.q3, numero: s.prefix_devis + '-' + yr + '-003', statut: 'brouillon', client_id: ids.c3, client_nom: 'Nordlicht GmbH (démo)', date: d(-1), validite: d(29), objet: 'Campagne UGC Signature — 5 vidéos', lignes: mkLines([['video', 5], ['photos', 1], ['droits6', 1]]), remise_pct: 10, tva_taux: 0, notes: '', created_at: iso(-1), updated_at: iso(-1) }
    ];
    var invoices = [
      { id: ids.i1, numero: s.prefix_facture + '-' + yr + '-001', statut: 'payee', quote_id: ids.q1, client_id: ids.c1, client_nom: 'Lumio Tech (démo)', date: d(-28), echeance: d(2), objet: 'Pack UGC Boost — 3 vidéos', lignes: mkLines([['video', 3], ['hook', 3], ['droits3', 1]]), remise_pct: 0, tva_taux: 0, paiements: [{ date: d(-20), montant: 1020, mode: 'Virement' }], notes: '', created_at: iso(-28), updated_at: iso(-20) },
      { id: ids.i2, numero: s.prefix_facture + '-' + yr + '-002', statut: 'apayer', quote_id: '', client_id: ids.c2, client_nom: 'Maison Kaya (démo)', date: d(-45), echeance: d(-15), objet: 'Vidéo démo produit', lignes: mkLines([['demo', 1]]), remise_pct: 0, tva_taux: 0, paiements: [], notes: '', created_at: iso(-45), updated_at: iso(-45) }
    ];
    var requests = [
      { id: 'demo-r1', nom: 'Sophie Martin', societe: 'Atelier Verde (démo)', email: 'sophie@verde.example', telephone: '', pack: 'Boost', plateforme: 'TikTok', message: 'Nous lançons une gamme de soins capillaires bio et cherchons 3 vidéos UGC pour nos publicités TikTok, livraison avant fin du mois.', lang: 'fr', statut: 'nouvelle', source: 'site', created_at: iso(-0.2), updated_at: iso(-0.2) },
      { id: 'demo-r2', nom: 'Tim Becker', societe: 'FlowDesk (démo)', email: 'tim@flowdesk.example', telephone: '', pack: 'Starter', plateforme: 'LinkedIn', message: 'Wir suchen eine Creatorin für ein kurzes Demo-Video unserer Produktivitäts-App.', lang: 'de', statut: 'nouvelle', source: 'site', created_at: iso(-1), updated_at: iso(-1) },
      { id: 'demo-r3', nom: 'Camille Roy', societe: 'Maison Kaya (démo)', email: 'camille@kaya.example', telephone: '', pack: 'Starter', plateforme: 'Instagram Reels', message: 'Unboxing de notre nouvelle collection de bougies.', lang: 'fr', statut: 'devis envoyé', source: 'site', quote_id: ids.q2, created_at: iso(-7), updated_at: iso(-6) },
      { id: 'demo-r4', nom: 'Marc Dupont', societe: 'Coursio (démo)', email: 'marc@coursio.example', telephone: '', pack: 'Signature', plateforme: 'Plusieurs', message: 'Campagne de rentrée pour notre plateforme de formation.', lang: 'fr', statut: 'perdue', source: 'site', created_at: iso(-30), updated_at: iso(-20) }
    ];
    var projects = [
      { id: 'demo-p1', titre: 'Pack Boost — Lumio Tech (démo)', client_id: ids.c1, client_nom: 'Lumio Tech (démo)', quote_id: ids.q1, etape: 'valide', echeance: d(-15), plateforme: 'TikTok', nb_videos: 3, notes: '', created_at: iso(-30), updated_at: iso(-15) },
      { id: 'demo-p2', titre: 'Unboxing bougies — Maison Kaya (démo)', client_id: ids.c2, client_nom: 'Maison Kaya (démo)', quote_id: ids.q2, etape: 'script', echeance: d(5), plateforme: 'Instagram Reels', nb_videos: 1, notes: 'Script envoyé, en attente de validation', created_at: iso(-5), updated_at: iso(-2) },
      { id: 'demo-p3', titre: 'Démo app — Nordlicht (démo)', client_id: ids.c3, client_nom: 'Nordlicht GmbH (démo)', quote_id: '', etape: 'brief', echeance: d(-2), plateforme: 'YouTube Shorts', nb_videos: 2, notes: '', created_at: iso(-3), updated_at: iso(-3) }
    ];
    var contracts = [
      { id: 'demo-k1', titre: 'Contrat de prestation UGC — Lumio Tech (démo)', template_key: 'prestation', client_id: ids.c1, client_nom: 'Lumio Tech (démo)', quote_id: ids.q1, statut: 'signe', date: d(-36), signed_date: d(-34), body: 'Contenu du contrat (démo) — générez un contrat depuis un modèle pour voir le texte complet.', created_at: iso(-36), updated_at: iso(-34) }
    ];
    return { db: { requests: requests, clients: clients, quotes: quotes, invoices: invoices, contracts: contracts, projects: projects }, settings: s };
  }

  window.Tpl = { DEFAULT_SETTINGS: DEFAULT_SETTINGS, QUOTE_TEMPLATES: QUOTE_TEMPLATES, CONTRACTS: CONTRACTS, CTX: CTX, demoData: demoData };
})();
