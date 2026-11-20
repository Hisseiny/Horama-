// La démo (escale « Démo ») : la vidéo et ses moments, à recaler ici seulement quand le montage change.
// Instants relevés image par image sur demo-pr16-60s.mp4 (60,0 s, 1280×862), le 20/11.
// Chaque légende reste au moins 4 s à l'écran.
window.DEMO = {
  video: "medias/demo-pr16-60s.mp4",
  largeur: 1280, hauteur: 862,
  // [seconde à partir de laquelle la légende s'affiche, texte] ; « cle » = le mot entouré d'un trait rouge
  legendes: [
    [0, "Une PR s'ouvre. Horama part la vérifier."],                                      // 0 à 5,0
    [5.0, "Il visite l'aperçu du site, comme un visiteur."],                              // 5,0 à 13,8
    [13.8, "Un texte déborde de sa boîte : <span class=\"cle\">trait rouge</span>."],     // 13,8 à 18,5
    [18.5, "L'agent de H parcourt le site et clique, comme vous."],                       // 18,5 à 24,7
    [24.7, "Il lit chaque page, traduite en allemand."],                                  // 24,7 à 31,5
    [31.5, "Un bloc est resté en français : <span class=\"cle\">trait rouge</span>."],    // 31,5 à 35,5
    [35.5, "« J'ai fini. » 3 défauts prouvés, 2 doutes, 8 pages."],                        // 35,5 à 42,5
    [42.5, "Chaque défaut revient : bug, ou voulu ?"],                                    // 42,5 à 46,5
    [46.5, "Vous tranchez : <span class=\"cle verdict\">c'est un bug</span>."],           // 46,5 à 51,0
    [51.0, "« C'est rangé. » La décision est gardée."],                                   // 51,0 à 60
  ],
  // caméra : [seconde, centre x, centre y (pixels de la vidéo), zoom] ; entre deux lignes, elle glisse.
  // Repères vidéo : site ouvert à 5,0 s ; trait sur « Zertifikatskurs » de 14,0 à 15,5 s ; clic sur le menu vers 24,7 s ;
  // mascotte sur « Testen » de 31,8 à 33,0 s, trait sur le bloc en français de 32,6 à 34,0 s ; « J'ai fini. » de 35,5 à 42,4 s ;
  // carte Zertifikatskurs à 42,5 s, tampon BUG vers 47 s ; carte Studienjahr de 48 à 50,5 s ; « C'est rangé. » de 51 à 60 s.
  // Le zoom sur le bloc en français cadre sous le titre (la mascotte y passe) ; après 42,5 s, zoom ≥ 1,19 décalé à gauche
  // pour cacher la bande blanche de droite.
  camera: [
    [0, 640, 431, 1], [13.6, 640, 431, 1], [14.2, 395, 500, 1.62], [15.2, 395, 500, 1.62], [15.7, 640, 431, 1],
    [23.8, 640, 431, 1], [24.3, 430, 289, 1.49], [25.1, 430, 289, 1.49], [25.7, 640, 431, 1],
    [32.1, 640, 431, 1], [32.7, 366, 612, 1.75], [33.9, 366, 612, 1.75], [34.5, 640, 431, 1],
    [35.4, 640, 431, 1], [36.0, 640, 336, 1.28], [42.2, 640, 336, 1.28],
    [42.7, 540, 431, 1.19], [43.5, 540, 600, 1.45], [46.3, 540, 600, 1.45], [46.8, 540, 300, 1.4], [47.8, 540, 300, 1.4], [48.4, 540, 450, 1.4], [60, 540, 450, 1.4],
  ],
  // l'image du PDF : le trait rouge autour du bloc en français, à cette seconde et avec ce cadre
  imagePdf: [33.6, 366, 612, 1.75],
};
