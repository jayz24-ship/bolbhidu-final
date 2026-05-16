import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PostProvider } from './contexts/PostContext';
import { AdminProvider } from './contexts/AdminContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import PostDetails from './pages/PostDetails';
import Profile from './pages/Profile';
import MyIssues from './pages/MyIssues';
import MyReports from './pages/MyReports';
import Trending from './pages/Trending';
import Admin from './pages/Admin';
import { Toaster } from './components/ui/sonner';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-primary text-primary-foreground rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold">BB</span>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects to feed if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="bg-primary text-primary-foreground rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold">BB</span>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app/feed" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return <Navigate to="/app/feed" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/feed" replace />} />
          <Route path="feed" element={<Feed />} />
          <Route path="post/:postId" element={<PostDetails />} />
          <Route path="profile" element={<Profile />} />
          <Route path="my-issues" element={<MyIssues />} />
          <Route path="my-reports" element={<MyReports />} />
          <Route path="trending" element={<Trending />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PostProvider>
          <AdminProvider>
            <div className="min-h-screen bg-background font-['Inter',_sans-serif]">
              <AppRoutes />
              <Toaster 
                position="top-right"
                richColors
                expand={false}
                duration={4000}
              />
            </div>
          </AdminProvider>
        </PostProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;