import { EbookData, EbookCoverProposal, EbookBackCoverProposal } from '../types';

export const CURATED_ART_IMAGES = {
  photorealistic: {
    business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
    finance: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=85',
    money: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
    gold: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=85',
    mindset: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85',
    tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
    children: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=85',
    general: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85'
  },
  illustration: {
    children: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=85',
    fantasy: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85',
    creative: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=85',
    nature: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85',
    general: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85'
  },
  abstract: {
    modern: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
    geometric: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
    cyber: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=85',
    liquid: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=85'
  }
};

export const SAMPLE_FRONT_COVERS: EbookCoverProposal[] = [
  // PROPOSITION 1 : STYLE PHOTORÉALISTE & CINÉMATOGRAPHIQUE
  {
    id: 'cover-prop-1',
    title: "L'Art de l'Investissement Digital en Afrique",
    subtitle: "Guide Pratique pour Bâtir sa Liberté Financière à l'Ère du Numérique",
    author: "Dr. Cheikh Tidiane Ndiaye",
    genreBadge: "Finance & Entrepreneuriat",
    tagline: "Le guide incontournable pour bâtir des revenus passifs durables",
    artStyle: "photorealistic",
    artStyleLabel: "📸 Photoréaliste Cinématographique",
    paletteName: "Prestige Indigo & Or",
    bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
    bgPattern: "gold_frame",
    textColor: "#ffffff",
    subtitleColor: "#cbd5e1",
    accentColor: "#fbbf24",
    fontFamily: "serif",
    layoutVariant: "cinematic_poster",
    coverArtEmojiOrIcon: "📈",
    artImageUrl: CURATED_ART_IMAGES.photorealistic.finance,
    artTexture: "gold_foil"
  },
  // PROPOSITION 2 : STYLE ILLUSTRATION / DESSIN / PEINTURE NUMÉRIQUE
  {
    id: 'cover-prop-2',
    title: "L'Art de l'Investissement Digital en Afrique",
    subtitle: "De l'Épargne Locale aux Portefeuilles Internationaux",
    author: "Dr. Cheikh Tidiane Ndiaye",
    genreBadge: "Bestseller Économie",
    tagline: "Méthodes éprouvées et études de cas réelles",
    artStyle: "illustration",
    artStyleLabel: "🎨 Illustration & Peinture Numérique",
    paletteName: "Aquarelle Émeraude & Céleste",
    bgGradient: "from-teal-950 via-emerald-900 to-slate-950",
    bgPattern: "watercolor",
    textColor: "#ffffff",
    subtitleColor: "#a7f3d0",
    accentColor: "#34d399",
    fontFamily: "sans",
    layoutVariant: "illustrated_storybook",
    coverArtEmojiOrIcon: "🌍",
    artImageUrl: CURATED_ART_IMAGES.illustration.creative,
    artTexture: "watercolor_paper"
  },
  // PROPOSITION 3 : STYLE MINIMALISTE / TYPOGRAPHIQUE / LUXE ÉDITORIAL
  {
    id: 'cover-prop-3',
    title: "L'Art de l'Investissement Digital en Afrique",
    subtitle: "Stratégies d'Investisseurs & Opportunités Tech",
    author: "Dr. Cheikh Tidiane Ndiaye",
    genreBadge: "Édition Prestige",
    tagline: "Transformez vos compétences numériques en capital",
    artStyle: "minimalist",
    artStyleLabel: "✨ Minimaliste & Luxe Typographique",
    paletteName: "Luxe Noir & Or Imperial",
    bgGradient: "from-stone-950 via-neutral-900 to-amber-950",
    bgPattern: "marble",
    textColor: "#ffffff",
    subtitleColor: "#fed7aa",
    accentColor: "#f59e0b",
    fontFamily: "serif",
    layoutVariant: "minimalist_luxury",
    coverArtEmojiOrIcon: "👑",
    artTexture: "linen"
  },
  // PROPOSITION 4 : STYLE GRAPHIQUE / ARTISTIQUE ABSTRAIT / GÉOMÉTRIQUE 3D
  {
    id: 'cover-prop-4',
    title: "L'Art de l'Investissement Digital en Afrique",
    subtitle: "Manuel Complet pour Entreprendre et Multiplier son Capital",
    author: "Dr. Cheikh Tidiane Ndiaye",
    genreBadge: "Guide Stratégique 3.0",
    tagline: "Édition augmentée conforme aux marchés émergents",
    artStyle: "abstract",
    artStyleLabel: "📐 Graphique & 3D Abstrait",
    paletteName: "Néon Cyber & Ambre",
    bgGradient: "from-blue-950 via-indigo-900 to-purple-950",
    bgPattern: "mesh",
    textColor: "#ffffff",
    subtitleColor: "#e0e7ff",
    accentColor: "#38bdf8",
    fontFamily: "display",
    layoutVariant: "geometric",
    coverArtEmojiOrIcon: "⚡",
    artImageUrl: CURATED_ART_IMAGES.abstract.cyber,
    artTexture: "cyber_grid"
  }
];

export const SAMPLE_BACK_COVERS: EbookBackCoverProposal[] = [
  // PROPOSITION 1 : BACK COVER PHOTORÉALISTE & CINÉMATOGRAPHIQUE
  {
    id: 'back-prop-1',
    synopsis: "Dans un monde en pleine mutation numérique, le continent africain connaît une révolution financière sans précédent. Des fintechs aux crypto-actifs, du e-commerce transfrontalier aux investissements immobiliers tokenisés, de nouvelles opportunités s'offrent chaque jour à ceux qui savent les saisir.\n\nCe livre livre une méthodologie pas-à-pas, rigoureuse et accessible, pour protéger son épargne contre l'inflation, structurer un portefeuille résilient et générer des revenus passifs récurrents.",
    authorBio: "Dr. Cheikh Tidiane Ndiaye est économiste, conférencier international et investisseur providentiel. Diplômé de HEC et de l'Université de Dakar, il conseille depuis plus de 15 ans les institutions financières et les entrepreneurs sur les marchés émergents.",
    keyTakeaways: [
      "Comprendre les leviers d'investissement les plus rentables en Afrique de l'Ouest et Centrale",
      "Éviter les pièges courants et les arnaques financières en ligne",
      "Diversifier intelligemment entre devises locales et actifs internationaux",
      "Bâtir une trésorerie de sécurité et automatiser ses flux d'investissement"
    ],
    quoteOrCallToAction: "« La richesse n'est pas le fruit du hasard, mais la somme de décisions stratégiques prises avec discernement. »",
    artStyle: "photorealistic",
    artStyleLabel: "📸 Photoréaliste Cinématographique",
    paletteName: "Prestige Indigo & Or",
    isbnNumber: "978-2-84000-123-4",
    barcodeDigits: "9782840001234",
    bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
    textColor: "#f8fafc",
    accentColor: "#fbbf24",
    layoutVariant: "cinematic_dark",
    artImageUrl: CURATED_ART_IMAGES.photorealistic.finance,
    artTexture: "gold_foil"
  },
  // PROPOSITION 2 : BACK COVER ILLUSTRATION & STORYTELLING
  {
    id: 'back-prop-2',
    synopsis: "Pourquoi laisser dormir votre argent alors que l'économie numérique génère des millions ? L'Art de l'Investissement Digital en Afrique est le manifeste de la nouvelle génération d'investisseurs audacieux qui tirent profit de la décentralisation et de la technologie pour bâtir leur prospérité.",
    authorBio: "Entrepreneur à succès et business angel, l'auteur a formé plus de 10 000 jeunes actifs à la gestion patrimoniale moderne et à l'indépendance financière.",
    keyTakeaways: [
      "5 piliers fondamentaux pour générer du cash-flow digital",
      "Études de cas concrètes d'investissements rentabilisés en moins de 12 mois",
      "Guide fiscal et juridique adapté à la zone UEMOA / CEMAC",
      "Secrets d'automatisation pour travailler moins et gagner plus"
    ],
    quoteOrCallToAction: "« Ne travaillez plus uniquement pour l'argent ; faites en sorte que l'argent travaille inlassablement pour vous. »",
    artStyle: "illustration",
    artStyleLabel: "🎨 Illustration & Storytelling",
    paletteName: "Émeraude Royale & Platine",
    isbnNumber: "978-2-84000-456-7",
    barcodeDigits: "9782840004567",
    bgGradient: "from-teal-950 via-emerald-900 to-slate-950",
    textColor: "#f8fafc",
    accentColor: "#34d399",
    layoutVariant: "illustrated_story",
    artImageUrl: CURATED_ART_IMAGES.illustration.creative,
    artTexture: "watercolor_paper"
  },
  // PROPOSITION 3 : BACK COVER MINIMALISTE LUXE ÉDITORIAL
  {
    id: 'back-prop-3',
    synopsis: "Un manuel clair, percutant et sans jargon pour transformer vos économies en un moteur d'expansion financière. Découvrez comment naviguer avec assurance dans l'écosystème financier africain contemporain.",
    authorBio: "Spécialiste renommé de l'ingénierie financière et mentor auprès de plusieurs incubateurs technologiques majeurs en Afrique francophone.",
    keyTakeaways: [
      "Construire un plan d'action financier sur 1, 3 et 5 ans",
      "Maîtriser le ratio risque/rendement des nouveaux instruments digitaux",
      "Créer des micro-entreprises automatisées à fort potentiel",
      "Protéger son patrimoine contre les chocs macro-économiques"
    ],
    quoteOrCallToAction: "« Le meilleur moment pour investir était il y a dix ans. Le deuxième meilleur moment, c'est aujourd'hui. »",
    artStyle: "minimalist",
    artStyleLabel: "✨ Minimaliste & Cadre Or",
    paletteName: "Noir Impérial & Cuivre",
    isbnNumber: "978-2-84000-789-0",
    barcodeDigits: "9782840007890",
    bgGradient: "from-stone-950 via-neutral-900 to-amber-950",
    textColor: "#f8fafc",
    accentColor: "#f97316",
    layoutVariant: "minimal_quote",
    artTexture: "linen"
  },
  // PROPOSITION 4 : BACK COVER GRAPHIQUE & 3D MODERNE
  {
    id: 'back-prop-4',
    synopsis: "Véritable boussole économique, cet ouvrage décrypte les mécanismes secrets de la création de valeur à l'ère des plateformes numériques et offre des solutions applicables immédiatement.",
    authorBio: "Auteur prolifique et conférencier, Dr. Ndiaye partage ses principes d'allocation d'actifs avec une clarté pédagogique plébiscitée par les lecteurs.",
    keyTakeaways: [
      "Stratégies d'investissement adaptées à tous les budgets de départ",
      "Outils et applications sécurisées pour piloter ses actifs depuis son smartphone",
      "Protection contre la dévaluation monétaire et création de réserves solides",
      "Framework exclusif d'analyse de projet en 7 étapes"
    ],
    quoteOrCallToAction: "« Prenez le contrôle absolu de votre avenir financier dès aujourd'hui. »",
    artStyle: "abstract",
    artStyleLabel: "📐 Graphique & Split Moderne",
    paletteName: "Bleu Nuit & Ambre",
    isbnNumber: "978-2-84000-999-9",
    barcodeDigits: "9782840009999",
    bgGradient: "from-blue-950 via-indigo-900 to-purple-950",
    textColor: "#f8fafc",
    accentColor: "#38bdf8",
    layoutVariant: "editorial_split",
    artImageUrl: CURATED_ART_IMAGES.abstract.cyber,
    artTexture: "cyber_grid"
  }
];

