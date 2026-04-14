import { motion } from "framer-motion";
import { Car, Zap, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onRentClick: () => void;
  onSlotClick: () => void;
}

export const HeroSection = ({ onRentClick, onSlotClick }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Login button */}
      <a
        href="https://decadaousada.pt/motorista/login"
        className="absolute top-6 right-6 z-20 inline-flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        <LogIn className="h-4 w-4" />
        Área do Motorista
      </a>
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 via-transparent to-gray-900/30 opacity-60" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#B20101]/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#B20101]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <img
              src="/images/logo-decada-ousada-white.png"
              alt="Década Ousada - Motoristas TVDE Portugal"
              className="h-16 md:h-20 w-auto mx-auto mb-8"
              fetchPriority="high"
            />
          </motion.div>
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 bg-[#B20101]/10 border border-[#B20101]/30 rounded-full px-4 py-2 mb-6"
          >
            <span className="w-2 h-2 bg-[#B20101] rounded-full animate-pulse" />
            <span className="text-[#E53333] text-sm font-medium">A empresa TVDE que mais cresce em Portugal</span>
          </motion.div>
          
          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Trabalhe Para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E53333] to-[#B20101]">
              Si Mesmo
            </span>
            <br />
            Sem Burocracia
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            Junte-se a centenas de motoristas que já faturam com a Década Ousada. 
            Custos claros e fixos, suporte 7 dias por semana.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              onClick={onRentClick}
              size="lg"
              aria-label="Candidatar-me para alugar um carro TVDE"
              className="bg-[#B20101] hover:bg-[#8E0101] text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-[#B20101]/25 hover:shadow-[#B20101]/40 transition-all duration-300 w-full sm:w-auto"
            >
              <Car className="mr-2 h-5 w-5" />
              Quero alugar um carro
            </Button>
            
            <Button
              onClick={onSlotClick}
              size="lg"
              variant="outline"
              aria-label="Candidatar-me como motorista Slot"
              className="border-2 border-[#B20101]/50 text-[#E53333] hover:bg-[#B20101]/10 font-bold px-8 py-6 text-lg rounded-xl w-full sm:w-auto"
            >
              <Zap className="mr-2 h-5 w-5" />
              Quero ser Slot
            </Button>
          </motion.div>

          
          {/* Partner logos */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 flex items-center justify-center gap-8"
          >
            <span className="text-gray-500 text-sm">Parceiros oficiais:</span>
            <div className="flex items-center gap-8">
              <img 
                src="/images/logo-uber.png" 
                alt="Uber" 
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="h-14 object-contain"
              />
              <img 
                src="/images/logo-bolt.png" 
                alt="Bolt" 
                width={56}
                height={56}
                loading="lazy"
                decoding="async"
                className="h-14 object-contain"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
