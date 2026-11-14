import ElementPage from './components/ElementPage';
import HomePage from './components/HomePage';
import Nav from './components/Nav';
import SiteFooter from './components/SiteFooter';
import Starfield from './components/Starfield';
import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
  const { route, fading } = useHashRoute();
  return (
    <>
      <Starfield />
      <Nav />
      <main className={`ts-fade ${fading ? 'opacity-0' : 'opacity-100'}`}>
        {route.name === 'home' ? (
          <HomePage />
        ) : (
          <ElementPage
            slug={route.slug}
            track={route.name === 'player' ? route.track : null}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
