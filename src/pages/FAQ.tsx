import { SimpleNavbar } from "@/components/landing/SimpleNavbar";
import { Footer } from "@/components/landing/Footer";
import { FAQSection } from "@/components/landing/FAQSection";
import { motion } from "framer-motion";

const FAQ = () => {
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
              Perguntas <span className="text-[#E53333]">Frequentes</span>
            </h1>
            <p className="text-xl text-gray-400">
              Encontra aqui as respostas às dúvidas mais comuns sobre os nossos serviços.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section - Reusing existing component */}
      <FAQSection />

      <Footer />
    </div>
  );
};

export default FAQ;