export const AVAILABLE_EBOOK_LANGUAGES = [
  { code: 'fr', label: 'Français (French)', flag: '🇫🇷' },
  { code: 'en', label: 'English (Anglais)', flag: '🇬🇧' },
  { code: 'es', label: 'Español (Espagnol)', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية (Arabe)', flag: '🇸🇦' },
  { code: 'pt', label: 'Português (Portugais)', flag: '🇵🇹' },
  { code: 'de', label: 'Deutsch (Allemand)', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano (Italien)', flag: '🇮🇹' },
  { code: 'wo', label: 'Wolof (Sénégal)', flag: '🇸🇳' }
];

export const AVAILABLE_EBOOK_GENRES = [
  "Livre pour Enfants & Conte Illustré",
  "Roman, Fiction & Storytelling",
  "Fantastique, Sci-Fi & Aventure",
  "Business & Entrepreneuriat",
  "Développement Personnel & Mindset",
  "Technologie, IA & Digital",
  "Finance Personnelle & Investissement",
  "Marketing, Vente & Copywriting",
  "Santé, Bien-être & Nutrition",
  "Guide Pratique & Tutoriel Métier",
  "Éducation, Pédagogie & Carrière",
  "Spiritualité & Philosophie",
  "Poésie & Beaux Livres"
];

export const AVAILABLE_EBOOK_TONES = [
  "Ludique, Féerique & Pédagogique (Enfants / Jeunesse)",
  "Pédagogique, Inspirant & Orienté Action",
  "Professionnel, Rigoureux & Autoritaire",
  "Storytelling, Émotionnel & Captivant",
  "Concis, Pragmatique & Direct au but",
  "Académique, Analytique & Documenté",
  "Mystérieux, Haletant & Immersif"
];

export const ART_STYLES_FILTER = [
  { id: 'all', label: 'Tous les Styles (Mix 4 Arts)', icon: '✨' },
  { id: 'photorealistic', label: 'Photoréaliste Cinéma', icon: '📸' },
  { id: 'illustration', label: 'Illustration / Dessin', icon: '🎨' },
  { id: 'minimalist', label: 'Minimaliste Luxe', icon: '💎' },
  { id: 'abstract', label: 'Graphique & 3D', icon: '📐' }
];

/**
 * Generate a direct AI image URL based on a descriptive text prompt
 */
export function buildPollinationsImageUrl(prompt: string, seed: number = 42): string {
  const encoded = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=1200&model=flux&nologo=true&seed=${seed}`;
}

/**
 * Helper to analyze topic/keywords and produce hyper-specific thematic image prompts
 */
export function buildThematicCoverArtPrompts(params: {
  title: string;
  subtitle?: string;
  genre: string;
  targetAudience?: string;
  summaryOrPrompt?: string;
  customPrompt?: string;
}) {
  const fullText = `${params.title} ${params.subtitle || ''} ${params.genre || ''} ${params.targetAudience || ''} ${params.summaryOrPrompt || ''} ${params.customPrompt || ''}`.toLowerCase();

  // 1. MANGA / ANIME / NARUTO / SHONEN / NINJA / DRAGON BALL
  if (
    fullText.includes('naruto') ||
    fullText.includes('manga') ||
    fullText.includes('anime') ||
    fullText.includes('shonen') ||
    fullText.includes('sasuke') ||
    fullText.includes('konoha') ||
    fullText.includes('ninja') ||
    fullText.includes('dragon ball') ||
    fullText.includes('goku') ||
    fullText.includes('one piece') ||
    fullText.includes('luffy') ||
    fullText.includes('otaku') ||
    fullText.includes('jujutsu') ||
    fullText.includes('shinobi')
  ) {
    const charName = fullText.includes('naruto') ? 'Naruto Uzumaki with spiky blond hair and forehead protector' : (fullText.includes('goku') ? 'Goku with super saiyan hair' : (fullText.includes('luffy') ? 'Luffy with straw hat' : 'heroic anime ninja warrior'));
    return {
      themeKey: 'manga',
      prompts: {
        photorealistic: `cinematic live action anime movie poster of ${charName}, intense focused expression, wearing iconic ninja headband and orange black costume, glowing chakra energy aura, rooftop at dusk with Japanese village in background, dramatic volumetric lighting, 8k masterpiece`,
        illustration: `authentic Japanese Shonen anime manga book cover illustration of ${charName}, charging a glowing swirling blue Rasengan energy orb, dynamic action pose, detailed anime art style, vibrant speedlines and Konoha village background`,
        minimalist: `minimalist Japanese ink wash manga painting of a ninja silhouette with glowing red eyes and Nine Tails fox chakra aura, luxury crimson and black Japanese calligraphy aesthetic, clean negative space`,
        abstract: `dynamic 3D anime energy explosion with glowing chakra spirals, ninja shuriken silhouettes and neon cyan manga speedlines, high contrast Japanese manga art`
      },
      genreBadge: "🍥 Manga & Anime Officiel",
      paletteName: "Orange Konoha & Énergie Cyan",
      bgGradient: "from-orange-950 via-slate-950 to-blue-950",
      accentColor: "#f97316",
      textColor: "#ffffff",
      fontFamily: "display" as const
    };
  }

  // 2. ARGENT / POUVOIR DE L'ARGENT / RICHESSE / FORTUNE / MILLIONNAIRE / LIBERTÉ FINANCIÈRE
  if (
    fullText.includes('argent') ||
    fullText.includes('pouvoir de l\'argent') ||
    fullText.includes('richesse') ||
    fullText.includes('fortune') ||
    fullText.includes('millionnaire') ||
    fullText.includes('milliardaire') ||
    fullText.includes('devenir riche') ||
    fullText.includes('indépendance financière') ||
    fullText.includes('liberté financière') ||
    fullText.includes('cashflow') ||
    fullText.includes('patrimoine') ||
    fullText.includes('prospérité') ||
    fullText.includes('finances personnelles') ||
    fullText.includes('gagner de l\'argent')
  ) {
    return {
      themeKey: 'argent_richesse',
      prompts: {
        photorealistic: `cinematic luxury photography of an open high-tech bank vault revealing stacked solid gold bullion bars and glowing warm golden illumination, luxury penthouse office overlooking a glowing night city skyline with financial skyscrapers, 8k masterpiece`,
        illustration: `majestic digital art painting of a grand golden tree of wealth with glowing golden coins and leaves ascending towards a deep royal sapphire night sky, stream of radiant liquid gold and prosperity symbols, high detail fantasy editorial book cover`,
        minimalist: `minimalist luxury gold foil geometric emblem of wealth and prosperity sculpted on deep black matte obsidian marble texture, embossed golden typography, prestige bestseller book cover`,
        abstract: `dynamic 3D geometric matrix of flowing liquid gold ribbons and emerald green financial growth charts on sleek titanium carbon background, high contrast modern finance art`
      },
      genreBadge: "💎 Pouvoir Financier & Richesse",
      paletteName: "Or Pur & Obsidienne Impériale",
      bgGradient: "from-amber-950 via-slate-950 to-neutral-900",
      accentColor: "#fbbf24",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 3. CRYPTO / BITCOIN / FINANCE / TRADING / BOURSE / BLOCKCHAIN
  if (
    fullText.includes('bitcoin') ||
    fullText.includes('crypto') ||
    fullText.includes('trading') ||
    fullText.includes('bourse') ||
    fullText.includes('forex') ||
    fullText.includes('blockchain') ||
    fullText.includes('ethereum') ||
    fullText.includes('btc') ||
    fullText.includes('investir en bourse')
  ) {
    return {
      themeKey: 'crypto',
      prompts: {
        photorealistic: `photorealistic 3D rendered glowing solid gold Bitcoin coin levitating above a high-tech dark glass trading terminal with multi-monitor candlestick charts and financial metrics, dark luxury cinematic studio lighting, 8k`,
        illustration: `epic digital painting illustration of glowing golden crypto coins and digital blockchain network connecting global skylines and modern financial skyscrapers at dusk`,
        minimalist: `minimalist luxury gold foil Bitcoin emblem on sleek matte black carbon fiber background with a subtle green upward financial trend line`,
        abstract: `3D geometric isometric blockchain matrix, glowing crypto data cubes, digital financial network nodes, neon cyan and gold`
      },
      genreBadge: "💰 Finance & Cryptomonnaies",
      paletteName: "Or Bitcoin & Noir Titane",
      bgGradient: "from-slate-950 via-neutral-900 to-amber-950",
      accentColor: "#f59e0b",
      textColor: "#ffffff",
      fontFamily: "sans" as const
    };
  }

  // 3. CUISINE / GASTRONOMIE / RECETTES / CHEF
  if (
    fullText.includes('cuisine') ||
    fullText.includes('recette') ||
    fullText.includes('culinaire') ||
    fullText.includes('gastronomie') ||
    fullText.includes('chef') ||
    fullText.includes('plat') ||
    fullText.includes('manger') ||
    fullText.includes('patisserie') ||
    fullText.includes('africaine') && (fullText.includes('marmite') || fullText.includes('jollof') || fullText.includes('repas'))
  ) {
    return {
      themeKey: 'cuisine',
      prompts: {
        photorealistic: `mouthwatering gourmet culinary dish presentation, steaming aromatic food with fresh green herbs, colorful vibrant spices, artisanal wooden table, Michelin star restaurant photography, warm appetizing lighting, 8k`,
        illustration: `warm colorful watercolor illustration of a smiling passionate chef preparing traditional rich dishes with bubbling clay cooking pot and fresh organic market ingredients`,
        minimalist: `minimalist luxury gold chef knife and rosemary sprig silhouette on deep black slate texture, gourmet cookbook cover design`,
        abstract: `artistic dynamic 3D explosion of colorful cooking spices, chili powder, saffron, and golden olive oil droplets in mid-air motion`
      },
      genreBadge: "🍲 Gastronomie & Recettes",
      paletteName: "Épices Chaudes & Terracotta",
      bgGradient: "from-amber-950 via-orange-950 to-stone-900",
      accentColor: "#f97316",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 4. AFRIQUE / INVESTISSEMENT EN AFRIQUE / BUSINESS & MOBILE MONEY
  if (
    fullText.includes('afrique') ||
    fullText.includes('senegal') ||
    fullText.includes('dakar') ||
    fullText.includes('abidjan') ||
    fullText.includes('cote d\'ivoire') ||
    fullText.includes('cameroun') ||
    fullText.includes('congo') ||
    fullText.includes('kinshasa') ||
    fullText.includes('mobile money') ||
    fullText.includes('uemoa')
  ) {
    return {
      themeKey: 'afrique_business',
      prompts: {
        photorealistic: `charismatic African tech entrepreneur smiling holding smartphone in front of a modern glass skyscraper skyline in Dakar and Abidjan at golden sunset, business suit, high quality photography, 8k`,
        illustration: `vibrant digital art illustration of modern African continent glowing with digital mobile payment network lines, fintech connections, solar panels and rising growth curves`,
        minimalist: `minimalist luxury gold outline of African continent map with modern upward growth arrow on dark imperial indigo background`,
        abstract: `3D modern fusion of authentic African geometric kente patterns and futuristic glowing digital data cubes in gold and emerald`
      },
      genreBadge: "🌍 Économie & Afrique 3.0",
      paletteName: "Prestige Indigo & Or Africain",
      bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
      accentColor: "#fbbf24",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 5. ENFANTS / CONTES / DRAGON / FÉERIE / ANIMAUX
  if (
    fullText.includes('enfant') ||
    fullText.includes('conte') ||
    fullText.includes('dragon') ||
    fullText.includes('fée') ||
    fullText.includes('magique') ||
    fullText.includes('château') ||
    fullText.includes('licorne') ||
    fullText.includes('animaux') ||
    fullText.includes('jeunesse')
  ) {
    return {
      themeKey: 'children',
      prompts: {
        photorealistic: `magical 3D Pixar animated movie style friendly cute green baby dragon with big expressive smiling eyes sitting in an enchanted glowing magical forest with fairy lights, 8k`,
        illustration: `delightful storybook watercolor illustration of a charming friendly dragon and happy children flying over a rainbow magical castle in a sunny sky, soft pastel colors`,
        minimalist: `minimalist gold foil fairy tale castle and smiling baby dragon silhouette under a crescent moon with twinkling stars on deep twilight blue`,
        abstract: `whimsical 3D colorful floating islands with candy trees, rainbow waterfalls, and magical glowing crystals in a dreamy fantasy sky`
      },
      genreBadge: "🌟 Grand Album Enfant",
      paletteName: "Féerie Étoilée & Arc-en-Ciel",
      bgGradient: "from-indigo-950 via-purple-900 to-rose-950",
      accentColor: "#f43f5e",
      textColor: "#ffffff",
      fontFamily: "display" as const
    };
  }

  // 6. INTELLIGENCE ARTIFICIELLE / ROBOTIQUE / CODE / TECH / PYTHON
  if (
    fullText.includes('ia') ||
    fullText.includes('intelligence artificielle') ||
    fullText.includes('robot') ||
    fullText.includes('python') ||
    fullText.includes('machine learning') ||
    fullText.includes('cyber') ||
    fullText.includes('code') ||
    fullText.includes('développeur')
  ) {
    return {
      themeKey: 'ai_tech',
      prompts: {
        photorealistic: `photorealistic futuristic humanoid robot with glowing glass skull revealing luminous blue neural network synapses and quantum AI core in a high-tech dark laboratory, 8k`,
        illustration: `digital concept art illustration of a glowing holographic AI brain connecting to digital fiber optic neural network and futuristic computer code matrix`,
        minimalist: `minimalist sleek glowing cyan neural network node and binary code tree on deep obsidian background`,
        abstract: `3D cyber matrix cube dissolving into radiant holographic light particles, neon blue and violet fiber optic data streams`
      },
      genreBadge: "🤖 Intelligence Artificielle & Tech",
      paletteName: "Cyber Néon & Bleu Électrique",
      bgGradient: "from-slate-950 via-slate-900 to-cyan-950",
      accentColor: "#06b6d4",
      textColor: "#ffffff",
      fontFamily: "sans" as const
    };
  }

  // 7. ESPACE / SCIENCE-FICTION / ASTRONOMIE / MARS
  if (
    fullText.includes('espace') ||
    fullText.includes('astronomie') ||
    fullText.includes('mars') ||
    fullText.includes('cosmos') ||
    fullText.includes('astronaute') ||
    fullText.includes('univers') ||
    fullText.includes('sci-fi')
  ) {
    return {
      themeKey: 'space',
      prompts: {
        photorealistic: `cinematic photorealistic astronaut in modern spacesuit floating in deep space with glowing rings of Saturn and vibrant colorful cosmic nebula in background, 8k`,
        illustration: `epic retro sci-fi illustration of interstellar exploration starship soaring through hyper-space towards a glowing alien planetary system`,
        minimalist: `minimalist cosmic art with thin gold orbital planetary rings and glowing lone star on deep void black canvas`,
        abstract: `3D quantum cosmic vortex with glowing stardust particles and neon hyper-space geometric rings`
      },
      genreBadge: "🚀 Odyssée Spatiale & Sci-Fi",
      paletteName: "Nébuleuse Cosmique & Violet",
      bgGradient: "from-slate-950 via-purple-950 to-indigo-950",
      accentColor: "#a855f7",
      textColor: "#ffffff",
      fontFamily: "display" as const
    };
  }

  // 8. DÉVELOPPEMENT PERSONNEL / MINDSET / LEADERSHIP / SUCCÈS
  if (
    fullText.includes('mindset') ||
    fullText.includes('développement personnel') ||
    fullText.includes('succès') ||
    fullText.includes('confiance') ||
    fullText.includes('leadership') ||
    fullText.includes('discipline')
  ) {
    return {
      themeKey: 'mindset',
      prompts: {
        photorealistic: `cinematic photograph of a determined person standing at the summit of a grand mountain peak looking at infinite golden horizon under morning sunbeams, 8k`,
        illustration: `inspiring digital art of a glowing golden staircase leading up through dramatic clouds towards a radiant golden sunrise and majestic eagle in flight`,
        minimalist: `minimalist geometric gold compass and ascending arrow on deep textured charcoal canvas`,
        abstract: `3D dynamic burst of golden geometric crystals ascending towards bright light, symbolizing personal transformation and growth`
      },
      genreBadge: "✨ Mindset & Accomplissement",
      paletteName: "Aube Dorée & Sommet",
      bgGradient: "from-stone-950 via-neutral-900 to-amber-950",
      accentColor: "#f59e0b",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 9. IMMOBILIER / PROPERTY / INVESTISSEMENT LOCATIF
  if (
    fullText.includes('immobilier') ||
    fullText.includes('maison') ||
    fullText.includes('appartement') ||
    fullText.includes('locatif') ||
    fullText.includes('foncier') ||
    fullText.includes('immeuble')
  ) {
    return {
      themeKey: 'immobilier',
      prompts: {
        photorealistic: `cinematic architectural photography of an ultra-luxury modern villa with infinity pool overlooking city skyline at dusk, golden ambient interior lighting, 8k masterpiece`,
        illustration: `digital architectural blueprint illustration of modern luxury residential properties glowing with golden light and green sustainable gardens`,
        minimalist: `minimalist luxury gold key and geometric modern house silhouette on dark textured granite stone background`,
        abstract: `3D architectural glass and titanium cubic towers rising upward with golden light rays and financial growth charts`
      },
      genreBadge: "🏢 Immobilier & Patrimoine",
      paletteName: "Bleu Minéral & Or Champagne",
      bgGradient: "from-slate-950 via-blue-950 to-neutral-900",
      accentColor: "#38bdf8",
      textColor: "#ffffff",
      fontFamily: "sans" as const
    };
  }

  // 10. SANTÉ / FITNESS / SPORT / NUTRITION / BIEN-ÊTRE
  if (
    fullText.includes('santé') ||
    fullText.includes('fitness') ||
    fullText.includes('sport') ||
    fullText.includes('musculation') ||
    fullText.includes('nutrition') ||
    fullText.includes('jeûne') ||
    fullText.includes('régime') ||
    fullText.includes('yoga') ||
    fullText.includes('méditation')
  ) {
    return {
      themeKey: 'sante_fitness',
      prompts: {
        photorealistic: `athletic powerful silhouette of a healthy runner in nature during golden sunrise, mist in pine forest, cinematic dramatic sports photography, 8k`,
        illustration: `vibrant digital illustration of human vitality, glowing green organic leaves, balanced energy chakras and active healthy lifestyle`,
        minimalist: `minimalist luxury gold leaf and heartbeat pulse line on clean deep emerald green matte background`,
        abstract: `3D dynamic burst of glowing emerald green and sapphire bio-luminescent energy waves and fitness icons`
      },
      genreBadge: "🌿 Santé, Vitalité & Performance",
      paletteName: "Émeraude Royale & Or Vert",
      bgGradient: "from-teal-950 via-emerald-950 to-slate-950",
      accentColor: "#34d399",
      textColor: "#ffffff",
      fontFamily: "sans" as const
    };
  }

  // 11. MARKETING / VENTE / COPYWRITING / SOCIAL MEDIA
  if (
    fullText.includes('marketing') ||
    fullText.includes('vente') ||
    fullText.includes('copywriting') ||
    fullText.includes('influenceur') ||
    fullText.includes('tiktok') ||
    fullText.includes('instagram') ||
    fullText.includes('branding')
  ) {
    return {
      themeKey: 'marketing',
      prompts: {
        photorealistic: `high-tech modern digital marketing studio with glowing global network holographic displays, neon metrics, sleek designer desk, 8k`,
        illustration: `digital artwork of a glowing golden megaphone amplifying creative ideas that turn into flying stars and viral connections across the world`,
        minimalist: `minimalist luxury gold lightning bolt and precision target emblem on dark charcoal velvet texture`,
        abstract: `3D isometric dynamic funnel with glowing vibrant magenta, neon purple and golden conversion spheres in motion`
      },
      genreBadge: "⚡ Marketing & Vente Stratégique",
      paletteName: "Magenta Néon & Violet Sombre",
      bgGradient: "from-purple-950 via-slate-950 to-rose-950",
      accentColor: "#f43f5e",
      textColor: "#ffffff",
      fontFamily: "display" as const
    };
  }

  // 12. ROMAN / AMOUR / ROMANCE / SENTIMENTS / COUPLE
  if (
    fullText.includes('amour') ||
    fullText.includes('romance') ||
    fullText.includes('passion') ||
    fullText.includes('mariage') ||
    fullText.includes('coeur') ||
    fullText.includes('sentiment') ||
    fullText.includes('couple') ||
    fullText.includes('relation') ||
    fullText.includes('aimer')
  ) {
    return {
      themeKey: 'romance',
      prompts: {
        photorealistic: `cinematic emotional romantic portrait of two lovers tenderly holding hands at sunset on a seaside cliff, golden twilight glow, cinematic shallow depth of field, 8k masterpiece`,
        illustration: `warm poetic watercolor illustration of two souls embracing under a blooming cherry blossom tree with swirling petals, soft gentle pastel colors, emotional novel cover`,
        minimalist: `minimalist luxury gold foil interconnected hearts and elegant rose silhouette on deep crimson velvet background`,
        abstract: `3D fluid ribbons of passionate crimson red and shimmering gold intertwining with glowing heart-shaped light particles`
      },
      genreBadge: "🌹 Roman & Romance Passionnée",
      paletteName: "Rubis Passion & Or Rose",
      bgGradient: "from-rose-950 via-slate-950 to-red-950",
      accentColor: "#f43f5e",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 13. HISTOIRE / BIOGRAPHIE / MÉMOIRES / HÉRITAGE / AFRIQUE ANCIENNE / ROIS
  if (
    fullText.includes('histoire') ||
    fullText.includes('biographie') ||
    fullText.includes('mémoire') ||
    fullText.includes('héritage') ||
    fullText.includes('empire') ||
    fullText.includes('royaume') ||
    fullText.includes('ancêtre') ||
    fullText.includes('monument') ||
    fullText.includes('pharaon') ||
    fullText.includes('mandingue') ||
    fullText.includes('antiquité')
  ) {
    return {
      themeKey: 'history',
      prompts: {
        photorealistic: `majestic cinematic historic photograph of ancient royal African palace monuments, carved stone thrones with golden ornaments under sunbeams, National Geographic quality, 8k`,
        illustration: `grand classical oil painting illustration of historical leaders and wise elders gathered in council beneath a sacred baobab tree, rich golden textures, museum quality artwork`,
        minimalist: `minimalist gold foil ancient crown and ancient parchment scroll emblem on deep textured antique leather slate`,
        abstract: `3D geometric timeline of glowing ancient hieroglyphs, gold fragments, and historical artifacts floating in atmospheric dust rays`
      },
      genreBadge: "📜 Histoire, Récits & Mémoires",
      paletteName: "Or Antique & Cuir Ancien",
      bgGradient: "from-amber-950 via-stone-900 to-yellow-950",
      accentColor: "#d97706",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 14. POLICIER / THRILLER / SUSPENSE / CRIME / ENQUÊTE / MYSTÈRE
  if (
    fullText.includes('thriller') ||
    fullText.includes('policier') ||
    fullText.includes('mystère') ||
    fullText.includes('crime') ||
    fullText.includes('enquête') ||
    fullText.includes('détective') ||
    fullText.includes('secret') ||
    fullText.includes('ombre') ||
    fullText.includes('meurtre') ||
    fullText.includes('espion')
  ) {
    return {
      themeKey: 'thriller',
      prompts: {
        photorealistic: `dramatic cinematic dark noir thriller scene, mysterious silhouetted figure in trench coat in a foggy rainy city alley under a lone flickering streetlight, 8k dramatic lighting`,
        illustration: `dark moody suspenseful digital painting of a shadowy detective holding an old document in front of a shattered glass window, deep blues and glowing amber contrast`,
        minimalist: `minimalist high-contrast keyhole with blood red light ray cutting through pitch-black obsidian darkness`,
        abstract: `3D fragmented dark glass shards, fingerprint ridges, and glowing neon crime tape geometry floating in deep shadow`
      },
      genreBadge: "🔍 Thriller, Suspense & Enquête",
      paletteName: "Noir Profond & Rouge Sang",
      bgGradient: "from-slate-950 via-neutral-950 to-red-950",
      accentColor: "#ef4444",
      textColor: "#ffffff",
      fontFamily: "sans" as const
    };
  }

  // 15. DROIT / JURIDIQUE / JUSTICE / AVOCAT / CONTRATS
  if (
    fullText.includes('droit') ||
    fullText.includes('juridique') ||
    fullText.includes('justice') ||
    fullText.includes('avocat') ||
    fullText.includes('loi') ||
    fullText.includes('contrat') ||
    fullText.includes('tribunal') ||
    fullText.includes('juge')
  ) {
    return {
      themeKey: 'law',
      prompts: {
        photorealistic: `cinematic photography of the classic bronze scales of justice on a polished mahogany lawyer desk next to heavy leather law books in a prestigious court library, 8k`,
        illustration: `authoritative classical illustration of Lady Justice holding balanced scales and sword with neoclassical columns glowing in warm golden authority`,
        minimalist: `minimalist luxury gold foil scales of justice emblem with crisp Roman numerals on dark navy blue matte texture`,
        abstract: `3D architectural balance structure of polished marble and gold beams symbolizing law, equity, and order`
      },
      genreBadge: "⚖️ Droit, Justice & Pratique Juridique",
      paletteName: "Bleu Magistrat & Bronze",
      bgGradient: "from-slate-950 via-blue-950 to-neutral-900",
      accentColor: "#38bdf8",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 16. AGRICULTURE / ÉLEVAGE / AGRIBUSINESS / TERRE / FERME
  if (
    fullText.includes('agriculture') ||
    fullText.includes('agrobusiness') ||
    fullText.includes('ferme') ||
    fullText.includes('culture') ||
    fullText.includes('plantation') ||
    fullText.includes('terre') ||
    fullText.includes('élevage') ||
    fullText.includes('semence') ||
    fullText.includes('agricole') ||
    fullText.includes('aviculture')
  ) {
    return {
      themeKey: 'agriculture',
      prompts: {
        photorealistic: `cinematic high-resolution photography of rich fertile green farmland and golden wheat fields at sunrise, modern irrigation drones flying overhead, high productivity agribusiness, 8k`,
        illustration: `rich warm digital painting of a proud African farmer in lush green crop fields with giant golden sun and bountiful harvest baskets`,
        minimalist: `minimalist luxury gold wheat sheaf and sprout silhouette on deep fertile earth brown texture`,
        abstract: `3D geometric matrix of green crop furrows, flowing blue irrigation lines, and glowing golden sun rays`
      },
      genreBadge: "🌱 Agriculture & Agrobusiness Moderne",
      paletteName: "Terre Fertile & Vert Émeraude",
      bgGradient: "from-emerald-950 via-stone-900 to-amber-950",
      accentColor: "#22c55e",
      textColor: "#ffffff",
      fontFamily: "sans" as const
    };
  }

  // 17. RELIGION / SPIRITUALITÉ / ISLAM / CHRISTIANISME / PRIÈRE / CORAN / BIBLE
  if (
    fullText.includes('islam') ||
    fullText.includes('coran') ||
    fullText.includes('musulman') ||
    fullText.includes('foi') ||
    fullText.includes('dieu') ||
    fullText.includes('prière') ||
    fullText.includes('bible') ||
    fullText.includes('chrétien') ||
    fullText.includes('église') ||
    fullText.includes('mosquée') ||
    fullText.includes('spiritualité') ||
    fullText.includes('ramadan') ||
    fullText.includes('spirituel')
  ) {
    return {
      themeKey: 'spiritualite',
      prompts: {
        photorealistic: `cinematic photography of golden light rays beaming down through sacred arched domes onto an open holy book on a carved wooden stand, peaceful sacred serenity, 8k`,
        illustration: `luminous spiritual illustration of sacred geometric arabesques and glowing heavenly light descending into an oasis of peace and inner reflection`,
        minimalist: `minimalist delicate gold calligraphy and celestial crescent or cross emblem on deep royal emerald and midnight blue background`,
        abstract: `3D ethereal geometric mandala of radiating golden light rays, geometric star patterns and shimmering celestial dust`
      },
      genreBadge: "🕊️ Foi, Spiritualité & Sagesse",
      paletteName: "Or Sacré & Vert Céleste",
      bgGradient: "from-emerald-950 via-slate-950 to-indigo-950",
      accentColor: "#fbbf24",
      textColor: "#ffffff",
      fontFamily: "serif" as const
    };
  }

  // 18. MUSIQUE / DANSE / ART / CRÉATIVITÉ
  if (
    fullText.includes('musique') ||
    fullText.includes('danse') ||
    fullText.includes('chanson') ||
    fullText.includes('guitare') ||
    fullText.includes('piano') ||
    fullText.includes('rythme') ||
    fullText.includes('dj') ||
    fullText.includes('compositeur') ||
    fullText.includes('studio') ||
    fullText.includes('artiste')
  ) {
    return {
      themeKey: 'musique',
      prompts: {
        photorealistic: `cinematic photography of an acoustic guitar and modern sound mixing console with illuminated dials and warm analog studio lighting, 8k`,
        illustration: `vibrant digital art of musical notes and colorful sound waves bursting out of a musical instrument into a swirling starry night sky`,
        minimalist: `minimalist fine gold treble clef and vinyl record grooves on sleek deep charcoal matte canvas`,
        abstract: `3D colorful dynamic equalizer waves and glowing neon sound frequency curves floating in space`
      },
      genreBadge: "🎵 Musique, Rythme & Création",
      paletteName: "Violet Électrique & Magenta",
      bgGradient: "from-purple-950 via-slate-950 to-indigo-950",
      accentColor: "#c084fc",
      textColor: "#ffffff",
      fontFamily: "display" as const
    };
  }

  // DEFAULT / TOUT AUTRE SUJET - ULTRA DÉTAILLÉ SELON LE TITRE ET SOUS-TITRE
  const cleanSubject = params.title.replace(/["'«»]/g, '').trim() || 'Livre Bestseller';
  const cleanSub = params.subtitle ? params.subtitle.replace(/["'«»]/g, '').trim() : '';
  const combinedTopic = cleanSub ? `${cleanSubject} (${cleanSub})` : cleanSubject;

  // Extract key keywords from title to refine prompt even further
  const words = cleanSubject.split(/\s+/).filter(w => w.length > 3).join(', ');

  return {
    themeKey: 'general',
    prompts: {
      photorealistic: `cinematic photorealistic book cover visual representing "${combinedTopic}", highlighting themes of (${words || combinedTopic}), dramatic studio rim lighting, award-winning book cover photography, highly detailed, 8k masterpiece`,
      illustration: `masterful digital art painting and storytelling illustration depicting the concepts of "${combinedTopic}", expressive artistic details, vibrant emotional depth, high quality publishing cover art`,
      minimalist: `minimalist luxury gold foil emblem and refined symbol of "${cleanSubject}", elegant negative space on deep textured slate marble, high-end editorial bestseller design`,
      abstract: `modern 3D geometric abstract artwork symbolizing "${combinedTopic}", floating crystal shapes, volumetric radiant lighting, avant-garde design`
    },
    genreBadge: params.genre || "Édition Bestseller",
    paletteName: "Prestige Indigo & Or",
    bgGradient: "from-slate-950 via-indigo-950 to-slate-900",
    accentColor: "#fbbf24",
    textColor: "#ffffff",
    fontFamily: "serif" as const
  };
}

/**
 * Intelligent helper to generate ONE unique, ultra-detailed, artistic, contextual proposal by default
 */
export function generateContextualEbookProposals(params: {
  title: string;
  subtitle?: string;
  author: string;
  genre: string;
  language: string;
  targetAudience?: string;
  summaryOrPrompt?: string;
  customPrompt?: string;
  forceArtStyle?: string;
  variationSeed?: number;
}): { frontProposals: EbookCoverProposal[]; backProposals: EbookBackCoverProposal[] } {
  const { title, subtitle = '', author, genre, language, targetAudience = '', summaryOrPrompt = '', customPrompt = '', forceArtStyle, variationSeed } = params;
  
  const thematicData = buildThematicCoverArtPrompts({
    title,
    subtitle,
    genre,
    targetAudience,
    summaryOrPrompt,
    customPrompt
  });

  const isChildren = thematicData.themeKey === 'children';
  const isManga = thematicData.themeKey === 'manga';
  const isBusinessOrFinance = thematicData.themeKey === 'argent_richesse' || thematicData.themeKey === 'crypto' || thematicData.themeKey === 'business' || thematicData.themeKey === 'ia';
  const isNovelOrRomance = thematicData.themeKey === 'romance' || thematicData.themeKey === 'thriller';

  const baseSeed = (variationSeed !== undefined ? variationSeed : Math.abs(title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 100)) + Math.floor(Math.random() * 50);

  // 1. Photoréaliste / Cinématique
  const photoPrompt = thematicData.prompts.photorealistic;
  const photoImg = buildPollinationsImageUrl(photoPrompt, baseSeed + 101);

  const frontPhoto: EbookCoverProposal = {
    id: `front-${Date.now()}-photo`,
    title,
    subtitle: subtitle || (isChildren ? "Une Aventure Extraordinaire et Magique" : "Le Guide de Référence Complet"),
    author,
    genreBadge: thematicData.genreBadge,
    tagline: isChildren ? "Une histoire féerique qui éveille l'imagination des petits et grands" : "L'ouvrage fondamental pour maîtriser son sujet",
    artStyle: "photorealistic",
    artStyleLabel: "📸 Photoréaliste Cinématographique",
    paletteName: thematicData.paletteName,
    bgGradient: thematicData.bgGradient,
    bgPattern: isChildren ? "stars" : "gold_frame",
    textColor: thematicData.textColor,
    subtitleColor: isChildren ? "#fef08a" : "#cbd5e1",
    accentColor: thematicData.accentColor,
    fontFamily: thematicData.fontFamily,
    layoutVariant: "cinematic_poster",
    coverArtEmojiOrIcon: isChildren ? "✨" : "💎",
    artImageUrl: photoImg,
    imagePrompt: photoPrompt,
    artTexture: "gold_foil"
  };

  // 2. Illustration / Dessin / Peinture
  const illustrPrompt = thematicData.prompts.illustration;
  const illustrImg = buildPollinationsImageUrl(illustrPrompt, baseSeed + 202);

  const frontIllustr: EbookCoverProposal = {
    id: `front-${Date.now()}-illustr`,
    title,
    subtitle: subtitle || (isChildren ? "Livre Illustré en Couleurs pour Enfants" : (isManga ? "Édition Manga Officielle" : "Approche Visuelle & Pédagogique")),
    author,
    genreBadge: isChildren ? "🎨 Grand Album Illustré" : (isManga ? "🍥 Manga & Shonen" : "Édition Graphique & Visuelle"),
    tagline: isChildren ? "Des illustrations tendres et colorées à dévorer le soir" : "Une perspective originale illustrée avec brio",
    artStyle: "illustration",
    artStyleLabel: isChildren ? "🎨 Dessin Animé & Aquarelle Féerique" : (isManga ? "🍥 Manga Shonen Authentique" : "🎨 Peinture Numérique & Illustration"),
    paletteName: isChildren ? "Aquarelle Arc-en-Ciel & Corail" : (isManga ? "Orange Konoha & Énergie Cyan" : "Aquarelle Émeraude & Céleste"),
    bgGradient: isChildren ? "from-rose-950 via-purple-900 to-indigo-950" : (isManga ? "from-orange-950 via-slate-950 to-blue-950" : "from-teal-950 via-emerald-900 to-slate-950"),
    bgPattern: "watercolor",
    textColor: "#ffffff",
    subtitleColor: isChildren ? "#fbcfe8" : "#a7f3d0",
    accentColor: isChildren ? "#f43f5e" : (isManga ? "#f97316" : "#34d399"),
    fontFamily: isChildren ? "sans" : "serif",
    layoutVariant: "illustrated_storybook",
    coverArtEmojiOrIcon: isChildren ? "🦄" : "🎨",
    artImageUrl: illustrImg,
    imagePrompt: illustrPrompt,
    artTexture: "watercolor_paper"
  };

  // 3. Minimaliste Luxe & Typographique
  const minPrompt = thematicData.prompts.minimalist;
  const minImg = buildPollinationsImageUrl(minPrompt, baseSeed + 303);

  const frontMin: EbookCoverProposal = {
    id: `front-${Date.now()}-min`,
    title,
    subtitle: subtitle || "Édition Reliée Haut de Gamme",
    author,
    genreBadge: isChildren ? "Livre Cadeau Prestige" : "Bestseller Éditorial",
    tagline: "La pureté du style, l'élégance de la réflexion",
    artStyle: "minimalist",
    artStyleLabel: "✨ Minimaliste & Typographie Prestige",
    paletteName: "Luxe Noir Profond & Dorure à Chaud",
    bgGradient: "from-stone-950 via-neutral-900 to-stone-900",
    bgPattern: "marble",
    textColor: "#ffffff",
    subtitleColor: "#fed7aa",
    accentColor: "#fbbf24",
    fontFamily: "serif",
    layoutVariant: "minimalist_luxury",
    coverArtEmojiOrIcon: "👑",
    artImageUrl: minImg,
    imagePrompt: minPrompt,
    artTexture: "linen"
  };

  // Back Cover matching the context
  const backUnique: EbookBackCoverProposal = {
    id: `back-${Date.now()}-1`,
    synopsis: isChildren 
      ? `Plongez dans l'univers merveilleux de "${title}". Une histoire touchante remplie d'amitié, de courage et de tendresse qui émerveillera les jeunes lecteurs à partir de 4 ans. Les enfants découvriront des valeurs précieuses au fil des pages magnifiquement illustrées.`
      : (isNovelOrRomance
        ? `Une œuvre bouleversante qui vous tiendra en haleine jusqu'à la dernière ligne. "${title}" explore les méandres des émotions humaines avec une intensité rare et une plume inoubliable.`
        : `Découvrez dans cet ouvrage incontournable les principes majeurs et les méthodologies concrètes pour exceller dans le domaine de "${title}". Écrit avec rigueur et passion, ce livre apporte des solutions claires et immédiatement applicables.`),
    authorBio: `${author} est un auteur passionné qui transmet son savoir et son univers avec une pédagogie plébiscitée par ses lecteurs.`,
    keyTakeaways: isChildren
      ? [
          "Une aventure captivante favorisant l'éveil et l'imaginaire",
          "Des messages bienveillants sur le partage et le respect",
          "Idéal pour l'histoire du soir ou les premières lectures autonomes",
          "Grand format avec texte aéré et adapté aux enfants"
        ]
      : (isNovelOrRomance
        ? [
            "Une intrigue addictive et des personnages inoubliables",
            "Une immersion totale au cœur d'une atmosphère envoûtante",
            "Des rebondissements psychologiques inattendus",
            "Un final grandiose salué par la critique"
          ]
        : [
            "Comprendre les fondements et anticiper les évolutions futures",
            "Découvrir des cas pratiques et retours d'expérience concrets",
            "Appliquer une méthode pas-à-pas pour des résultats mesurables",
            "Éviter les erreurs courantes et gagner un temps précieux"
          ]),
    quoteOrCallToAction: isChildren 
      ? "« Le plus beau cadeau à offrir à un enfant est une histoire qui le fait rêver. »"
      : (isNovelOrRomance
        ? "« Un chef-d'œuvre littéraire captivant qui résonne longtemps après l'avoir refermé. »"
        : "« La véritable maîtrise réside dans la capacité à transformer le savoir en action délibérée. »"),
    artStyle: isChildren || isManga ? "illustration" : "photorealistic",
    artStyleLabel: isChildren || isManga ? "🎨 Illustration & Storytelling" : "📸 Photoréaliste Cinématographique",
    paletteName: isChildren || isManga ? frontIllustr.paletteName : frontPhoto.paletteName,
    isbnNumber: `978-2-84000-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1 + Math.random() * 9)}`,
    barcodeDigits: `978284000${Math.floor(100000 + Math.random() * 900000)}`,
    bgGradient: isChildren || isManga ? frontIllustr.bgGradient : frontPhoto.bgGradient,
    textColor: "#f8fafc",
    accentColor: isChildren || isManga ? frontIllustr.accentColor : frontPhoto.accentColor,
    layoutVariant: isChildren || isManga ? "illustrated_story" : "cinematic_dark",
    artImageUrl: isChildren || isManga ? illustrImg : photoImg,
    imagePrompt: isChildren || isManga ? illustrPrompt : photoPrompt,
    artTexture: isChildren || isManga ? "watercolor_paper" : "gold_foil"
  };

  // Determine which single front proposal is the optimal best match for this book context
  let primaryFront: EbookCoverProposal;
  if (forceArtStyle === 'illustration' || isChildren || isManga) {
    primaryFront = frontIllustr;
  } else if (forceArtStyle === 'minimalist') {
    primaryFront = frontMin;
  } else {
    primaryFront = frontPhoto;
  }

  return {
    frontProposals: [primaryFront],
    backProposals: [backUnique]
  };
}

