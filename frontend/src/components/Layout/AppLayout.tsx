import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

const HIDE_NAV_PATHS = ['/game/'];

export const AppLayout = () => {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className="app-layout">
      <main className={`app-main${hideNav ? '' : ' with-nav'}`}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};
