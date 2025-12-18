import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/LoadingSpinner';

const PrivacyPolicy = () => {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          Política de Privacidade
        </h1>

        <div className="space-y-8 text-muted-foreground">
          {/* Important Warning */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-destructive mb-3">
              ⚠️ Aviso Importante
            </h2>
            <p className="text-foreground font-medium">
              Não nos responsabilizamos por nenhum vazamento de dados, por isso é importante não usar seu email principal. 
              Recomendamos fortemente o uso de um email secundário para cadastro nesta plataforma.
            </p>
          </div>

          {/* Data Collection */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Coleta de Dados
            </h2>
            <p>
              Coletamos apenas as informações necessárias para o funcionamento da plataforma:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Endereço de email para autenticação</li>
              <li>Nome de usuário escolhido</li>
              <li>Avatar selecionado</li>
              <li>Histórico de visualização</li>
            </ul>
          </section>

          {/* Data Usage */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Uso dos Dados
            </h2>
            <p>
              Os dados coletados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Autenticação e acesso à plataforma</li>
              <li>Personalização da experiência do usuário</li>
              <li>Salvar progresso de visualização</li>
            </ul>
          </section>

          {/* Data Storage */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Armazenamento
            </h2>
            <p>
              Seus dados são armazenados em servidores seguros. No entanto, nenhum sistema é 100% seguro. 
              Recomendamos que você utilize senhas únicas e não compartilhe suas credenciais.
            </p>
          </section>

          {/* User Rights */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Seus Direitos
            </h2>
            <p>
              Você tem o direito de:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Acessar seus dados pessoais</li>
              <li>Solicitar a exclusão de sua conta</li>
              <li>Atualizar suas informações</li>
            </ul>
          </section>

          {/* Third Parties */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Terceiros
            </h2>
            <p>
              Não compartilhamos seus dados pessoais com terceiros, exceto quando exigido por lei.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Alterações
            </h2>
            <p>
              Esta política pode ser atualizada a qualquer momento. Recomendamos que você revise 
              periodicamente para estar ciente de quaisquer mudanças.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              7. Contato
            </h2>
            <p>
              Em caso de dúvidas sobre esta política, entre em contato através da seção de contato disponível no rodapé do site.
            </p>
          </section>

          <p className="text-sm text-muted-foreground/70 pt-4 border-t border-border">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
