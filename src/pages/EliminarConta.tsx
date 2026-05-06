import { useState } from "react";
import { SimpleNavbar } from "@/components/landing/SimpleNavbar";
import { Footer } from "@/components/landing/Footer";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, CheckCircle, AlertTriangle } from "lucide-react";

export default function EliminarConta() {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Por favor, introduza o seu endereço de email.");
      return;
    }

    setLoading(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("solicitar-eliminacao", {
        body: { email: email.trim(), nome: nome.trim() || undefined },
      });

      if (fnError) throw fnError;

      setSubmitted(true);
    } catch (err: any) {
      setError("Ocorreu um erro ao enviar o pedido. Por favor, tente novamente ou contacte o suporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SimpleNavbar />

      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Eliminação de <span className="text-[#E53333]">Conta</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Pode solicitar a eliminação da sua conta e de todos os dados pessoais associados.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto space-y-8">

            {/* What gets deleted */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-gray-800/40 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <h2 className="text-xl font-bold">O que será eliminado</h2>
              </div>
              <ul className="text-gray-400 space-y-2 list-disc list-inside">
                <li>A sua conta de utilizador e credenciais de acesso</li>
                <li>Dados do perfil (nome, email, cargo)</li>
                <li>Histórico de atividade e registos associados à sua conta</li>
                <li>Todas as preferências e configurações pessoais</li>
              </ul>
              <p className="text-gray-500 text-sm mt-4">
                Esta ação é <strong className="text-white">irreversível</strong>. Após a eliminação não será possível recuperar os dados.
              </p>
            </motion.div>

            {/* Form or success */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gray-800/40 rounded-xl p-6 border border-gray-700"
            >
              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Pedido enviado</h2>
                  <p className="text-gray-400">
                    Recebemos o seu pedido de eliminação de conta. Irá receber um email de confirmação e
                    a sua conta será eliminada no prazo de <strong className="text-white">30 dias</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <Trash2 className="h-5 w-5 text-[#E53333] flex-shrink-0" />
                    <h2 className="text-xl font-bold">Solicitar eliminação</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="nome" className="text-gray-300">
                        Nome (opcional)
                      </Label>
                      <Input
                        id="nome"
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="O seu nome"
                        className="mt-1 bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-gray-300">
                        Email da conta <span className="text-[#E53333]">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="o-seu-email@exemplo.com"
                        required
                        className="mt-1 bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Introduza o email associado à conta que pretende eliminar.
                      </p>
                    </div>

                    {error && (
                      <p className="text-[#E53333] text-sm bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#E53333] hover:bg-[#c02a2a] text-white font-semibold"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> A enviar pedido...</>
                      ) : (
                        <><Trash2 className="h-4 w-4 mr-2" /> Solicitar eliminação da conta</>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </motion.div>

            {/* GDPR note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center text-gray-500 text-sm"
            >
              <p>
                O pedido será processado no prazo de 30 dias conforme o{" "}
                <span className="text-gray-400">RGPD (Regulamento Geral sobre a Proteção de Dados)</span>.
              </p>
              <p className="mt-2">
                Para questões adicionais, contacte-nos em{" "}
                <a
                  href="mailto:motoristas.tvde@distanciaarrojada.pt"
                  className="text-[#E53333] hover:underline"
                >
                  motoristas.tvde@distanciaarrojada.pt
                </a>
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
