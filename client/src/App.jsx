import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CreateVideoPage from './pages/CreateVideoPage';
import VideoEditorPage from './pages/VideoEditorPage';
import VideoLibraryPage from './pages/VideoLibraryPage';
import ExportSocialPage from './pages/ExportSocialPage';
import SocialAccountsPage from './pages/SocialAccountsPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import PricingPage from './pages/PricingPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Landing Page */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
            </Route>

            {/* Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected SaaS App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/create" element={<CreateVideoPage />} />
              <Route path="/library" element={<VideoLibraryPage />} />
              <Route path="/editor/:id" element={<VideoEditorPage />} />
              <Route path="/export/:id" element={<ExportSocialPage />} />
              <Route path="/social" element={<SocialAccountsPage />} />
              <Route path="/settings" element={<ProfileSettingsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
