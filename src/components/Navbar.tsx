import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Menu, X, LogOut, LogIn, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Logo from "../assets/logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();
  const { toast } = useToast();

  const navItems = [
    { href: "/feed", label: "Home", icon: Home },
    { href: "/quiz", label: "Quiz", icon: BookOpen },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    navigate("/");
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-elegant">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <img
              src={Logo}
              alt="AceTerus Logo"
              className="w-16 h-16 object-contain rounded-lg group-hover:shadow-glow transition-all duration-300"
            />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AceTerus
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {user && navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`
                      flex items-center space-x-2 transition-smooth
                      ${isActive(item.href) 
                        ? "bg-gradient-primary text-primary-foreground shadow-glow" 
                        : "hover:bg-muted"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
            
            {!isLoading && (
              user ? (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 hover:bg-muted"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              ) : (
                <Link to="/auth">
                  <Button
                    variant="default"
                    className="flex items-center space-x-2 bg-gradient-primary text-primary-foreground shadow-glow"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {user && navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={`
                      w-full justify-start space-x-2 transition-smooth
                      ${isActive(item.href) 
                        ? "bg-gradient-primary text-primary-foreground" 
                        : ""
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
            
            {!isLoading && (
              user ? (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setIsOpen(false)}>
                  <Button
                    variant="default"
                    className="w-full justify-start space-x-2 bg-gradient-primary text-primary-foreground"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Button>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;