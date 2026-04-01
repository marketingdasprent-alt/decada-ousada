import { motion } from "framer-motion";

export const AwardsSection = () => {
  const awards = [
    {
      image: "/images/premio-scoring-top5.png",
      title: "TOP 5% Melhores PME",
      description: "Portugal 2024 - 2º ano consecutivo"
    },
    {
      image: "/images/premio-1500-maiores.png",
      title: "1500 Maiores Empresas",
      description: "Distrito de Coimbra 2023"
    }
  ];

  return (
    <section className="py-16 bg-zinc-900/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Excelência reconhecida
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4">
            Reconhecimentos
          </h2>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {awards.map((award, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="flex flex-col items-center text-center"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
                <img
                  src={award.image}
                  alt={award.title}
                  width={160}
                  height={160}
                  loading="lazy"
                  decoding="async"
                  className="h-32 md:h-40 w-auto object-contain"
                />
              </div>
              <h3 className="text-white font-semibold text-lg">{award.title}</h3>
              <p className="text-gray-400 text-sm">{award.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
