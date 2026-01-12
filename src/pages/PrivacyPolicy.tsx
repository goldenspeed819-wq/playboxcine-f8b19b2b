import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
const PrivacyPolicy = () => {
  return <div className="min-h-screen bg-background">
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

          {/* Legal Disclaimer */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-primary mb-3">
              ⚖️ Aviso Legal - Natureza do Serviço
            </h2>
            <p className="text-foreground font-medium mb-3">O Rynex Cine é um serviço de indexação de links. Não hospedamos, armazenamos ou distribuímos conteúdo audiovisual em nossos servidores.<strong>indexação de links</strong>. Não hospedamos, 
              armazenamos ou distribuímos conteúdo audiovisual em nossos servidores.
            </p>
            <p className="text-foreground">Esta política de privacidade se aplica exclusivamente aos dados coletados pelo Rynex Cine, e não aos sites de terceiros para os quais podemos direcionar.</p>
          </div>

          {/* Data Collection */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Coleta de Dados
            </h2>
            <p className="mb-3">
              Coletamos apenas as informações mínimas necessárias para o funcionamento da plataforma:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Endereço de email para autenticação</li>
              <li>Nome de usuário escolhido por você</li>
              <li>Avatar selecionado</li>
              <li>Preferências de visualização e histórico</li>
              <li>Informações técnicas de acesso (IP, navegador, dispositivo)</li>
            </ul>
          </section>

          {/* Data Usage */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Uso dos Dados
            </h2>
            <p className="mb-3">
              Os dados coletados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Autenticação e acesso à plataforma</li>
              <li>Personalização da experiência do usuário</li>
              <li>Salvar progresso e preferências</li>
              <li>Segurança e prevenção de abusos</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
          </section>

          {/* No Content Storage */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Armazenamento de Conteúdo
            </h2>
            <p className="mb-3">IMPORTANTE: O Rynex Cine NÃO armazena, hospeda ou distribui nenhum conteúdo audiovisual (vídeos, filmes, séries, etc.) em seus servidores.<strong>IMPORTANTE:</strong> O PlayBox Cine NÃO armazena, hospeda ou distribui 
              nenhum conteúdo audiovisual (vídeos, filmes, séries, etc.) em seus servidores.
            </p>
            <p>Todo o conteúdo acessível através da plataforma é hospedado em servidores de terceiros não afiliados a nós. O Rynex Cine atua apenas como um indexador de links públicos.</p>
          </section>

          {/* Data Storage */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Armazenamento de Dados Pessoais
            </h2>
            <p className="mb-3">
              Seus dados pessoais são armazenados em servidores seguros com as seguintes considerações:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Utilizamos criptografia para proteger informações sensíveis</li>
              <li>Nenhum sistema é 100% seguro contra invasões</li>
              <li>Não nos responsabilizamos por vazamentos de dados</li>
              <li>Recomendamos o uso de email secundário e senhas únicas</li>
            </ul>
          </section>

          {/* User Rights */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Seus Direitos
            </h2>
            <p className="mb-3">
              Você tem o direito de:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Acessar seus dados pessoais armazenados</li>
              <li>Solicitar a correção de informações incorretas</li>
              <li>Solicitar a exclusão de sua conta e dados</li>
              <li>Atualizar suas informações a qualquer momento</li>
              <li>Revogar consentimentos previamente concedidos</li>
            </ul>
          </section>

          {/* Third Parties */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Serviços de Terceiros
            </h2>
            <p className="mb-3">
              O PlayBox Cine direciona para conteúdos hospedados em servidores de terceiros. 
              <strong> Não temos controle sobre as políticas de privacidade desses sites.</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Cada site de terceiros possui sua própria política de privacidade</li>
              <li>Recomendamos que você leia as políticas dos sites que visitar</li>
              <li>Não nos responsabilizamos por práticas de terceiros</li>
              <li>O uso de VPN é recomendado para maior privacidade</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              7. Cookies e Tecnologias Similares
            </h2>
            <p className="mb-3">
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Manter você conectado à sua conta</li>
              <li>Salvar suas preferências de navegação</li>
              <li>Melhorar a performance do site</li>
              <li>Análise de uso (de forma anonimizada)</li>
            </ul>
          </section>

          {/* DMCA and Legal Compliance */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              8. Conformidade Legal e DMCA
            </h2>
            <p className="mb-3">
              O PlayBox Cine está comprometido com a conformidade legal:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Respeitamos notificações de direitos autorais (DMCA)</li>
              <li>Removemos links em resposta a notificações válidas</li>
              <li>Cooperamos com autoridades quando legalmente exigido</li>
              <li>Podemos divulgar dados quando obrigados por lei</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              9. Retenção de Dados
            </h2>
            <p>
              Mantemos seus dados pessoais enquanto sua conta estiver ativa ou conforme necessário 
              para fornecer os serviços. Após a exclusão da conta, podemos reter alguns dados 
              conforme exigido por obrigações legais ou para fins de segurança.
            </p>
          </section>

          {/* Children */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              10. Menores de Idade
            </h2>
            <p>O Rynex Cine não é destinado a menores de 18 anos. Não coletamos intencionalmente informações de menores. Se você é responsável por um menor que utilizou o serviço, entre em contato para solicitar a remoção dos dados.</p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              11. Alterações nesta Política
            </h2>
            <p>
              Esta política pode ser atualizada a qualquer momento. As alterações entram em vigor 
              imediatamente após a publicação. Recomendamos que você revise periodicamente para 
              estar ciente de quaisquer mudanças.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              12. Contato
            </h2>
            <p>
              Em caso de dúvidas sobre esta política, solicitações de remoção de dados, 
              ou notificações de direitos autorais (DMCA), entre em contato através da 
              seção de contato disponível no rodapé do site.
            </p>
          </section>

          {/* Related Links */}
          <section className="bg-muted/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              📄 Documentos Relacionados
            </h2>
            <p className="mb-4">
              Consulte também nossos Termos de Uso para entender as regras de utilização:
            </p>
            <Link to="/terms" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium">
              Termos de Uso →
            </Link>
          </section>

          <p className="text-sm text-muted-foreground/70 pt-4 border-t border-border">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </main>

      <Footer />
    </div>;
};
export default PrivacyPolicy;