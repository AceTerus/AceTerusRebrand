import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/90 p-10 text-center shadow-elegant backdrop-blur">
        <h1 className="text-5xl font-bold mb-3">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-primary/90 px-6 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
