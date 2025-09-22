import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Link, useLocation } from "wouter";
import { BookOpen, Trophy, Calendar, User, Menu, Users, Shield, BarChart3, Settings, FileText, Activity, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuthModal from "@/components/AuthModal";
import SignupModal from "@/components/SignupModal";

export default function Header() {
  const { user, isAuthenticated } = useAuth();
  const { isAdmin, canViewStats, canManageUsers, canManageRoles, canViewLogs, canManageSettings } = useAdminPermissions();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", label: "대시보드", icon: BarChart3 },
    { path: "/practice", label: "필사하기", icon: BookOpen },
    { path: "/leaderboard", label: "리더보드", icon: Trophy },
    { path: "/challenges", label: "챌린지", icon: Calendar },
    { path: "/churches", label: "교회", icon: Users },
    { path: "/profile", label: "프로필", icon: User },
  ];

  // Admin menu items - filtered by permissions
  const adminMenuItems = [
    ...(canViewStats ? [{ path: "/admin/dashboard", label: "대시보드", icon: BarChart3 }] : []),
    ...(canManageUsers ? [{ path: "/admin/users", label: "사용자 관리", icon: Users }] : []),
    ...(canManageRoles ? [{ path: "/admin/roles", label: "권한 관리", icon: Shield }] : []),
    ...(canViewLogs ? [{ path: "/admin/logs", label: "접근 로그", icon: Activity }] : []),
    ...(canManageSettings ? [{ path: "/admin/settings", label: "설정", icon: Settings }] : []),
  ];

  const isActive = (path: string) => location === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">홀리넷 성경필사</h1>
          </Link>
          
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6 ml-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`text-sm font-medium transition-colors hover:text-foreground flex items-center space-x-1 ${
                      isActive(item.path) ? "text-primary" : "text-muted-foreground"
                    }`}
                    data-testid={`link-${item.label.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Admin Dropdown Menu */}
              {adminMenuItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`text-sm font-medium transition-colors hover:text-foreground flex items-center space-x-1 ${
                        location.startsWith('/admin') ? "text-orange-600" : "text-muted-foreground"
                      }`}
                      data-testid="button-admin-menu"
                    >
                      <Shield className="h-4 w-4" />
                      <span>관리자</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {adminMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            href={item.path}
                            className={`flex items-center space-x-2 w-full ${
                              isActive(item.path) ? "bg-accent" : ""
                            }`}
                            data-testid={`link-admin-${item.label.toLowerCase().replace(/ /g, '-')}`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {!isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                onClick={() => setIsLoginModalOpen(true)} 
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" 
                data-testid="button-login"
              >
                로그인
              </Button>
              <Button 
                onClick={() => setIsSignupModalOpen(true)} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                data-testid="button-signup"
              >
                회원가입
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {(user as any)?.firstName || (user as any)?.email}님
                </span>
                <a href="/api/logout">
                  <Button variant="outline" size="sm" data-testid="button-logout">
                    로그아웃
                  </Button>
                </a>
              </div>
              
              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden" data-testid="button-mobile-menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[250px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">메뉴</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col space-y-4 mt-8">
                    {/* Regular navigation items */}
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground p-2 rounded-md ${
                            isActive(item.path) 
                              ? "text-primary bg-primary/10" 
                              : "text-muted-foreground hover:bg-accent"
                          }`}
                          data-testid={`mobile-link-${item.label.toLowerCase()}`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    
                    {/* Admin menu items */}
                    {adminMenuItems.length > 0 && (
                      <>
                        <div className="border-t pt-4">
                          <div className="text-xs font-semibold text-orange-600 mb-2">관리자 메뉴</div>
                        </div>
                        {adminMenuItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground p-2 rounded-md border border-orange-200 ${
                                isActive(item.path) 
                                  ? "text-orange-700 bg-orange-50" 
                                  : "text-orange-600 hover:bg-orange-50"
                              }`}
                              data-testid={`mobile-link-admin-${item.label.toLowerCase().replace(/ /g, '-')}`}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </>
                    )}
                    <div className="border-t pt-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        {(user as any)?.firstName || (user as any)?.email}님
                      </div>
                      <a href="/api/logout">
                        <Button variant="outline" size="sm" className="w-full" data-testid="mobile-button-logout">
                          로그아웃
                        </Button>
                      </a>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
      
      {/* 로그인 모달 */}
      <AuthModal 
        open={isLoginModalOpen} 
        onOpenChange={setIsLoginModalOpen}
        onSwitchToSignup={() => {
          setIsLoginModalOpen(false);
          setIsSignupModalOpen(true);
        }}
      />
      
      {/* 회원가입 모달 */}
      <SignupModal 
        open={isSignupModalOpen} 
        onOpenChange={setIsSignupModalOpen}
        onSwitchToLogin={() => {
          setIsSignupModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />
    </header>
  );
}
