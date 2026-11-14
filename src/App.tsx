import Experiences from './components/Experiences';
import Hero from './components/Hero';
import InfoSections from './components/InfoSections';
import Nav from './components/Nav';
import PlayerSection from './components/PlayerSection';
import SiteFooter from './components/SiteFooter';
import Starfield from './components/Starfield';

export default function App() {
  return (
    <>
      <Starfield />
      <Nav />
      <main>
        <Hero />
        <Experiences />
        <PlayerSection />
        <InfoSections />
      </main>
      <SiteFooter />
    </>
  );
}
