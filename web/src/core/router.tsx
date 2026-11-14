import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from './shell/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Mode pages are lazy so the landing page doesn't download three.js.
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const StreetViewPage = lazy(() => import('@/pages/StreetViewPage'));
const GamePage = lazy(() => import('@/pages/GamePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: 'explore', element: <ExplorePage /> },
        { path: 'streetview/:siteId?', element: <StreetViewPage /> },
        { path: 'game', element: <GamePage /> },
        { path: 'about', element: <AboutPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
