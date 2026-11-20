// La démo (escale « Démo ») : la vidéo et ses moments, à recaler ici seulement quand le montage change.
// Instants relevés image par image sur demo-pr16-45s.mp4 (45,0 s, 1280×862), le 20/11.
window.DEMO = {
  video: "medias/demo-pr16-45s.mp4",
  largeur: 1280, hauteur: 862,
  // [seconde à partir de laquelle la légende s'affiche, texte] ; « cle » = le mot entouré d'un trait rouge
  legendes: [
    [0, "Une PR s'ouvre. Horama part la vérifier."],
    [4.0, "Il visite l'aperçu du site, comme un visiteur."],
    [10.8, "Un texte déborde de sa boîte : <span class=\"cle\">trait rouge</span>."],
    [12.5, "L'agent de H parcourt le site et clique, comme vous."],
    [18.0, "Il lit chaque page, traduite en allemand."],
    [24.3, "Un bloc est resté en français : <span class=\"cle\">trait rouge</span>."],
    [26.2, "« J'ai fini. » 3 défauts prouvés, 2 doutes, 8 pages."],
    [32.0, "Chaque défaut revient : bug, ou voulu ?"],
    [36.6, "Vous tranchez : <span class=\"cle verdict\">c'est un bug</span>."],
    [38.2, "« C'est rangé. » La décision est gardée."],
  ],
  // caméra : [seconde, centre x, centre y (pixels de la vidéo), zoom] ; entre deux lignes, elle glisse.
  // Règles tenues : ne couper ni colonne ni bouton ; pas de zoom sur le bloc en français tant que la mascotte
  // de la vidéo est sur « Testen » (24,0 à 25,2 s) ; ne pas montrer la bande blanche du bas (y > 780) ; à partir des cartes (32 s), zoom ≥ 1,19
  // et cadre décalé à gauche, pour cacher la bande blanche de droite.
  camera: [
    [0, 640, 431, 1], [10.5, 640, 431, 1], [11.1, 395, 500, 1.62], [12.3, 395, 500, 1.62], [12.9, 640, 431, 1],
    [16.5, 640, 431, 1], [17.2, 430, 289, 1.49], [17.95, 430, 289, 1.49], [18.6, 640, 431, 1],
    [25.2, 640, 431, 1], [25.6, 337, 430, 1.9], [26.05, 337, 430, 1.9], [26.5, 640, 336, 1.28], [31.7, 640, 336, 1.28],
    [32.1, 540, 431, 1.19], [32.9, 540, 600, 1.45], [36.3, 540, 600, 1.45], [36.8, 540, 300, 1.4], [37.6, 540, 300, 1.4], [38.4, 540, 450, 1.4], [45, 540, 450, 1.4],
  ],
  // l'image du PDF : le trait rouge autour du bloc en français, à cette seconde et avec ce cadre
  imagePdf: [25.8, 337, 430, 1.9],
};