export const EBOOK_PAGE_COUNT_PRESETS = [
  { count: 5, label: '5 Pages', description: 'Synthèse Express & Fiche Méthode', badge: 'Flash' },
  { count: 10, label: '10 Pages', description: 'Ebook Pratique & Plan d\'Action (Recommandé)', badge: 'Populaire' },
  { count: 15, label: '15 Pages', description: 'Guide Thématique & Retours d\'Expérience', badge: 'Complet' },
  { count: 20, label: '20 Pages', description: 'Livre Approfondi & Méthodologie Pro', badge: 'Avancé' },
  { count: 30, label: '30 Pages', description: 'Manuel Stratégique & Études de Cas', badge: 'Mastery' },
  { count: 50, label: '50 Pages', description: 'Grand Guide d\'Expertise & Référence', badge: 'Expert' },
  { count: 100, label: '100 Pages', description: 'Ouvrage Intégral & Encyclopédie Spécialisée', badge: 'Prestige' },
];

export interface EbookExactInteriorPage {
  pageNumber: number; // e.g. 4, 5, 6, ..., N-1
  totalPages: number;
  chapterNumber: number;
  chapterTitle: string;
  chapterSubtitle?: string;
  pageHeaderTitle: string;
  subheading?: string;
  readingTimeMinutes?: number;
  paragraphs: string[];
  keyTakeaways?: string[];
  isChapterStart: boolean;
  isChapterEnd: boolean;
}

