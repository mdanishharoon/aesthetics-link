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

export default async function Home() {
  const catalog = await getCatalogProducts();
  const inStock = catalog.filter((product) => product.inStock !== false);
  const source = inStock.length > 0 ? inStock : catalog;

  const featuredProducts = source.slice(0, 6).map(toFeaturedCard);
  const bestsellers = source.slice(0, 6).map((p) => toExploreCard(p, 'pure'));
  const newArrivals = source.slice(0, 6).map((p) => toExploreCard(p, 'varnaya'));

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
