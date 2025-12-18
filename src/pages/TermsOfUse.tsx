import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { PageLoader } from '@/components/LoadingSpinner';

const TermsOfUse = () => {
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
          Termos de Uso
        </h1>

        <div className="space-y-8 text-muted-foreground">
          {/* Warning */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-primary mb-3">
              📋 Leia com Atenção
            </h2>
            <p className="text-foreground font-medium">
              Ao utilizar esta plataforma, você concorda com todos os termos descritos abaixo. 
              Se não concordar com algum termo, por favor, não utilize nossos serviços.
            </p>
          </div>

          {/* Acceptance */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar e usar o PlayBox Cine, você concorda em cumprir e estar sujeito a estes Termos de Uso. 
              Estes termos se aplicam a todos os visitantes, usuários e outras pessoas que acessam ou usam o serviço.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Descrição do Serviço
            </h2>
            <p>
              O PlayBox Cine é uma plataforma de streaming de conteúdo audiovisual. 
              O serviço permite aos usuários assistir filmes, séries e conteúdos ao vivo.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Acesso a catálogo de filmes e séries</li>
              <li>Streaming de canais ao vivo</li>
              <li>Criação de perfis personalizados</li>
              <li>Histórico de visualização</li>
            </ul>
          </section>

          {/* User Account */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Conta do Usuário
            </h2>
            <p>
              Para utilizar nossos serviços, você deve:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Criar uma conta com informações verdadeiras</li>
              <li>Manter a confidencialidade de sua senha</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
              <li>Ser responsável por todas as atividades realizadas em sua conta</li>
            </ul>
          </section>

          {/* Prohibited Use */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Uso Proibido
            </h2>
            <p>
              É estritamente proibido:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Compartilhar sua conta com terceiros não autorizados</li>
              <li>Tentar acessar áreas restritas do sistema</li>
              <li>Usar bots, scripts ou automações não autorizadas</li>
              <li>Redistribuir ou comercializar o conteúdo disponibilizado</li>
              <li>Violar direitos autorais ou propriedade intelectual</li>
              <li>Utilizar o serviço para fins ilegais</li>
            </ul>
          </section>

          {/* Content */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Conteúdo
            </h2>
            <p>
              Todo o conteúdo disponível na plataforma é fornecido "como está". 
              Não garantimos a disponibilidade contínua de qualquer conteúdo específico. 
              O catálogo pode ser alterado a qualquer momento sem aviso prévio.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Limitação de Responsabilidade
            </h2>
            <p>
              O PlayBox Cine não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Interrupções no serviço</li>
              <li>Perda de dados</li>
              <li>Danos diretos ou indiretos causados pelo uso da plataforma</li>
              <li>Conteúdo de terceiros ou links externos</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              7. Propriedade Intelectual
            </h2>
            <p>
              Todo o conteúdo, marcas, logotipos e materiais disponíveis na plataforma são 
              protegidos por direitos autorais e outras leis de propriedade intelectual. 
              É proibida a reprodução sem autorização expressa.
            </p>
          </section>

          {/* Account Termination */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              8. Encerramento de Conta
            </h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar sua conta a qualquer momento, 
              sem aviso prévio, caso haja violação destes termos ou por qualquer outro motivo 
              que julgarmos necessário.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              9. Alterações nos Termos
            </h2>
            <p>
              Podemos modificar estes termos a qualquer momento. As alterações entram em vigor 
              imediatamente após a publicação. O uso contínuo da plataforma após as alterações 
              constitui aceitação dos novos termos.
            </p>
          </section>

          {/* Applicable Law */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              10. Lei Aplicável
            </h2>
            <p>
              Estes termos são regidos pelas leis brasileiras. Qualquer disputa será 
              resolvida nos tribunais competentes do Brasil.
            </p>
          </section>

          {/* Related Links */}
          <section className="bg-muted/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              📄 Documentos Relacionados
            </h2>
            <p className="mb-4">
              Consulte também nossa Política de Privacidade para entender como tratamos seus dados:
            </p>
            <Link 
              to="/privacy" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Política de Privacidade →
            </Link>
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

export default TermsOfUse;
