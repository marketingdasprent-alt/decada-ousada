import { motion } from "framer-motion";

const stats = [
  {
    value: "500+",
    label: "Motoristas ativos",
  },
  {
    value: "100%",
    label: "Seguro contra todos os riscos",
  },
  {
    value: "7 dias",
    label: "Suporte semanal",
  },
  {
    value: "24h",
    label: "Para começar",
  },
];

export const StatsSection = () => {
  return (
    <section className="py-16 bg-black border-y border-gray-800/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-yellow-500 mb-2">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
