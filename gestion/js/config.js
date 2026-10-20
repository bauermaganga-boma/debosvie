/* Configuration du back-office.
   Laisser supabaseUrl vide = mode démonstration (données fictives stockées dans ce navigateur).
   Une fois la base branchée, la clé « publishable » est publique par conception : la sécurité repose sur
   les règles RLS et sur la connexion de l'administratrice. Ne jamais mettre de clé « secret » ici. */
window.GESTION_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  schema: "debosvie"
};
