import { SimpleNavbar } from "@/components/landing/SimpleNavbar";
import { Footer } from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { Phone, Mail, MessageCircle, MapPin, Clock } from "lucide-react";

const Contactos = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <SimpleNavbar />
      
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Fala <span className="text-[#B20101]">Connosco</span>
            </h1>
            <p className="text-xl text-gray-400">
              Estamos disponíveis para esclarecer todas as tuas dúvidas e ajudar-te a começar.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* WhatsApp */}
            <motion.a
              href="https://wa.me/351912023234"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-800/50 rounded-xl p-8 text-center hover:bg-gray-800 transition-colors group"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <MessageCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">WhatsApp</h3>
              <p className="text-gray-400 mb-4">Resposta rápida</p>
              <p className="text-[#B20101] font-semibold">+351 912 023 234</p>
            </motion.a>

            {/* Phone */}
            <motion.a
              href="tel:+351309100174"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-gray-800/50 rounded-xl p-8 text-center hover:bg-gray-800 transition-colors group"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#B20101]/20 flex items-center justify-center group-hover:bg-[#B20101]/30 transition-colors">
                <Phone className="w-8 h-8 text-[#B20101]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Telefone</h3>
              <p className="text-gray-400 mb-4">Linha direta</p>
              <p className="text-[#B20101] font-semibold">309 100 174</p>
            </motion.a>

            {/* Email */}
            <motion.a
              href="mailto:motoristas.tvde@distanciaarrojada.pt"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gray-800/50 rounded-xl p-8 text-center hover:bg-gray-800 transition-colors group"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email</h3>
              <p className="text-gray-400 mb-4">Para questões detalhadas</p>
              <p className="text-[#B20101] font-semibold text-sm">motoristas.tvde@distanciaarrojada.pt</p>
            </motion.a>
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-16 bg-gray-900/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-800/50 rounded-xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Informações Adicionais</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#B20101]/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-[#B20101]" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Horário de Atendimento</h3>
                    <p className="text-gray-400">Segunda a Sexta: 9h00 - 18h00</p>
                    <p className="text-gray-400">Sábado: 9h00 - 13h00</p>
                    <p className="text-gray-500 text-sm mt-1">WhatsApp disponível 24/7 para emergências</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#B20101]/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#B20101]" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Áreas de Operação</h3>
                    <p className="text-gray-400">Portugal Continental e Açores</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contactos;
