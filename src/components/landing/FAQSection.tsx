import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Preciso ter empresa para trabalhar convosco?",
    answer: "Não precisa de ter empresa constituída! Trabalha como trabalhador independente com a sua licença TVDE. Semanalmente, emite um recibo verde para receber os seus ganhos. Damos apoio na parte administrativa.",
  },
  {
    question: "Como funciona o pagamento?",
    answer: "O pagamento é feito semanalmente, diretamente na sua conta bancária. Paga apenas um valor fixo de aluguer semanal - sem surpresas nos custos. As comissões das plataformas (Uber, Bolt) aplicam-se normalmente.",
  },
  {
    question: "Que documentos preciso para me candidatar?",
    answer: "Precisa de: Licença TVDE válida, Carta de Condução, Documento de Identificação (CC ou Passaporte), Registo Criminal, Comprovativo de Morada e IBAN para receber os pagamentos.",
  },
  {
    question: "Posso trabalhar quando quiser?",
    answer: "Sim! Tem total flexibilidade de horários. Trabalhe quando e quanto quiser. Não há horários mínimos obrigatórios nem penalizações por dias de folga.",
  },
  {
    question: "E se não tiver licença TVDE?",
    answer: "Infelizmente, a licença TVDE é obrigatória por lei para exercer a atividade de motorista TVDE. Sugerimos procurar um centro de formação certificado na sua zona para obter a licença.",
  },
  {
    question: "Quanto tempo demora o processo de aprovação?",
    answer: "Depois de submeter a sua candidatura e documentos, o processo de aprovação demora normalmente 24 a 48 horas úteis. A nossa equipa entra em contacto consigo rapidamente.",
  },
  {
    question: "Que tipo de viaturas têm disponíveis?",
    answer: "Temos uma frota variada que inclui viaturas para todas as categorias: X Saver, Comfort, Black, Green (elétricos), X Priority e mais. Escolha a que melhor se adapta a si.",
  },
  {
    question: "Qual é a diferença entre Aluguer e Slot?",
    answer: "No Aluguer, fornecemos a viatura e você trabalha com ela. No Slot, você já tem viatura própria e utiliza apenas a nossa estrutura e apoio para trabalhar nas plataformas.",
  },
];

export const FAQSection = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return (
    <section className="py-20 bg-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-6">
            Perguntas Frequentes
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Respostas às dúvidas mais comuns dos nossos candidatos.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-gray-800/50 border border-gray-700 rounded-xl px-6 data-[state=open]:border-primary/50"
              >
                <AccordionTrigger className="text-left text-white hover:text-primary hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
