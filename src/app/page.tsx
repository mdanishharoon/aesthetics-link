import Preloader from '@/components/Preloader';
import MotionProvider from '@/components/MotionProvider';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FeaturedProducts from '@/components/FeaturedProducts';
import Brands from '@/components/Brands';
import ShopByConcern from '@/components/ShopByConcern';
import Explore from '@/components/Explore';
import Ethos from '@/components/Ethos';
import Journal from '@/components/Journal';
import Connect from '@/components/Connect';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="index">
      <MotionProvider />
      <Preloader />
      <Header />
      <main id="main">
        <Hero />
        <FeaturedProducts />
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
        <Explore />
        <Ethos />
        <Journal />
        <Connect />
      </main>
      <Footer />
    </div>
  );
}
