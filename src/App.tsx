import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedBookingRoute from "@/components/ProtectedBookingRoute";
import Navigation from "@/components/Navigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Programs from "./pages/Programs";
import Contact from "./pages/Contact";
import BookConsultation from "./pages/BookConsultation";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import Profile from "./pages/Profile";
import EnrollmentForm from "./pages/EnrollmentForm";
import BillingDashboard from "./pages/BillingDashboard";
import EnhancedBillingDashboard from "@/components/EnhancedBillingDashboard";
import DocumentRequest from "./pages/DocumentRequest";
import AdminDashboard from './pages/AdminDashboard';
import RegistrarDashboard from './pages/RegistrarDashboard';
import AccountantDashboard from './pages/AccountantDashboard';
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import ApplicantDashboard from "./pages/ApplicantDashboard";
import EncryptedBillingView from "@/components/EncryptedBillingView";
import StatusManager from '@/utils/statusManager';
import StatusProtectedRoute from '@/components/StatusProtectedRoute';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navigation />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/about" element={<About />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/book-consultation" element={
                <ProtectedBookingRoute>
                  <BookConsultation />
                </ProtectedBookingRoute>
              } />
              <Route path="/applicant-dashboard" element={
                <ProtectedRoute>
                  <ApplicantDashboard />
                </ProtectedRoute>
              } />
              
              {/* Protected Routes */}
              <Route path="/student-dashboard" element={
                <StatusProtectedRoute 
                  allowedStatuses={['student']}
                  requiredRole={['student']}
                  redirectTo="/applicant-dashboard"
                >
                  <StudentDashboard />
                </StatusProtectedRoute>
              } />
              <Route path="/teacher-dashboard" element={
                <ProtectedRoute requiredRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              } />
              <Route path="/registrar-dashboard" element={
                <ProtectedRoute requiredRoles={['registrar']}>
                  <RegistrarDashboard />
                </ProtectedRoute>
              } />
              <Route path="/accountant-dashboard" element={
                <ProtectedRoute requiredRoles={['accountant']}>
                  <AccountantDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin-dashboard" element={
                <ProtectedRoute requiredRoles={['super_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/enrollment" element={
                <StatusProtectedRoute 
                  allowedStatuses={['consultation_completed']}
                  requiredRole={['student']}
                  redirectTo="/applicant-dashboard"
                >
                  <EnrollmentForm />
                </StatusProtectedRoute>
              } />
              <Route path="/billing" element={
                <StatusProtectedRoute 
                  allowedStatuses={['payment_pending', 'student']}
                  requiredRole={['student']}
                  redirectTo="/applicant-dashboard"
                >
                  <EnhancedBillingDashboard />
                </StatusProtectedRoute>
              } />
              <Route path="/documents" element={
                <ProtectedRoute requiredRoles={['student', 'parent']}>
                  <DocumentRequest />
                </ProtectedRoute>
              } />
              <Route path="/encrypted-billing" element={
                <ProtectedRoute requiredRoles={['student', 'parent']}>
                  <EncryptedBillingView />
                </ProtectedRoute>
              } />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
