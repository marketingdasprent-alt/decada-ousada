import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useThemedLogo } from "@/hooks/useThemedLogo";

export const SimpleNavbar = () => {
  const logoSrc = useThemedLogo();

  return (
    <nav className="bg-background border-b border-border py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </Link>
        <Link to="/">
          <img
            src={logoSrc}
            alt="Década Ousada"
            className="h-10"
          />
        </Link>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>
    </nav>
  );
};
