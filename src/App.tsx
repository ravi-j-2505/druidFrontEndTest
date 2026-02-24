import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/MainLayout";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import DocumentDetail from "@/pages/DocumentDetail";
import DocumentUpload from "@/pages/DocumentUpload";
import NotFound from "@/pages/NotFound";
import Labeling from "@/pages/Labeling";
import StandardsAnalysis from "@/pages/StandardsAnalysis";
import AudioDetail from "@/pages/AudioDetail";
import VideoDetail from "./pages/VideoDetail";
import ImageDetail from "./pages/ImageDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Documents />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/documents/upload"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DocumentUpload />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/documents/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DocumentDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/audios/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AudioDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/image/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ImageDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/videos/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <VideoDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Other Protected Routes */}
            <Route
              path="/metadata"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <div className="container mx-auto p-6 max-w-6xl">
                      <h1 className="text-3xl font-bold">Metadata Analysis</h1>
                      <p className="text-muted-foreground">
                        This page is under construction.
                      </p>
                    </div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/labeling"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Labeling />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/summarization"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <div className="container mx-auto p-6 max-w-6xl">
                      <h1 className="text-3xl font-bold">
                        Content Summarization
                      </h1>
                      <p className="text-muted-foreground">
                        This page is under construction.
                      </p>
                    </div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/media"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <div className="container mx-auto p-6 max-w-6xl">
                      <h1 className="text-3xl font-bold">Media Processing</h1>
                      <p className="text-muted-foreground">
                        This page is under construction.
                      </p>
                    </div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/gap-analysis"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <StandardsAnalysis />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <div className="container mx-auto p-6 max-w-6xl">
                      <h1 className="text-3xl font-bold">User Profile</h1>
                      <p className="text-muted-foreground">
                        This page is under construction.
                      </p>
                    </div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <div className="container mx-auto p-6 max-w-6xl">
                      <h1 className="text-3xl font-bold">Settings</h1>
                      <p className="text-muted-foreground">
                        This page is under construction.
                      </p>
                    </div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
