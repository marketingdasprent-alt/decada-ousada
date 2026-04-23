import { motion } from "framer-motion";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onFormClick: () => void;
}

export const CTASection = ({ onFormClick }: CTASectionProps) => {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[#B20101]/5 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Pronto para Começar a Sua Jornada?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Junte-se à Década Ousada e faça parte de uma equipa que valoriza o seu trabalho. 
            Estamos aqui para apoiá-lo em cada passo.
          </p>

          <Button
            onClick={onFormClick}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 mb-12"
          >
            Candidatar-me Agora
          </Button>

          {/* Contact options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <a
            href="https://wa.me/351912023234"
            aria-label="Contactar via WhatsApp"
            className="flex items-center justify-center gap-3 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-300">WhatsApp</span>
          </a>
          <a
            href="mailto:motoristas.tvde@distanciaarrojada.pt"
            aria-label="Contactar via Email"
            className="flex items-center justify-center gap-3 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Mail className="w-5 h-5 text-blue-500" />
            <span className="text-gray-300">Email</span>
          </a>
          <a
            href="tel:+351912023234"
            aria-label="Ligar por telefone"
            className="flex items-center justify-center gap-3 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Phone className="w-5 h-5 text-[#E53333]" />
            <span className="text-gray-300">Telefone</span>
          </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
