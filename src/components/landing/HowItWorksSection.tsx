import { motion } from "framer-motion";
import { ClipboardList, Phone, Rocket } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    number: "01",
    title: "Preencha o formulário",
    description: "Leva apenas 2 minutos. Diga-nos a sua situação e como pretende trabalhar.",
  },
  {
    icon: Phone,
    number: "02",
    title: "Receba nosso contacto",
    description: "A nossa equipa entra em contacto consigo em menos de 24 horas úteis.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Comece a faturar",
    description: "Depois de aprovado, está pronto para começar. Apoio total desde o primeiro dia.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Processo simples
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-6">
            Como funciona
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Começar a trabalhar connosco é simples e rápido. Siga estes 3 passos.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="relative z-10 mx-auto w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/25">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                
                {/* Number badge */}
                <span className="absolute top-0 right-1/2 translate-x-12 -translate-y-2 text-6xl font-bold text-primary/10">
                  {step.number}
                </span>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                
                <p className="text-gray-400 max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
