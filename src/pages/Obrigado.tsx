
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Obrigado = () => {
  const navigate = useNavigate();

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' }
  };


  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div 
          className="text-center max-w-2xl mx-auto"
          initial="initial"
          animate="animate"
          variants={fadeInUp}
        >
          <div className="mb-8">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Obrigado!
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-300 mb-8 leading-relaxed">
            A sua candidatura foi enviada com sucesso. A nossa equipa entrará em contacto consigo nas próximas 24 horas.
          </p>
          
          <div className="space-y-4">
            <p className="text-yellow-500 font-medium text-lg">
              ⚡ Seja bem-vindo à nossa equipa!
            </p>
            
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="border-yellow-500/40 hover:bg-yellow-500/10 text-white hover:text-yellow-500 mt-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
          </div>
        </motion.div>
      </div>
      
      {/* Footer */}
      <footer className="py-6 px-4 text-center">
        <p className="text-gray-400 text-sm">
          © 2024 DasPrent. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};

export default Obrigado;
