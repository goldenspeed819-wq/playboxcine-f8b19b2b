import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
const TermsOfUse = () => {
  return <div className="min-h-screen bg-background">
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

          {/* DMCA Disclaimer */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-destructive mb-3">
              ⚖️ Aviso Legal - DMCA e Direitos Autorais
            </h2>
            <p className="text-foreground font-medium mb-3">O Rynex Cine é uma plataforma de indexação e organização de links. NÃO hospedamos, armazenamos ou distribuímos nenhum conteúdo audiovisual protegido por direitos autorais em nossos servidores.<strong> NÃO hospedamos, armazenamos ou distribuímos nenhum conteúdo audiovisual protegido por direitos autorais em nossos servidores.</strong>
            </p>
            <p className="text-foreground">Todo o conteúdo exibido é proveniente de fontes externas de terceiros, disponíveis publicamente na internet. A Rynex Cine atua apenas como um agregador de links, similar a um motor de busca.</p>
          </div>

          {/* Acceptance */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar e usar o Rynex Cine, você concorda em cumprir e estar sujeito a estes Termos de Uso. Estes termos se aplicam a todos os visitantes, usuários e outras pessoas que acessam ou usam o serviço. O uso contínuo da plataforma constitui aceitação integral destes termos.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              2. Natureza do Serviço
            </h2>
            <p className="mb-3">
              O PlayBox Cine é um <strong>serviço de indexação e curadoria de links</strong> que organiza 
              referências a conteúdos disponíveis em servidores de terceiros na internet pública.
            </p>
            <p className="mb-3">
              <strong>O que NÃO fazemos:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Não hospedamos, armazenamos ou fazemos upload de arquivos de vídeo</li>
              <li>Não distribuímos conteúdo protegido por direitos autorais</li>
              <li>Não fazemos streaming direto de nenhum conteúdo</li>
              <li>Não possuímos controle sobre o conteúdo de terceiros</li>
            </ul>
            <p className="mt-3">
              <strong>O que fazemos:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Organizamos e indexamos links disponíveis publicamente</li>
              <li>Fornecemos uma interface para navegação e descoberta</li>
              <li>Permitimos que usuários salvem preferências e histórico</li>
            </ul>
          </section>

          {/* User Responsibility */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Responsabilidade do Usuário
            </h2>
            <p className="mb-3">Ao utilizar o Rynex Cine, você reconhece e concorda que:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>É o único responsável por verificar a legalidade do acesso ao conteúdo em sua jurisdição</li>
              <li>Deve respeitar as leis de direitos autorais aplicáveis em seu país</li>
              <li>O acesso a conteúdos protegidos sem autorização pode ser ilegal em algumas jurisdições</li>
              <li>Assume total responsabilidade pelo uso que faz da plataforma</li>
              <li>Não utilizará o serviço para fins ilegais ou não autorizados</li>
            </ul>
          </section>

          {/* DMCA Compliance */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Conformidade com DMCA
            </h2>
            <p className="mb-3">O Rynex Cine respeita os direitos de propriedade intelectual e está comprometido com a conformidade com o Digital Millennium Copyright Act (DMCA) e legislações similares.</p>
            <p className="mb-3">
              <strong>Procedimento de Notificação:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Se você é detentor de direitos autorais ou seu representante legal</li>
              <li>E acredita que algum link indexado viola seus direitos</li>
              <li>Entre em contato conosco através dos canais disponíveis</li>
              <li>Fornecendo: identificação do material, prova de titularidade e dados de contato</li>
            </ul>
            <p className="mt-3">
              Após verificação, removeremos prontamente qualquer link que viole direitos de terceiros.
            </p>
          </section>

          {/* Account */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Conta do Usuário
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
              6. Uso Proibido
            </h2>
            <p>
              É estritamente proibido:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Compartilhar sua conta com terceiros não autorizados</li>
              <li>Tentar acessar áreas restritas do sistema</li>
              <li>Usar bots, scripts ou automações não autorizadas</li>
              <li>Redistribuir ou comercializar o serviço</li>
              <li>Fazer download ou redistribuir conteúdo de terceiros</li>
              <li>Utilizar o serviço para fins comerciais sem autorização</li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              7. Isenção de Responsabilidade
            </h2>
            <p className="mb-3">AVISO IMPORTANTE: O Rynex Cine é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas.<strong>AVISO IMPORTANTE:</strong> O PlayBox Cine é fornecido "como está" e "conforme disponível", 
              sem garantias de qualquer tipo, expressas ou implícitas.
            </p>
            <p className="mb-3">O Rynex Cine NÃO se responsabiliza por:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Conteúdo hospedado em servidores de terceiros</li>
              <li>Qualidade, disponibilidade ou legalidade dos links indexados</li>
              <li>Ações tomadas por usuários com base no conteúdo acessado</li>
              <li>Violações de direitos autorais cometidas por terceiros</li>
              <li>Danos diretos, indiretos, incidentais ou consequenciais</li>
              <li>Interrupções, erros ou falhas no serviço</li>
              <li>Perda de dados ou informações do usuário</li>
            </ul>
          </section>

          {/* Third Party Content */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              8. Conteúdo de Terceiros
            </h2>
            <p className="mb-3">Todo o conteúdo audiovisual acessível através do Rynex Cine é hospedado e fornecido por servidores de terceiros não afiliados a nós.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Não temos controle sobre esses servidores ou seu conteúdo</li>
              <li>Não verificamos a legalidade do conteúdo de terceiros</li>
              <li>A responsabilidade pelo conteúdo é exclusivamente dos provedores originais</li>
              <li>Links podem ser removidos ou modificados a qualquer momento</li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              9. Limitação de Responsabilidade
            </h2>
            <p>Em nenhuma circunstância o Rynex Cine, seus proprietários, funcionários ou afiliados serão responsáveis por quaisquer danos, incluindo, mas não limitados a, danos por perda de lucros, dados ou outras perdas intangíveis resultantes do uso ou impossibilidade de uso do serviço.</p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              10. Indenização
            </h2>
            <p>Você concorda em defender, indenizar e isentar o Rynex Cine de quaisquer reclamações, danos, custos e despesas (incluindo honorários advocatícios) decorrentes ou relacionados ao seu uso do serviço, violação destes Termos ou violação de qualquer lei ou direitos de terceiros.</p>
          </section>

          {/* Account Termination */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              11. Encerramento de Conta
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
              12. Alterações nos Termos
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
              13. Lei Aplicável e Jurisdição
            </h2>
            <p>
              Estes termos são regidos pelas leis aplicáveis na jurisdição onde o serviço opera. 
              Qualquer disputa será resolvida nos tribunais competentes da jurisdição aplicável.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              14. Divisibilidade
            </h2>
            <p>
              Se qualquer disposição destes Termos for considerada inválida ou inexequível, 
              as demais disposições permanecerão em pleno vigor e efeito.
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
            <Link to="/privacy" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium">
              Política de Privacidade →
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
export default TermsOfUse;