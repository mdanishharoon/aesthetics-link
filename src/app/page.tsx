import Preloader from '@/components/Preloader';
import MotionProvider from '@/components/MotionProvider';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FeaturedProducts from '@/components/FeaturedProducts';
import type { LandingFeaturedProduct } from '@/components/FeaturedProducts';
import Brands from '@/components/Brands';
import ShopByConcern from '@/components/ShopByConcern';
import Explore from '@/components/Explore';
import type { LandingExploreProduct } from '@/components/Explore';
import Ethos from '@/components/Ethos';
import Journal from '@/components/Journal';
import Connect from '@/components/Connect';
import Footer from '@/components/Footer';
import { getCatalogProducts } from '@/lib/storefront/server';
import type { StorefrontCatalogProduct } from '@/lib/storefront/types';

function toFeaturedCard(product: StorefrontCatalogProduct): LandingFeaturedProduct {
  return {
    href: `/products/${product.slug}`,
    category: product.category || 'Bestseller',
    title: product.shortName || product.name,
    price: product.price,
    imageSrc: product.image,
    imageHoverSrc: product.image,
    bg: product.accentBg || '#F1CCCF',
  };
}

function toExploreCard(
  product: StorefrontCatalogProduct,
  variant: 'pure' | 'varnaya',
): LandingExploreProduct {
  return {
    href: `/products/${product.slug}`,
    category: product.category || 'Featured',
    title: product.shortName || product.name,
    price: product.price,
    imageSrc: product.image,
    imageHoverSrc: product.image,
    variant,
  };
}

function repeatProducts(
  source: StorefrontCatalogProduct[],
  count: number,
): StorefrontCatalogProduct[] {
  if (source.length === 0 || count <= 0) {
    return [];
  }

  const out: StorefrontCatalogProduct[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(source[i % source.length]);
  }
  return out;
}

function normalizeBrandToken(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function productHasBrand(
  product: StorefrontCatalogProduct,
  brands: Set<string>,
): boolean {
  const tokens = new Set<string>();
  const primarySlug = normalizeBrandToken(product.brandSlug);
  const primaryName = normalizeBrandToken(product.brand);

  if (primarySlug) {
    tokens.add(primarySlug);
  }

  if (primaryName) {
    tokens.add(primaryName);
  }

  for (const slug of product.brandSlugs ?? []) {
    const token = normalizeBrandToken(slug);
    if (token) {
      tokens.add(token);
    }
  }

  for (const token of tokens) {
    if (brands.has(token)) {
      return true;
    }
  }

  return false;
}

function filterProductsByBrands(
  products: StorefrontCatalogProduct[],
  brands: string[],
): StorefrontCatalogProduct[] {
  const normalizedBrands = new Set(brands.map((brand) => normalizeBrandToken(brand)).filter(Boolean));
  if (normalizedBrands.size === 0) {
    return [];
  }

  return products.filter((product) => productHasBrand(product, normalizedBrands));
}

function selectProductsWithFallback(
  primary: StorefrontCatalogProduct[],
  fallback: StorefrontCatalogProduct[],
  count: number,
): StorefrontCatalogProduct[] {
  if (count <= 0) {
    return [];
  }

  const selected: StorefrontCatalogProduct[] = [];
  const seen = new Set<string>();

  for (const product of primary) {
    if (seen.has(product.slug)) {
      continue;
    }
    seen.add(product.slug);
    selected.push(product);
    if (selected.length === count) {
      return selected;
    }
  }

  for (const product of fallback) {
    if (seen.has(product.slug)) {
      continue;
    }
    seen.add(product.slug);
    selected.push(product);
    if (selected.length === count) {
      return selected;
    }
  }

  return selected.length < count ? repeatProducts(selected, count) : selected.slice(0, count);
}

export default async function Home() {
  const [catalog, glutanexCatalog] = await Promise.all([
    getCatalogProducts(),
    getCatalogProducts({ brand: 'glutanex' }),
  ]);
  const inStock = catalog.filter((product) => product.inStock !== false);
  const source = inStock.length > 0 ? inStock : catalog;
  const glutanexInStock = glutanexCatalog.filter((product) => product.inStock !== false);
  const glutanexSource = glutanexInStock.length > 0 ? glutanexInStock : glutanexCatalog;
  const featuredSource = selectProductsWithFallback(source, source, 6);

  const bestsellersSource = repeatProducts(glutanexSource, 6);

  const bestSellerSlugs = new Set(bestsellersSource.map((product) => product.slug));
  const dermapenAndGlutanex = filterProductsByBrands(source, ['dermapen', 'glutanex']);
  const secondaryBrandPool = dermapenAndGlutanex.filter((product) => !bestSellerSlugs.has(product.slug));
  const secondaryFallbackPool = source.filter((product) => !bestSellerSlugs.has(product.slug));
  const newArrivalsSource = selectProductsWithFallback(
    secondaryBrandPool.length > 0 ? secondaryBrandPool : dermapenAndGlutanex,
    secondaryFallbackPool.length > 0 ? secondaryFallbackPool : source,
    6,
  );

  const featuredProducts = featuredSource.map(toFeaturedCard);
  const bestsellers = bestsellersSource.map((p) => toExploreCard(p, 'pure'));
  const newArrivals = newArrivalsSource.map((p) => toExploreCard(p, 'varnaya'));

  return (
    <div className="index">
      <MotionProvider />
      <Preloader />
      <Header />
      <main id="main">
        <Hero />
        <FeaturedProducts products={featuredProducts} />
        <div className="container d-none d-md-block">
          <div className="border" />
        </div>
        <Brands />
        <div className="container d-none d-md-block">
          <div className="border" />
        </div>
        <ShopByConcern />
        <div className="container d-none d-md-block">
          <div className="border" />
        </div>
        <Explore bestsellers={bestsellers} newArrivals={newArrivals} />
        <Ethos />
        <Journal />
        <Connect />
      </main>
      <Footer />
    </div>
  );
}
