import { motion } from "framer-motion";
import { 
  Wallet, 
  CalendarCheck, 
  Shield, 
  FileCheck, 
  Car, 
  CheckCircle 
} from "lucide-react";

const benefits = [
  {
    icon: Wallet,
    title: "Custos claros e fixos",
    description: "Sabe exatamente quanto paga. Renda fixa semanal sem surpresas.",
  },
  {
    icon: CalendarCheck,
    title: "Pagamento semanal",
    description: "Receba o seu dinheiro todas as semanas, diretamente na sua conta.",
  },
  {
    icon: Shield,
    title: "Suporte 7 dias",
    description: "Equipa dedicada disponível 7 dias por semana para o ajudar.",
  },
  {
    icon: FileCheck,
    title: "Sem burocracia",
    description: "Tratamos de toda a papelada. Você apenas conduz e fatura.",
  },
  {
    icon: Car,
    title: "Frota variada",
    description: "Do económico ao premium. Escolha o carro ideal para si.",
  },
  {
    icon: CheckCircle,
    title: "Apenas certificado",
    description: "Não precisa de empresa própria. Apenas a sua licença TVDE.",
  },
];

export const BenefitsSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Porquê escolher-nos
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-6">
            Benefícios de trabalhar connosco
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Na Década Ousada, oferecemos as melhores condições do mercado para motoristas TVDE.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative p-6 bg-gray-900/50 border border-gray-800/50 rounded-2xl hover:border-primary/30 transition-all duration-300"
            >
              {/* Gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 mb-5">
                <benefit.icon className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">
                {benefit.title}
              </h3>
              
              <p className="text-gray-400 leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
