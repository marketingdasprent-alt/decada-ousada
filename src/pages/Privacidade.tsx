import { SimpleNavbar } from "@/components/landing/SimpleNavbar";
import { Footer } from "@/components/landing/Footer";
import { motion } from "framer-motion";

const Privacidade = () => {
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
              Política de <span className="text-[#E53333]">Privacidade</span>
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
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">1. Responsável pelo Tratamento</h2>
                <p className="text-gray-400">
                  A Década Ousada, com sede em Portugal, é a entidade responsável pelo tratamento dos dados 
                  pessoais recolhidos através deste website e dos serviços prestados. Para questões relacionadas 
                  com privacidade, contacte-nos através do email{" "}
                  <a href="mailto:motoristas.tvde@distanciaarrojada.pt" className="text-[#E53333] hover:underline">
                    motoristas.tvde@distanciaarrojada.pt
                  </a>.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">2. Dados Recolhidos</h2>
                <p className="text-gray-400 mb-4">
                  Recolhemos os seguintes tipos de dados pessoais:
                </p>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li><strong className="text-white">Dados de identificação:</strong> nome, NIF, documento de identificação</li>
                  <li><strong className="text-white">Dados de contacto:</strong> email, telefone, morada</li>
                  <li><strong className="text-white">Dados profissionais:</strong> carta de condução, certificado TVDE</li>
                  <li><strong className="text-white">Dados de navegação:</strong> endereço IP, cookies, dados de utilização do website</li>
                </ul>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">3. Finalidade do Tratamento</h2>
                <p className="text-gray-400 mb-4">
                  Os dados pessoais são tratados para as seguintes finalidades:
                </p>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li>Prestação dos serviços de aluguer de veículos TVDE</li>
                  <li>Gestão da relação contratual</li>
                  <li>Cumprimento de obrigações legais e fiscais</li>
                  <li>Comunicações comerciais (com consentimento)</li>
                  <li>Melhoria dos nossos serviços e website</li>
                </ul>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">4. Base Legal</h2>
                <p className="text-gray-400">
                  O tratamento de dados pessoais baseia-se na execução de contrato, cumprimento de obrigações 
                  legais, consentimento do titular (quando aplicável) e interesses legítimos da empresa para 
                  melhoria dos serviços.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">5. Partilha de Dados</h2>
                <p className="text-gray-400">
                  Os dados pessoais podem ser partilhados com entidades terceiras para cumprimento de obrigações 
                  legais, seguradoras (no âmbito dos seguros de veículos), e prestadores de serviços que atuem 
                  em nosso nome, sempre com garantias adequadas de proteção de dados.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">6. Conservação de Dados</h2>
                <p className="text-gray-400">
                  Os dados pessoais são conservados durante o período necessário para as finalidades que 
                  motivaram a sua recolha, cumprimento de obrigações legais e durante os prazos de prescrição 
                  aplicáveis.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">7. Direitos dos Titulares</h2>
                <p className="text-gray-400 mb-4">
                  Nos termos do RGPD, tem os seguintes direitos:
                </p>
                <ul className="text-gray-400 space-y-2 list-disc list-inside">
                  <li>Direito de acesso aos seus dados pessoais</li>
                  <li>Direito de retificação de dados inexatos</li>
                  <li>Direito ao apagamento ("direito a ser esquecido")</li>
                  <li>Direito à limitação do tratamento</li>
                  <li>Direito à portabilidade dos dados</li>
                  <li>Direito de oposição ao tratamento</li>
                  <li>Direito de apresentar reclamação à CNPD</li>
                </ul>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">8. Segurança</h2>
                <p className="text-gray-400">
                  Implementamos medidas técnicas e organizativas adequadas para proteger os dados pessoais 
                  contra acesso não autorizado, alteração, divulgação ou destruição. Os nossos sistemas são 
                  regularmente monitorizados e atualizados para garantir a segurança dos dados.
                </p>
              </div>

              {/* Cookies Section */}
              <div id="cookies" className="bg-gray-800/30 rounded-xl p-6 scroll-mt-24">
                <h2 className="text-2xl font-bold mb-4 text-white">9. Política de Cookies</h2>
                <p className="text-gray-400 mb-4">
                  O nosso website utiliza cookies para melhorar a experiência de navegação. Os cookies são 
                  pequenos ficheiros de texto armazenados no seu dispositivo.
                </p>
                
                <h3 className="text-lg font-semibold mb-2 text-white">Tipos de Cookies Utilizados:</h3>
                <ul className="text-gray-400 space-y-2 list-disc list-inside mb-4">
                  <li><strong className="text-white">Cookies essenciais:</strong> Necessários para o funcionamento do website</li>
                  <li><strong className="text-white">Cookies de desempenho:</strong> Ajudam-nos a entender como os visitantes utilizam o website</li>
                  <li><strong className="text-white">Cookies de funcionalidade:</strong> Permitem funcionalidades melhoradas e personalização</li>
                  <li><strong className="text-white">Cookies de marketing:</strong> Utilizados para apresentar anúncios relevantes</li>
                </ul>

                <h3 className="text-lg font-semibold mb-2 text-white">Gestão de Cookies:</h3>
                <p className="text-gray-400">
                  Pode gerir as suas preferências de cookies através das definições do seu navegador. Note que 
                  a desativação de alguns cookies pode afetar a funcionalidade do website.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">10. Alterações à Política</h2>
                <p className="text-gray-400">
                  Reservamo-nos o direito de alterar esta política de privacidade a qualquer momento. As 
                  alterações serão publicadas nesta página com a respetiva data de atualização. Recomendamos 
                  a consulta regular desta página.
                </p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-white">11. Contactos</h2>
                <p className="text-gray-400">
                  Para exercer os seus direitos ou esclarecer questões sobre privacidade, contacte-nos através do email{" "}
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

export default Privacidade;
