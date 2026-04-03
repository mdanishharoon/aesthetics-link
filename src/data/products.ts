export type ProductBenefit = {
  icon: string;
  title: string;
  desc: string;
};

export type KeyIngredient = {
  name: string;
  desc: string;
};

export type Product = {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  tagline: string;
  description: string;
  price: string;
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
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
