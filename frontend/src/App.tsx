import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/Layout/AppLayout';
import { HomePage } from './pages/Home/HomePage';
import { PlayPage } from './pages/Play/PlayPage';
import { GamePage } from './pages/Game/GamePage';
import { TrainPage } from './pages/Train/TrainPage';
import { PuzzlePage } from './pages/Train/PuzzlePage';
import { RatingPage } from './pages/Rating/RatingPage';
import { TournamentsPage } from './pages/Tournaments/TournamentsPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { useTelegramAuth } from './hooks/useTelegramAuth';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function AppRoutes() {
  const { loading, error } = useTelegramAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-spinner" />
      </div>
    );
  }

  if (error && !import.meta.env.DEV) {
    return (
      <div className="app-error">
        <p>Ошибка авторизации</p>
        <p className="app-error-msg">{error}</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="game/:id" element={<GamePage />} />
        <Route path="train" element={<TrainPage />} />
        <Route path="train/puzzle/:id" element={<PuzzlePage />} />
        <Route path="rating" element={<RatingPage />} />
        <Route path="tournaments" element={<TournamentsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
