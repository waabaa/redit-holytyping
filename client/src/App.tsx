import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Practice from "@/pages/practice";
import Leaderboard from "@/pages/leaderboard";
import Challenges from "@/pages/challenges";
import Profile from "@/pages/profile";
import Churches from "@/pages/churches";
import ChurchDetail from "@/pages/church-detail";
import ChurchRegister from "@/pages/church-register";
import CompleteProfile from "@/pages/complete-profile";
import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminRoles from "@/pages/admin-roles";
import AdminLogs from "@/pages/admin-logs";
import AdminSettings from "@/pages/admin-settings";
import Header from "@/components/header";
import { useEffect } from "react";
import type { User } from "@shared/schema";

function Router() {
  const authData = useAuth();
  const { user, isAuthenticated, isLoading } = authData;
  const [location, navigate] = useLocation();

  // 로그인한 사용자의 프로필 완성 상태 확인
  useEffect(() => {
    if (isAuthenticated && user && location !== "/complete-profile") {
      const typedUser = user as User;
      
      // 프로필 완성 상태 확인 (profileCompleted 플래그를 우선적으로 확인)
      const isProfileIncomplete = !typedUser.profileCompleted;

      if (isProfileIncomplete) {
        navigate("/complete-profile");
      }
    }
  }, [isAuthenticated, user, location, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* complete-profile, verify-email, forgot-password, reset-password 페이지에서는 헤더 숨김 */}
      {(() => {
        const pathsToHideHeader = ["/complete-profile", "/verify-email", "/forgot-password", "/reset-password"];
        const shouldHideHeader = pathsToHideHeader.some(path => location.startsWith(path));
        return !shouldHideHeader && <Header />;
      })()}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/practice" component={Practice} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/challenges" component={Challenges} />
        <Route path="/churches/register" component={ChurchRegister} />
        <Route path="/churches/:id" component={ChurchDetail} />
        <Route path="/churches" component={Churches} />
        <Route path="/profile" component={Profile} />
        <Route path="/complete-profile" component={CompleteProfile} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/roles" component={AdminRoles} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
