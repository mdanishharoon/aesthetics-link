export type ProductBenefit = {
  icon: string;
  title: string;
  desc: string;
};

export type KeyIngredient = {
  name: string;
  desc: string;
};

export type ProductReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  verified: boolean;
};

export type ReviewSummary = {
  average: number;
  count: number;
  distribution: [number, number, number, number, number]; // 5→1
};

export type Product = {
  wooId?: number;
  slug: string;
  name: string;
  shortName: string;
  category: string;
  tagline: string;
  description: string;
  price: string;
  retailPrice?: string;
  regularPrice?: string | null;
  priceSource?: "retail" | "wholesale";
  hasDiscount?: boolean;
  claim: {
    headline: string;
    headlineSerif: string;
    sub: string;
  };
  benefits: ProductBenefit[];
  keyIngredients: KeyIngredient[];
  howToUse: string[];
  images: {
    hero: string;
    heroAlt: string;
    detail: string;
    detailAlt: string;
    texture: string;
  };
  accentBg: string;
  reviewSummary?: ReviewSummary;
  reviews?: ProductReview[];
};

export const products: Product[] = [
  {
    slug: "glutanex-uv-glow-balm",
    name: "AestheticsLink UV Glow Balm",
    shortName: "UV Glow Balm",
    category: "UV Protection",
    tagline: "Radiance-boosting protection with every wear.",
    description:
      "A lightweight, luminous balm that shields skin from UV damage while delivering an instant healthy glow. Formulated with Glutathione and broad-spectrum SPF actives for protection that never compromises radiance.",
    price: "£52",
    claim: {
      headline: "SHIELD.",
      headlineSerif: "Glow",
      sub: "Without compromise.",
    },
    benefits: [
      {
        icon: "/images/icon-highest-standards.svg",
        title: "Broad Spectrum SPF",
        desc: "Full-spectrum UV protection that guards against both UVA and UVB rays without leaving a white cast or greasy finish.",
      },
      {
        icon: "/images/icon-radical-transparency.svg",
        title: "Instant Luminosity",
        desc: "Micro-pearlescent actives deliver an immediate lit-from-within glow, perfecting skin tone on contact.",
      },
      {
        icon: "/images/icon-potent-multi-tasking.svg",
        title: "Glutathione Complex",
        desc: "Clinically studied Glutathione brightens over time, targeting discolouration and supporting an even complexion.",
      },
      {
        icon: "/images/icon-conscious-responsible.svg",
        title: "Lightweight Finish",
        desc: "Non-comedogenic, feather-light texture that layers seamlessly under makeup or worn alone for a polished look.",
      },
    ],
    keyIngredients: [
      { name: "Glutathione", desc: "Master antioxidant that brightens and evens skin tone" },
      { name: "Zinc Oxide", desc: "Mineral UV filter for broad-spectrum protection" },
      { name: "Niacinamide", desc: "Reduces pores and refines skin texture" },
      { name: "Hyaluronic Acid", desc: "Locks in moisture for a plump, hydrated finish" },
    ],
    howToUse: [
      "Apply a pea-sized amount to cleansed skin as the final step of your AM routine.",
      "Blend outward from the centre of the face using fingertips or a brush.",
      "Reapply every 2 hours when exposed to direct sunlight.",
      "Wear alone or as a luminous base under makeup.",
    ],
    images: {
      hero: "https://picsum.photos/seed/uvglowbalm-h/900/1100",
      heroAlt: "AestheticsLink UV Glow Balm",
      detail: "https://picsum.photos/seed/uvglowbalm-d/800/1000",
      detailAlt: "UV Glow Balm texture",
      texture: "https://picsum.photos/seed/uvglowbalm-t/1400/900",
    },
    accentBg: "#F1CCCF",
    reviewSummary: { average: 4.7, count: 89, distribution: [58, 21, 7, 2, 1] },
    reviews: [
      { id: "uvg-1", author: "Priya M.", rating: 5, date: "12 Mar 2025", title: "Best SPF I've ever used", body: "I've tried dozens of SPFs and they always leave me either greasy or with a white cast. This one is completely different — it genuinely glows on the skin and my skin tone looks more even by the end of the day. Repurchasing for the third time.", verified: true },
      { id: "uvg-2", author: "Sarah K.", rating: 5, date: "28 Feb 2025", title: "My morning routine staple", body: "I use this as the last step every morning and I've had so many compliments on my skin since starting. The glow isn't shimmery or glittery — just looks like really healthy skin. Light enough to wear under foundation too.", verified: true },
      { id: "uvg-3", author: "Amara D.", rating: 4, date: "14 Jan 2025", title: "Great product, slightly pricey", body: "The formula is genuinely luxurious and I can feel the difference in my skin's texture and brightness. Docking one star only because I go through it faster than I'd like — I wish the tube was bigger for the price.", verified: true },
      { id: "uvg-4", author: "Rachel T.", rating: 5, date: "3 Jan 2025", title: "Sorted my uneven skin tone", body: "I have mild hyperpigmentation from old acne scars and I was sceptical this would do anything beyond SPF. Within about 3 weeks of daily use the marks look noticeably lighter. The glow effect is a bonus.", verified: false },
    ],
  },
  {
    slug: "glutanex-spot-cream",
    name: "AestheticsLink Spot Cream",
    shortName: "Spot Cream",
    category: "Targeted Treatment",
    tagline: "Precision correction for persistent spots.",
    description:
      "A concentrated spot treatment that targets hyperpigmentation, post-acne marks and discolouration with a high-potency blend of Glutathione, Alpha Arbutin and Tranexamic Acid.",
    price: "£45",
    claim: {
      headline: "TARGET.",
      headlineSerif: "Correct",
      sub: "With clinical precision.",
    },
    benefits: [
      {
        icon: "/images/icon-highest-standards.svg",
        title: "High-Potency Actives",
        desc: "A concentrated dose of Glutathione and Alpha Arbutin work in tandem to visibly reduce spot intensity within weeks.",
      },
      {
        icon: "/images/icon-radical-transparency.svg",
        title: "Targeted Delivery",
        desc: "Micro-encapsulated actives penetrate directly into the spot site for pinpoint correction without spreading.",
      },
      {
        icon: "/images/icon-potent-multi-tasking.svg",
        title: "Anti-Recurrence Formula",
        desc: "Tranexamic Acid inhibits melanin signalling pathways, reducing the likelihood of spot reformation.",
      },
      {
        icon: "/images/icon-conscious-responsible.svg",
        title: "Barrier-Safe",
        desc: "pH-optimised and fragrance-free. Clinically proven safe for daily use on all skin types including sensitive.",
      },
    ],
    keyIngredients: [
      { name: "Glutathione", desc: "Potent brightening agent targeting melanin production" },
      { name: "Alpha Arbutin", desc: "Stable brightener that fades discolouration gradually" },
      { name: "Tranexamic Acid", desc: "Blocks melanin pathways for long-term clarity" },
      { name: "Centella Asiatica", desc: "Soothes and repairs skin barrier post-treatment" },
    ],
    howToUse: [
      "Cleanse and tone skin thoroughly before application.",
      "Using the precision applicator, apply directly onto spots and marks.",
      "Allow to absorb fully before applying moisturiser.",
      "Use AM and PM. Pair with SPF during the day.",
    ],
    images: {
      hero: "https://picsum.photos/seed/spotcream-h/900/1100",
      heroAlt: "AestheticsLink Spot Cream",
      detail: "https://picsum.photos/seed/spotcream-d/800/1000",
      detailAlt: "Spot Cream texture",
      texture: "https://picsum.photos/seed/spotcream-t/1400/900",
    },
    accentBg: "#D8D0C4",
    reviewSummary: { average: 4.8, count: 134, distribution: [97, 28, 6, 2, 1] },
    reviews: [
      { id: "spt-1", author: "Jade L.", rating: 5, date: "18 Mar 2025", title: "Faded my acne marks in weeks", body: "I've had post-acne marks for years that wouldn't shift with anything. Started using this twice a day and by week 4 my skin was noticeably clearer. My esthetician asked what I'd changed. Nothing short of miraculous for a topical product.", verified: true },
      { id: "spt-2", author: "Nadia F.", rating: 5, date: "22 Feb 2025", title: "Precise, effective, no irritation", body: "I have sensitive skin and was terrified to try a concentrated treatment. Not a hint of irritation even from day one. The spots I'd had for over a year have mostly gone now, 6 weeks in.", verified: true },
      { id: "spt-3", author: "Olivia H.", rating: 4, date: "5 Feb 2025", title: "Solid treatment, patience required", body: "It works — I won't dispute that. But you need to commit to using it consistently for at least 3-4 weeks before you'll see results. Once they came though, they stuck around.", verified: true },
      { id: "spt-4", author: "Zara B.", rating: 5, date: "10 Jan 2025", title: "Nothing else has worked like this", body: "I've spent a lot of money on spot treatments over the years. This is the first one where I can actually photograph a before and after and see a real, undeniable difference. Genuinely life-changing for my confidence.", verified: true },
    ],
  },
  {
    slug: "glutanex-snow-white-cream",
    name: "AestheticsLink Radiance Cream",
    shortName: "Radiance Cream",
    category: "Brightening Moisturiser",
    tagline: "All-over luminosity for an even, radiant complexion.",
    description:
      "A rich yet fast-absorbing brightening cream that delivers full-face clarity with sustained hydration. Glutathione, Niacinamide and Vitamin C work synergistically to reveal your most luminous complexion.",
    price: "£48",
    claim: {
      headline: "ILLUMINATE.",
      headlineSerif: "Unify",
      sub: "Your whole complexion.",
    },
    benefits: [
      {
        icon: "/images/icon-highest-standards.svg",
        title: "Triple Brightening System",
        desc: "Glutathione, Vitamin C and Niacinamide combine for a cumulative brightening effect that outperforms single-active formulas.",
      },
      {
        icon: "/images/icon-radical-transparency.svg",
        title: "72-Hour Hydration",
        desc: "A blend of ceramides and Hyaluronic Acid locks moisture in the skin barrier for up to three days of supple, plump skin.",
      },
      {
        icon: "/images/icon-potent-multi-tasking.svg",
        title: "Antioxidant Shield",
        desc: "Vitamin E and ferulic acid defend against free radical damage, preventing future discolouration from environmental stressors.",
      },
      {
        icon: "/images/icon-conscious-responsible.svg",
        title: "Non-Comedogenic",
        desc: "Tested on all skin types. Silicone-free and non-pore-clogging — comfort without compromise.",
      },
    ],
    keyIngredients: [
      { name: "Glutathione", desc: "Full-face brightening and antioxidant protection" },
      { name: "Vitamin C (Stable)", desc: "Boosts radiance and inhibits melanin formation" },
      { name: "Niacinamide", desc: "Evens skin tone and minimises pore appearance" },
      { name: "Ceramide Complex", desc: "Fortifies skin barrier for lasting hydration" },
    ],
    howToUse: [
      "Apply to freshly cleansed and toned skin morning and evening.",
      "Take a generous amount and press gently into the skin from centre outward.",
      "Follow with SPF in the morning.",
      "For enhanced results, use after the AestheticsLink Night Serum in your evening routine.",
    ],
    images: {
      hero: "https://picsum.photos/seed/snowwhite-h/900/1100",
      heroAlt: "AestheticsLink Radiance Cream",
      detail: "https://picsum.photos/seed/snowwhite-d/800/1000",
      detailAlt: "Radiance Cream texture",
      texture: "https://picsum.photos/seed/snowwhite-t/1400/900",
    },
    accentBg: "#F1CCCF",
    reviewSummary: { average: 4.6, count: 76, distribution: [48, 18, 7, 2, 1] },
    reviews: [
      { id: "swc-1", author: "Mia T.", rating: 5, date: "20 Mar 2025", title: "Finally a moisturiser that does it all", body: "I've replaced my serum, moisturiser and primer with this. It genuinely makes my skin look airbrushed — even, bright, plump. My skin tone has evened out significantly after 5 weeks of use. I can't imagine going back.", verified: true },
      { id: "swc-2", author: "Kezia A.", rating: 5, date: "8 Mar 2025", title: "Incredible for dull, tired skin", body: "I work long hours and my skin always looks exhausted. This has completely changed that — within days my skin looked more awake. The cream feels rich but doesn't sit heavily on the skin at all.", verified: true },
      { id: "swc-3", author: "Isabelle R.", rating: 4, date: "14 Feb 2025", title: "Really good but layering is key", body: "Excellent cream. I found it works even better when layered over the Aqua Booster — together they're incredible. On its own it's still a 4-star product, but stacked it's 5+.", verified: false },
      { id: "swc-4", author: "Hannah W.", rating: 4, date: "29 Jan 2025", title: "Genuinely brightening formula", body: "I was sceptical of 'brightening' claims but this one actually delivers. My skin looks more even and healthier overall. Taking off one star only because I find the packaging a little tricky to get the last bits out.", verified: true },
    ],
  },
  {
    slug: "glutanex-retinol-eye-cream",
    name: "AestheticsLink Retinol Eye Cream",
    shortName: "Retinol Eye Cream",
    category: "Eye Treatment",
    tagline: "Precision anti-ageing for the most delicate zone.",
    description:
      "A targeted eye cream that addresses fine lines, dark circles and puffiness with a carefully calibrated concentration of encapsulated Retinol and Glutathione, formulated specifically for the periorbital area.",
    price: "£60",
    claim: {
      headline: "RENEW.",
      headlineSerif: "Brighten",
      sub: "Around the clock.",
    },
    benefits: [
      {
        icon: "/images/icon-highest-standards.svg",
        title: "Encapsulated Retinol",
        desc: "Time-released micro-encapsulated Retinol delivers controlled, sustained cell turnover without the irritation of raw retinoids.",
      },
      {
        icon: "/images/icon-radical-transparency.svg",
        title: "Dark Circle Correction",
        desc: "Glutathione and Vitamin K2 target both pigmented and vascular dark circles for visibly brighter under-eyes.",
      },
      {
        icon: "/images/icon-potent-multi-tasking.svg",
        title: "Depuffing Complex",
        desc: "Caffeine and Eyeseryl peptide reduce fluid retention and puffiness, restoring a well-rested appearance.",
      },
      {
        icon: "/images/icon-conscious-responsible.svg",
        title: "Ophthalmologist Tested",
        desc: "Formulated specifically for the periorbital area. Safe for contact lens wearers and sensitive skin types.",
      },
    ],
    keyIngredients: [
      { name: "Encapsulated Retinol", desc: "Controlled cell turnover without irritation" },
      { name: "Glutathione", desc: "Brightens pigmented dark circles" },
      { name: "Caffeine", desc: "Constricts blood vessels to reduce puffiness" },
      { name: "Eyeseryl Peptide", desc: "Clinically proven to reduce under-eye bags" },
    ],
    howToUse: [
      "Use at night as part of your PM routine after serum.",
      "Take a rice-grain amount onto your ring finger.",
      "Gently tap (never rub) around the orbital bone, moving inward.",
      "Allow to absorb before applying other products. Avoid direct contact with the eye.",
    ],
    images: {
      hero: "https://picsum.photos/seed/retinoleye-h/900/1100",
      heroAlt: "AestheticsLink Retinol Eye Cream",
      detail: "https://picsum.photos/seed/retinoleye-d/800/1000",
      detailAlt: "Retinol Eye Cream texture",
      texture: "https://picsum.photos/seed/retinoleye-t/1400/900",
    },
    accentBg: "#D8D0C4",
    reviewSummary: { average: 4.9, count: 52, distribution: [46, 4, 1, 1, 0] },
    reviews: [
      { id: "rec-1", author: "Camille D.", rating: 5, date: "15 Mar 2025", title: "Made my under-eyes look 10 years younger", body: "I'm 44 and have had deep dark circles my whole life. I've tried everything. This is the first product that has made a visible, lasting difference. My dark circles are significantly lighter after 6 weeks and the fine lines around my eyes have softened noticeably.", verified: true },
      { id: "rec-2", author: "Sophie M.", rating: 5, date: "1 Mar 2025", title: "No irritation — amazing for retinol sceptics", body: "I had a bad experience with retinol years ago and swore off it. The encapsulated formula in this is completely different — zero redness, zero peeling, just results. My eye area is smoother than it's been in years.", verified: true },
      { id: "rec-3", author: "Layla K.", rating: 5, date: "17 Feb 2025", title: "The puffiness reduction is real", body: "I wake up puffy every morning — always have. After 2 weeks of using this nightly the puffiness is noticeably reduced when I wake up. My friends have commented that I look less tired. Completely sold.", verified: true },
      { id: "rec-4", author: "Eleanor G.", rating: 4, date: "3 Feb 2025", title: "Excellent, just needs patience", body: "Results aren't overnight but they're real. By week 3 I started to see a difference in the texture around my eyes and by week 5 the lines were softer. Worth every penny if you're consistent.", verified: true },
    ],
  },
  {
    slug: "glutanex-aqua-booster",
    name: "AestheticsLink Aqua Booster",
    shortName: "Aqua Booster",
    category: "Hydration Serum",
    tagline: "Deep hydration that visibly plumps from within.",
    description:
      "A multi-weight Hyaluronic Acid serum layered with Glutathione and Panthenol to saturate skin with moisture at every depth of the dermis. Instantly plumping, long-term strengthening.",
    price: "£40",
    claim: {
      headline: "PLUMP.",
      headlineSerif: "Saturate",
      sub: "Every layer of skin.",
    },
    benefits: [
      {
        icon: "/images/icon-highest-standards.svg",
        title: "3-Weight Hyaluronic Acid",
        desc: "Low, medium and high molecular weight HA penetrate different skin depths simultaneously for full-spectrum hydration.",
      },
      {
        icon: "/images/icon-radical-transparency.svg",
        title: "Instant & Lasting Plump",
        desc: "Hydration is felt immediately and sustained for up to 48 hours thanks to a moisture-lock humectant complex.",
      },
      {
        icon: "/images/icon-potent-multi-tasking.svg",
        title: "Barrier Fortification",
        desc: "Panthenol and Ceramide NP repair the skin barrier, reducing transepidermal water loss over time.",
      },
      {
        icon: "/images/icon-conscious-responsible.svg",
        title: "Fragrance-Free Formula",
        desc: "Suitable for all skin types — including reactive and rosacea-prone. Zero sensitising agents.",
      },
    ],
    keyIngredients: [
      { name: "3-Weight Hyaluronic Acid", desc: "Multi-depth hydration from surface to dermis" },
      { name: "Glutathione", desc: "Antioxidant protection alongside hydration" },
      { name: "Panthenol (B5)", desc: "Soothes and strengthens the skin barrier" },
      { name: "Ceramide NP", desc: "Locks moisture in and prevents TEWL" },
    ],
    howToUse: [
      "Apply to damp skin immediately after cleansing and toning.",
      "Press 3–4 drops between palms and press gently onto face and neck.",
      "Layer under moisturiser — the serum primes skin to absorb everything that follows.",
      "Use AM and PM for maximum hydration benefit.",
    ],
    images: {
      hero: "https://picsum.photos/seed/aquaboost-h/900/1100",
      heroAlt: "AestheticsLink Aqua Booster",
      detail: "https://picsum.photos/seed/aquaboost-d/800/1000",
      detailAlt: "Aqua Booster serum texture",
      texture: "https://picsum.photos/seed/aquaboost-t/1400/900",
    },
    accentBg: "#F1CCCF",
    reviewSummary: { average: 4.7, count: 61, distribution: [42, 13, 4, 1, 1] },
    reviews: [
      { id: "aqb-1", author: "Tara S.", rating: 5, date: "19 Mar 2025", title: "My skin drinks this up", body: "I live in a dry climate and my skin always felt tight and dehydrated regardless of what I used. Within the first week of using this twice daily my skin completely transformed — plump, bouncy and no tightness at all.", verified: true },
      { id: "aqb-2", author: "Fatima N.", rating: 5, date: "11 Mar 2025", title: "Perfect serum base for any routine", body: "This layers beautifully under everything. I use it before my moisturiser in the morning and the rest of my skincare just absorbs so much better. My skin looks more alive and healthy since I started.", verified: true },
      { id: "aqb-3", author: "Lucy P.", rating: 4, date: "24 Feb 2025", title: "Genuinely plumping formula", body: "I could feel the plumping effect almost immediately — my skin felt fuller and more cushioned. I've stayed consistently hydrated even through a bout of travelling and changes in climate. Solid product.", verified: true },
      { id: "aqb-4", author: "Mara J.", rating: 5, date: "7 Jan 2025", title: "Solved my dehydration lines", body: "I had fine lines across my forehead that were mostly dehydration lines rather than proper wrinkles. After 3 weeks of this, they've basically disappeared. My skin is so much bouncier. The bottle looks small but a little goes a long way.", verified: false },
    ],
  },
  {
    slug: "glutanex-night-serum",
    name: "AestheticsLink Night Serum",
    shortName: "Night Serum",
    category: "Overnight Treatment",
    tagline: "Let science work while you sleep.",
    description:
      "An overnight repair serum that harnesses the skin's peak regenerative cycle to deliver intensive brightening, smoothing and antioxidant repair. Wake up to visibly transformed skin every morning.",
    price: "£55",
    claim: {
      headline: "REPAIR.",
      headlineSerif: "Restore",
      sub: "While you sleep.",
    },
    benefits: [
      {
        icon: "/images/icon-highest-standards.svg",
        title: "Circadian-Synced Formula",
        desc: "Biorhythm-adapted actives activate in alignment with the skin's natural nocturnal repair cycle for maximum efficacy.",
      },
      {
        icon: "/images/icon-radical-transparency.svg",
        title: "Overnight Brightening",
        desc: "Glutathione and Kojic Acid work through the night to interrupt melanin synthesis, delivering visible clarity by morning.",
      },
      {
        icon: "/images/icon-potent-multi-tasking.svg",
        title: "Collagen Support",
        desc: "Peptide complexes and Vitamin C derivative stimulate collagen production, reducing the appearance of fine lines over time.",
      },
      {
        icon: "/images/icon-conscious-responsible.svg",
        title: "Non-Occlusive Repair",
        desc: "Lightweight serum texture that delivers intensive actives without heaviness — never greasy, always restorative.",
      },
    ],
    keyIngredients: [
      { name: "Glutathione", desc: "Peak-hours brightening during skin's repair cycle" },
      { name: "Kojic Acid", desc: "Interrupts melanin synthesis overnight" },
      { name: "Matrixyl Peptide", desc: "Signals fibroblasts to boost collagen production" },
      { name: "Squalane", desc: "Nourishes without occluding — skin breathes and repairs" },
    ],
    howToUse: [
      "Apply as the final step of your PM routine after moisturiser.",
      "Dispense 4–5 drops and press gently into skin.",
      "Focus on areas of concern — uneven tone, fine lines, dullness.",
      "Do not rinse. Allow to work overnight and cleanse as normal in the morning.",
    ],
    images: {
      hero: "https://picsum.photos/seed/nightserum-h/900/1100",
      heroAlt: "AestheticsLink Night Serum",
      detail: "https://picsum.photos/seed/nightserum-d/800/1000",
      detailAlt: "Night Serum texture",
      texture: "https://picsum.photos/seed/nightserum-t/1400/900",
    },
    accentBg: "#D8D0C4",
    reviewSummary: { average: 4.8, count: 108, distribution: [78, 22, 5, 2, 1] },
    reviews: [
      { id: "ns-1", author: "Aisha R.", rating: 5, date: "17 Mar 2025", title: "Wake up to completely different skin", body: "I was tired of spending money on overnight products that did nothing by morning. This is different. I wake up and my skin looks visibly brighter, more even-toned and just healthier. I've been using it for 8 weeks and the results keep improving.", verified: true },
      { id: "ns-2", author: "Chloe B.", rating: 5, date: "2 Mar 2025", title: "The brightening is undeniable", body: "I have melasma that I've been managing for years. This is now a permanent fixture in my PM routine — my skin tone is more even than it's been in a decade. The texture improvement is a wonderful bonus.", verified: true },
      { id: "ns-3", author: "Nina V.", rating: 4, date: "19 Feb 2025", title: "Noticeable results after consistent use", body: "I was on the fence after the first two weeks — results were subtle. But by week 4-5 there was a real shift in brightness and texture. The fine lines around my mouth have softened too, which I wasn't expecting.", verified: true },
      { id: "ns-4", author: "Yasmin H.", rating: 5, date: "12 Jan 2025", title: "Worth every penny", body: "I've tried a lot of serums in this price range. This is the first where I can honestly say it earns its price. The Kojic Acid and Glutathione combination is exceptional. My skin looks like I've had a professional treatment every single morning.", verified: true },
    ],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