/**
 * Distributes chapters into an exact number of formatted interior pages
 * Total Target Pages = N
 * Front Cover = Page 1
 * Legal & Copyright = Page 2
 * Table of Contents = Page 3
 * Interior Pages = Pages 4 to N - 1 (Count: N - 3)
 * Back Cover = Page N
 */
export function distributeChaptersIntoExactPages(data: EbookData): EbookExactInteriorPage[] {
  const totalTargetPages = Math.max(4, data.targetPageCount || 10);
  const targetInteriorPages = Math.max(1, totalTargetPages - 3);
  
  const rawChapters = (data.chapters && data.chapters.length > 0)
    ? data.chapters 
    : (INITIAL_EBOOK_DATA.chapters || []);

  const totalChapters = rawChapters.length;
  
  // Calculate how many pages each chapter should get
  const basePagesPerChap = Math.floor(targetInteriorPages / totalChapters);
  const remainder = targetInteriorPages % totalChapters;
  
  const pagesPerChapList = rawChapters.map((_, idx) => {
    return basePagesPerChap + (idx < remainder ? 1 : 0);
  });

  // Handle case where targetInteriorPages < totalChapters
  const activeChapters = (basePagesPerChap === 0)
    ? rawChapters.slice(0, targetInteriorPages)
    : rawChapters;

  const resultPages: EbookExactInteriorPage[] = [];
  let currentPageIndex = 4; // Starts right after Front (P1), Copyright (P2), TOC (P3)

  activeChapters.forEach((chap, chapIdx) => {
    const allocatedPagesCount = (basePagesPerChap === 0) ? 1 : (pagesPerChapList[chapIdx] || 1);
    
    // Split chapter content into paragraphs
    const allParagraphs = (chap.content || '')
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const paragraphsPerSection = Math.max(1, Math.ceil(allParagraphs.length / allocatedPagesCount));

    for (let pIdx = 0; pIdx < allocatedPagesCount; pIdx++) {
      const isStart = pIdx === 0;
      const isEnd = pIdx === allocatedPagesCount - 1;
      
      const sliceStart = pIdx * paragraphsPerSection;
      let pageParagraphs = allParagraphs.slice(sliceStart, sliceStart + paragraphsPerSection);

      // If slice is empty (e.g. short chapter content), generate contextual extension paragraphs
      if (pageParagraphs.length === 0) {
        pageParagraphs = [
          `## ${chap.chapterNumber || (chapIdx + 1)}.${pIdx + 1} Approfondissement & Analyse Stratégique`,
          `L'application méthodique des enseignements de **${chap.title}** requiert une rigueur constante et des points de contrôle réguliers. Dans cette section, nous explorons les mécanismes d'optimisation et les meilleures pratiques observées auprès des praticiens chevronnés.`,
          `> *« L'excellence n'est pas un acte ponctuel, mais une habitude quotidienne forgée par la méthode et la persévérance. »*`,
          `Pour garantir l'atteinte de vos objectifs, veillez à valider chaque étape avant de passer à l'échelle.`
        ];
      }

      resultPages.push({
        pageNumber: currentPageIndex,
        totalPages: totalTargetPages,
        chapterNumber: chap.chapterNumber || (chapIdx + 1),
        chapterTitle: chap.title,
        chapterSubtitle: chap.subtitle,
        pageHeaderTitle: allocatedPagesCount > 1 ? `${chap.title} (Partie ${pIdx + 1}/${allocatedPagesCount})` : chap.title,
        subheading: isStart ? undefined : `Section ${chap.chapterNumber || (chapIdx + 1)}.${pIdx + 1} — Analyse Approfondie & Mise en Œuvre`,
        readingTimeMinutes: chap.readingTimeMinutes,
        paragraphs: pageParagraphs,
        keyTakeaways: isEnd ? chap.keyTakeaways : undefined,
        isChapterStart: isStart,
        isChapterEnd: isEnd
      });

      currentPageIndex++;
      if (resultPages.length >= targetInteriorPages) break;
    }
  });

  // Guarantee exact count if any minor rounding discrepancy
  while (resultPages.length < targetInteriorPages) {
    const extraNum = resultPages.length + 1;
    resultPages.push({
      pageNumber: currentPageIndex,
      totalPages: totalTargetPages,
      chapterNumber: rawChapters.length,
      chapterTitle: `Synthèse Globale & Plan d'Action Final`,
      chapterSubtitle: `Feuille de route pour l'application des concepts du livre`,
      pageHeaderTitle: `Synthèse & Feuille de Route Opérationnelle`,
      subheading: `Section de Clôture — Vos 10 Prochaines Actions Prioritaires`,
      readingTimeMinutes: 5,
      paragraphs: [
        `## Synthèse & Engagement d'Exécution`,
        `Félicitations pour avoir parcouru l'ensemble des enseignements de cet ouvrage. La théorie n'a de portée que si elle se transforme en actions tangibles dans votre réalité quotidienne.`,
        `1. **Définir vos 3 priorités absolues** dès aujourd'hui.`,
        `2. **Planifier un point d'étape hebdomadaire** pour mesurer vos progrès.`,
        `3. **Partager vos apprentissages** et créer une émulation positive autour de votre projet.`,
        `> *« Le secret pour avancer, c'est de commencer. »*`
      ],
      keyTakeaways: ["Plan d'action structuré en place", "Mesure continue des résultats", "Engagement personnel vers l'excellence"],
      isChapterStart: false,
      isChapterEnd: true
    });
    currentPageIndex++;
  }

  return resultPages.slice(0, targetInteriorPages);
}

