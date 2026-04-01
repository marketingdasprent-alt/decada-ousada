import { SimpleNavbar } from "@/components/landing/SimpleNavbar";
import { Footer } from "@/components/landing/Footer";
import { motion } from "framer-motion";

const Termos = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <SimpleNavbar />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Termos e <span className="text-[#E53333]">Condições</span>
            </h1>
            <p className="text-gray-400">
              Última atualização: Janeiro 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-invert">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">1. Objeto</h2>
                <p className="text-gray-400">
                  Os presentes Termos e Condições regulam a utilização dos serviços prestados pela Década Ousada, 
                  incluindo o aluguer de veículos para atividade TVDE e serviços associados. Ao utilizar os nossos 
                  serviços, o utilizador aceita integralmente estes termos.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">2. Definições</h2>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li><strong className="text-white">Empresa:</strong> Década Ousada, operador TVDE certificado</li>
                  <li><strong className="text-white">Motorista:</strong> Pessoa singular que celebra contrato de aluguer de veículo</li>
                  <li><strong className="text-white">Veículo:</strong> Automóvel disponibilizado para atividade TVDE</li>
                  <li><strong className="text-white">Serviços:</strong> Conjunto de prestações incluídas no contrato</li>
                </ul>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">3. Condições de Acesso</h2>
                <p className="text-gray-400 mb-4">
                  Para aceder aos serviços da Década Ousada, o motorista deve:
                </p>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li>Possuir carta de condução válida categoria B</li>
                  <li>Ter certificado de motorista TVDE válido</li>
                  <li>Apresentar documentação pessoal válida</li>
                  <li>Cumprir os requisitos legais para exercício da atividade TVDE</li>
                </ul>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">4. Obrigações do Motorista</h2>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li>Utilizar o veículo exclusivamente para atividade TVDE</li>
                  <li>Manter o veículo em bom estado de conservação e limpeza</li>
                  <li>Cumprir todas as regras de trânsito e legislação aplicável</li>
                  <li>Efetuar os pagamentos nas datas acordadas</li>
                  <li>Comunicar imediatamente qualquer acidente ou avaria</li>
                  <li>Não sublocar ou ceder o veículo a terceiros</li>
                </ul>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">5. Obrigações da Empresa</h2>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li>Disponibilizar veículo em condições adequadas de funcionamento</li>
                  <li>Prestar assistência técnica conforme acordado</li>
                  <li>Manter os seguros obrigatórios em vigor</li>
                  <li>Fornecer documentação necessária para a atividade</li>
                  <li>Prestar suporte ao motorista durante o período contratual</li>
                </ul>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">6. Pagamentos e Faturação</h2>
                <p className="text-gray-400">
                  Os valores e condições de pagamento são definidos no contrato individual celebrado com cada 
                  motorista. O incumprimento dos pagamentos pode resultar na suspensão dos serviços e rescisão 
                  contratual, sem prejuízo de outras consequências legais.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">7. Responsabilidade</h2>
                <p className="text-gray-400">
                  A Década Ousada não se responsabiliza por danos resultantes de utilização indevida do veículo, 
                  incumprimento das regras de trânsito pelo motorista, ou situações de força maior. O motorista 
                  é responsável por todos os danos causados ao veículo durante o período de utilização.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">8. Rescisão</h2>
                <p className="text-gray-400">
                  O contrato pode ser rescindido por qualquer das partes mediante aviso prévio conforme 
                  estabelecido no contrato individual. A rescisão por justa causa pode ocorrer imediatamente 
                  em casos de incumprimento grave das obrigações contratuais.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">9. Lei Aplicável</h2>
                <p className="text-gray-400">
                  Os presentes Termos e Condições regem-se pela lei portuguesa. Para resolução de quaisquer 
                  litígios será competente o foro da comarca de Lisboa, com renúncia a qualquer outro.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">10. Contactos</h2>
                <p className="text-gray-400">
                  Para questões relacionadas com estes Termos e Condições, contacte-nos através do email{" "}
                  <a href="mailto:motoristas.tvde@distanciaarrojada.pt" className="text-[#E53333] hover:underline">
                    motoristas.tvde@distanciaarrojada.pt
                  </a>
                  {" "}ou telefone{" "}
                  <a href="tel:+351309100174" className="text-[#E53333] hover:underline">
                    309 100 174
                  </a>.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Termos;
