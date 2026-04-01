import { Facebook, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-black border-t border-gray-800 py-12" role="contentinfo">
      <div className="container mx-auto px-4">
        <nav aria-label="Links do rodapé" className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and description */}
          <div className="md:col-span-2">
            <img
              src="/images/logo-decada-ousada-white.png"
              alt="Década Ousada"
              width={150}
              height={48}
              loading="lazy"
              decoding="async"
              className="h-12 mb-4"
            />
            <p className="text-gray-400 max-w-md">
              A empresa TVDE que mais cresce em Portugal. Trabalhamos para que você 
              trabalhe para si mesmo, com todo o apoio que precisa.
            </p>
            
            {/* Social links */}
            <div className="flex gap-4 mt-6">
              <a
                href="https://www.facebook.com/decada.ousada"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook da Década Ousada"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-[#B20101] hover:text-white transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/decada_ousada/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da Década Ousada"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-[#B20101] hover:text-white transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Links Úteis</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/sobre" className="text-gray-400 hover:text-[#B20101] transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/contactos" className="text-gray-400 hover:text-[#B20101] transition-colors">
                  Contactos
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-[#B20101] transition-colors">
                  Perguntas Frequentes
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-[#B20101] transition-colors">
                  Área de Gestores
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/termos" className="text-gray-400 hover:text-[#B20101] transition-colors">
                  Termos e Condições
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-gray-400 hover:text-[#B20101] transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/privacidade#cookies" className="text-gray-400 hover:text-[#B20101] transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </nav>
        
        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Década Ousada. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-sm">
            Operador TVDE Certificado
          </p>
        </div>
      </div>
    </footer>
  );
};