export const INITIAL_EBOOK_DATA: EbookData = {
  id: 'ebook-sample-1',
  title: "L'Art de l'Investissement Digital en Afrique",
  subtitle: "Guide Pratique pour Bâtir sa Liberté Financière à l'Ère du Numérique",
  author: "Dr. Cheikh Tidiane Ndiaye",
  language: "Français",
  genre: "Business & Entrepreneuriat",
  targetAudience: "Entrepreneurs, Cadres & Investisseurs en Afrique et Diaspora",
  tone: "Pédagogique, Inspirant & Orienté Action",
  summaryOrPrompt: "Guide pratique complet sur l'investissement dans les fintechs, e-commerce, cryptos régulées et immobilier digital en Afrique de l'Ouest et Centrale.",
  chapterCount: 5,
  targetPageCount: 10,
  pageFormat: '6x9',
  fontFamily: 'serif',
  fontSize: 'normal',
  
  frontCover: {
    selectedIndex: 0,
    proposals: SAMPLE_FRONT_COVERS,
    customPrompt: '',
    customImageUrl: '',
    mode: 'proposal'
  },

  backCover: {
    selectedIndex: 0,
    proposals: SAMPLE_BACK_COVERS,
    customPrompt: '',
    customImageUrl: '',
    mode: 'proposal'
  },

  tableOfContents: [
    {
      id: 'toc-1',
      chapterNumber: 1,
      title: "La Révolution Numérique : Comprendre le Nouvel Écosystème Financier Africain",
      summary: "Panorama des opportunités fintechs, mobile money et décentralisation en Afrique."
    },
    {
      id: 'toc-2',
      chapterNumber: 2,
      title: "Les 5 Véhicules d'Investissement Digital les Plus Rentables",
      summary: "Analyse comparée des rendements, risques et liquidités des actifs modernes."
    },
    {
      id: 'toc-3',
      chapterNumber: 3,
      title: "Stratégies d'Allocation d'Actifs & Gestion du Risque de Change",
      summary: "Protéger son capital contre l'inflation et diversifier entre FCFA, USD et EUR."
    },
    {
      id: 'toc-4',
      chapterNumber: 4,
      title: "Construire des Flux de Revenus Passifs Automatisés",
      summary: "Mise en place de systèmes de rente digitale et plateformes d'affiliation sécurisées."
    },
    {
      id: 'toc-5',
      chapterNumber: 5,
      title: "Guide Fiscal, Sécurité Juridique & Feuille de Route pour les 5 Prochaines Années",
      summary: "Conformité OHADA, fiscalité des plus-values et plan d'action d'indépendance."
    }
  ],

  chapters: [
    {
      id: 'chap-1',
      chapterNumber: 1,
      title: "La Révolution Numérique : Comprendre le Nouvel Écosystème Financier Africain",
      subtitle: "Pourquoi l'Afrique est à l'avant-garde de l'innovation financière mondiale",
      readingTimeMinutes: 8,
      keyTakeaways: [
        "L'Afrique a sauté l'étape bancaire traditionnelle pour passer directement au mobile money de masse.",
        "Plus de 60% des transactions de mobile money dans le monde transitent par l'Afrique subsaharienne.",
        "La maîtrise des outils digitaux est désormais le principal facteur multiplicateur de patrimoine."
      ],
      content: `## 1.1 Un Bond Technologique Sans Précédent

Le continent africain ne se contente plus de suivre les révolutions technologiques mondiales : il en est devenu l'un des pionniers les plus dynamiques. En l'espace d'une décennie, le passage direct de l'argent liquide aux portefeuilles électroniques (Wave, Orange Money, M-Pesa, MTN Mobile Money) a démocratisé les flux financiers pour des centaines de millions d'individus.

Cette transition rapide a créé une formidable opportunité pour l'investisseur avisé. Là où les systèmes bancaires traditionnels imposaient des barrières à l'entrée insurmontables (frais de tenue de compte excessifs, exigences de garanties démesurées), l'écosystème numérique offre un terrain d'action fluide, transparent et interconnecté.

> *« L'Afrique ne rattrape pas le retard du passé ; elle écrit d'emblée les règles financières du XXIe siècle. »*

## 1.2 Les Nouvelles Règles du Jeu Économique

Pour quiconque souhaite investir aujourd'hui à Dakar, Abidjan, Cotonou, Douala ou depuis la diaspora, trois principes fondamentaux redéfinissent la réussite :

1. **La Vitesse de Transaction** : Les capitaux se déplacent instantanément par QR code et API bancaires ouvertes.
2. **La Désintermédiation** : Les plateformes de crowdfunding, de crowdlending et de tokenisation permettent d'investir directement dans l'économie réelle sans intermédiaires coûteux.
3. **L'Accès International** : Un résident ouest-africain peut aujourd'hui allouer une fraction de son épargne sur les marchés boursiers mondiaux en quelques clics sécurisés.

## 1.3 Synthèse & Préparation Opérationnelle

Avant d'aborder les véhicules d'investissement détaillés dans le chapitre suivant, il est impératif d'auditer vos finances personnelles : établissez un bilan précis de vos actifs, constituez une réserve de précaution équivalant à 3 à 6 mois de dépenses courantes sur un compte sécurisé, et définissez votre horizon de placement.`
    },
    {
      id: 'chap-2',
      chapterNumber: 2,
      title: "Les 5 Véhicules d'Investissement Digital les Plus Rentables",
      subtitle: "De l'immobilier fractionné au e-commerce automatisé",
      readingTimeMinutes: 10,
      keyTakeaways: [
        "L'immobilier tokenisé et les SCPI digitales permettent d'investir dès 50 000 FCFA.",
        "Le crowdlending agricole et logistique offre des rendements annuels souvent supérieurs à 12-15%.",
        "La diversification multi-plateformes est la clé absolue pour neutraliser le risque de plateforme."
      ],
      content: `## 2.1 L'Immobilier Digital & Tokenisé

Traditionnellement, investir dans la pierre en Afrique exigeait des millions de FCFA de mise de départ et impliquait de longues démarches foncières. Grâce aux technologies de tokenisation et aux plateformes de co-investissement immobilier, il est désormais possible d'acquérir des parts de projets locatifs de standing (résidences meublées à Dakar-Plateau, villas à Bingerville ou appartements touristiques à Saly) avec des tickets d'entrée très accessibles.

Les revenus locatifs sont reversés trimestriellement directement sur votre portefeuille digital, avec une liquidité accrue lors de la revente des parts sur des marchés secondaires.

> *« Ne possédez pas un seul immeuble avec 100% de tracas ; possédez des parts de 20 immeubles avec 0% de gestion opérationnelle. »*

## 2.2 Le Prêt Participatif (Crowdlending) aux PME Africaines

Les petites et moyennes entreprises constituent 90% du tissu économique en zone OHADA. Pourtant, elles font face à un déficit de financement criant. Les plateformes de crowdlending agréées permettent de prêter directement à des coopératives agricoles (cacao, anacarde, maraîchage bio) ou à des transporteurs logistiques contre des intérêts contractuels attractifs (12% à 18% par an).

## 2.3 Le E-commerce Transfrontalier & Dépôt-Vente en Ligne

Le commerce électronique africain s'appuie désormais sur des réseaux de distribution locaux hyper-réactifs. En finançant des stocks à forte rotation vendus via les réseaux sociaux et livrés le jour même, l'investisseur digital participe à des marges commerciales robustes sans gérer la logistique physique.`
    },
    {
      id: 'chap-3',
      chapterNumber: 3,
      title: "Stratégies d'Allocation d'Actifs & Gestion du Risque de Change",
      subtitle: "Protéger son pouvoir d'achat contre les fluctuations monétaires",
      readingTimeMinutes: 9,
      keyTakeaways: [
        "Maintenir un ratio équilibré 60% actifs productifs locaux / 40% devises fortes.",
        "Utiliser les stablecoins régulés adossés au dollar pour hedger son épargne liquide.",
        "Réinvestir systématiquement 70% des bénéfices générés (magie des intérêts composés)."
      ],
      content: `## 3.1 La Règle des Trois Portefeuilles

Une gestion de patrimoine résiliente repose sur une compartimentation stricte de votre capital :

- **Le Portefeuille Sérénité (30%)** : Dépôts à terme, obligations d'État du Trésor Public (Bons du Trésor UEMOA) et livrets garantis.
- **Le Portefeuille Croissance (50%)** : Immobilier locatif, crowdlending PME, actions de sociétés à dividendes cotées à la BRVM (Bourse Régionale des Valeurs Mobilières).
- **Le Portefeuille Opportunité & Tech (20%)** : Startups technologiques, actifs numériques et e-business.`
    },
    {
      id: 'chap-4',
      chapterNumber: 4,
      title: "Construire des Flux de Revenus Passifs Automatisés",
      subtitle: "Faire travailler la technologie à votre place 24h/24",
      readingTimeMinutes: 11,
      keyTakeaways: [
        "Un revenu passif nécessite un travail initial intense de mise en place avant de devenir autonome.",
        "Automatiser les prélèvements et versements dès la réception de vos revenus principaux.",
        "Documenter et déléguer chaque étape de vos projets digitaux."
      ],
      content: `## 4.1 Qu'est-ce qu'un Véritable Revenu Passif ?

La notion de revenu passif a souvent été galvaudée par des discours marketing simplistes. Un véritable revenu passif n'est pas un système magique sans effort : c'est un actif numérique ou financier solidement conçu qui génère de la valeur récurrente même lorsque vous dormez.

> *« Si vous ne trouvez pas un moyen de gagner de l'argent pendant que vous dormez, vous travaillerez jusqu'à la fin de vos jours. » — Warren Buffett*`
    },
    {
      id: 'chap-5',
      chapterNumber: 5,
      title: "Guide Fiscal, Sécurité Juridique & Feuille de Route pour les 5 Prochaines Années",
      subtitle: "Sécuriser vos avoirs et planifier votre liberté financière",
      readingTimeMinutes: 12,
      keyTakeaways: [
        "Déclarer ses revenus en conformité avec le code général des impôts de son pays de résidence.",
        "Sécuriser ses accès numériques (authentification à deux facteurs matérielle, gestionnaires de mots de passe).",
        "Mettre en place un plan de transmission patrimoniale clair pour ses proches."
      ],
      content: `## 5.1 Cadre Juridique et Fiscal en Zone OHADA

La rentabilité brute ne signifie rien si elle n'est pas assortie d'une sécurité juridique irréprochable. Privilégiez toujours les plateformes régulées par les autorités de tutelle (CREPMF pour la bourse régionale, BCEAO / BEAC pour les services de paiement électronique).

## 5.2 Votre Plan d'Action en 90 Jours

1. **Jours 1 à 30** : Assainissement financier, désendettement à taux élevé et constitution de la réserve de sécurité.
2. **Jours 31 à 60** : Ouverture des comptes d'investissement certifiés et premiers placements tests.
3. **Jours 61 à 90** : Mise en place de l'automatisation mensuelle et suivi sur tableau de bord patrimonial.`
    }
  ],

  currentStep: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const SAMPLE_EBOOK_DATA = INITIAL_EBOOK_DATA;

