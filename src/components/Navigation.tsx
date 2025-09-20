import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/utils/dashboardRouter';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Home, BookOpen, Phone, Calendar, Menu, X, ChevronDown, CreditCard, FileText } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const Navigation = () => {
  const { user, profile, signOut, isApplicant, isStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      console.log('Navigation: Starting sign out...');
      await signOut();
      console.log('Navigation: Sign out completed');
    } catch (error) {
      console.error('Navigation: Sign out error:', error);
    }
  };

  const getDashboardLink = () => {
    return getDashboardRoute(profile);
  };

  const isActive = (path: string) => location.pathname === path;

  const getNavItems = () => {
    const baseItems = [
      { path: '/', label: 'Home', icon: Home },
      { path: '/about', label: 'About Us', icon: null },
      { path: '/programs', label: 'Programs', icon: BookOpen },
      { path: '/contact', label: 'Contact Us', icon: Phone },
    ];

    // Show pre-enrollment/consultation only for applicants
    if (user && isApplicant()) {
      baseItems.push({ path: '/book-consultation', label: 'Book Consultation', icon: Calendar });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 py-2">
              <img 
                src="/assets/anali-logo.png" 
                alt="ANALI Logo" 
                className="w-12 h-12 rounded-full shadow-md object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">ANALI</h1>
                <p className="text-xs text-muted-foreground hidden sm:block leading-tight">Assist N Achieve Leaders International</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary text-white shadow-md'
                      : 'text-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right side - User menu and mobile toggle */}
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:block font-medium">
                      {profile?.first_name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-foreground">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())} className="cursor-pointer">
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  {/* Only show enrollment/billing/documents for actual students, not applicants */}
                  {(profile?.role === 'student' || profile?.role === 'parent') && isStudent() && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/enrollment')} className="cursor-pointer">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Enrollment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/billing')} className="cursor-pointer">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Billing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/documents')} className="cursor-pointer">
                        <FileText className="w-4 h-4 mr-2" />
                        Documents
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" className="text-foreground hover:text-primary" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md" asChild>
                  <Link to="/auth?mode=signup">Get Started</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 bg-white/95 backdrop-blur-md">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      active
                        ? 'bg-primary text-white shadow-md'
                        : 'text-foreground hover:text-primary hover:bg-primary/5'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {Icon && <Icon className="w-5 h-5 mr-3" />}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;