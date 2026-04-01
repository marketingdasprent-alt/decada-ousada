import { motion } from "framer-motion";
import { Check } from "lucide-react";

const categories = [
  {
    name: "X Saver / Economy",
    description: "Económico e eficiente",
    features: ["Consumo reduzido", "Ideal para cidade", "Manutenção acessível"],
    image: "/images/x-saver.png",
    popular: true,
  },
  {
    name: "Comfort",
    description: "Equilíbrio perfeito",
    features: ["Maior conforto", "Mais espaço", "Clientes premium"],
    image: "/images/comfort.png",
    popular: false,
  },
  {
    name: "Black",
    description: "Categoria premium",
    features: ["Viaturas de luxo", "Maior faturação", "Clientes executivos"],
    image: "/images/black.png",
    popular: false,
  },
  {
    name: "Green",
    description: "100% Elétrico",
    features: ["Zero emissões", "Menor custo/km", "Futuro sustentável"],
    image: "/images/green.png",
    popular: false,
  },
];

export const CarCategoriesSection = () => {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#E53333] font-semibold text-sm uppercase tracking-wider">
            Nossa frota
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-6">
            Categorias disponíveis
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Escolha a categoria que melhor se adapta ao seu estilo de trabalho e objetivos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative group overflow-hidden rounded-2xl border ${
                category.popular 
                  ? "border-[#B20101]/50" 
                  : "border-gray-800"
              } bg-gray-900/50 hover:border-gray-700 transition-all duration-300`}
            >
              {/* Popular badge */}
              {category.popular && (
                <div className="absolute top-4 right-4 z-10 bg-[#B20101] text-white text-xs font-bold px-3 py-1 rounded-full">
                  Popular
                </div>
              )}
              
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={category.image}
                  alt={category.name}
                  width={400}
                  height={192}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              </div>
              
              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {category.description}
                </p>
                
                <ul className="space-y-2">
                  {category.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-[#E53333]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
