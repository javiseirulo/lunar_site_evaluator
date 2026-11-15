import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { AppShell } from './shell/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Mode pages are lazy so the landing page doesn't download three.js.
// The intro is its own chunk (fonts, canvas Moon) so it never weighs down the app pages.
const IntroPage = lazy(() => import('@/intro/IntroPage'));
const ExplorePage = lazy(() => import('@/pages/ExplorePage'));
const StreetViewPage = lazy(() => import('@/pages/StreetViewPage'));
const GamePage = lazy(() => import('@/pages/GamePage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const SitesPage = lazy(() => import('@/pages/SitesPage'));
const ComparePage = lazy(() => import('@/pages/ComparePage'));
const LearnPage = lazy(() => import('@/pages/LearnPage'));

export const router = createBrowserRouter(
  [
    {
      // Front door: full-bleed, outside the app shell.
      path: '/',
      element: (
        <Suspense fallback={<div className="min-h-screen bg-[#05060d]" />}>
          <IntroPage />
        </Suspense>
      ),
    },
    {
      element: <AppShell />,
      children: [
        { path: 'home', element: <LandingPage /> },
        { path: 'explore', element: <ExplorePage /> },
        { path: 'streetview/:siteId?', element: <StreetViewPage /> },
        { path: 'game', element: <GamePage /> },
        { path: 'sites', element: <SitesPage /> },
        { path: 'compare', element: <ComparePage /> },
        { path: 'learn', element: <LearnPage /> },
        { path: 'about', element: <AboutPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
