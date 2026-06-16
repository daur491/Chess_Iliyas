import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/', label: 'Главная', icon: '⌂' },
  { to: '/play', label: 'Играть', icon: '♟' },
  { to: '/train', label: 'Учёба', icon: '✎' },
  { to: '/rating', label: 'Рейтинг', icon: '⊕' },
  { to: '/profile', label: 'Профиль', icon: '◉' },
];

export const BottomNav = () => (
  <nav className="bottom-nav">
    {NAV_ITEMS.map(({ to, label, icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) => `bottom-nav__item${isActive ? ' active' : ''}`}
      >
        <span className="bottom-nav__icon">{icon}</span>
        <span className="bottom-nav__label">{label}</span>
      </NavLink>
    ))}
  </nav>
);
