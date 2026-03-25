import Preloader from '@/components/Preloader';
import MotionProvider from '@/components/MotionProvider';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Ingredients from '@/components/Ingredients';
import Explore from '@/components/Explore';
import Ethos from '@/components/Ethos';
import QualityOffers from '@/components/QualityOffers';
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
        <Ingredients />
        <div className="container d-none d-md-block">
          <div className="border" />
        </div>
        <Explore />
        <Ethos />
        <QualityOffers />
        <Journal />
        <Connect />
      </main>
      <Footer />
    </div>
  );
}
