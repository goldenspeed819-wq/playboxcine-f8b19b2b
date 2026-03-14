import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, User, FileText, Shield, Check, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { signIn, signUp, user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (!profile.username || !profile.avatar_url) {
        navigate('/profile-setup');
      } else {
        navigate('/');
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (username.trim().length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.');
      setIsLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      setError('O nome de usuário só pode conter letras, números, pontos, hífens e underscores.');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await signIn(username.trim(), password);
        if (error) {
          if (error.message.includes('Invalid login credentials') || error.message.includes('Usuário não encontrado')) {
            setError('Usuário ou senha incorretos.');
          } else {
            setError(error.message);
          }
        } else {
          toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
          navigate('/');
        }
      } else {
        if (!acceptedTerms) {
          setError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(username.trim(), password);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('Este nome de usuário já está em uso.');
          } else {
            setError(error.message);
          }
        } else {
          toast({ title: 'Conta criada!', description: 'Agora configure seu perfil.' });
          navigate('/profile-setup');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro. Tente novamente.');
    }
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Left decorative panel - hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-primary/8 rounded-full blur-[80px]" />
        
        <div className="relative z-10 max-w-md px-12 space-y-8">
          <div className="flex items-center gap-3">
            <img src={logo} alt="RynexCine" className="h-14 w-14 rounded-2xl object-contain ring-2 ring-primary/30" />
            <div>
              <h1 className="font-display text-5xl tracking-wide">
                <span className="gradient-text">RYNEX</span>
                <span className="text-foreground">CINE</span>
              </h1>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Streaming Premium</h3>
                <p className="text-sm text-muted-foreground mt-1">Milhares de filmes e séries em alta qualidade, sem anúncios.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Experiência Exclusiva</h3>
                <p className="text-sm text-muted-foreground mt-1">Lançamentos, séries completas e conteúdo curado para você.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-foreground">Seguro & Privado</h3>
                <p className="text-sm text-muted-foreground mt-1">Seus dados protegidos, controle parental e perfis seguros.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/4 rounded-full blur-[80px]" />
        </div>

        <div className="w-full max-w-md relative">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center gap-3 mb-4">
              <img src={logo} alt="RynexCine" className="h-12 w-12 rounded-xl object-contain ring-2 ring-primary/30" />
              <h1 className="font-display text-4xl tracking-wide">
                <span className="gradient-text">RYNEX</span>
                <span className="text-foreground">CINE</span>
              </h1>
            </div>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="font-display text-4xl lg:text-5xl tracking-wide mb-2">
              {isLogin ? 'BEM-VINDO' : 'CRIAR CONTA'}
            </h2>
            <p className="text-muted-foreground">
              {isLogin ? 'Entre com seu nome de usuário' : 'Escolha um nome de usuário único'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-6 premium-card space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-heading font-medium">
                  Nome de Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="seu_usuario"
                    className="pl-10 h-12 bg-input border-border/50 focus:border-primary rounded-xl"
                    required
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                  />
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    Letras, números, pontos, hífens e underscores. Mínimo 3 caracteres.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-heading font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 bg-input border-border/50 focus:border-primary rounded-xl"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms */}
            {!isLogin && (
              <div className="p-4 premium-card space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={checked => setAcceptedTerms(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    Li e aceito os{' '}
                    <Link to="/terms" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Termos de Uso
                    </Link>
                    {' '}e a{' '}
                    <Link to="/privacy" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Política de Privacidade
                    </Link>
                  </label>
                </div>
                {acceptedTerms && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--success))' }}>
                    <Check className="w-4 h-4" />
                    Termos aceitos
                  </div>
                )}
              </div>
            )}

            {isLogin && (
              <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground text-center border border-border/30">
                Se você se cadastrou por email, use seu <strong className="text-foreground">nome de usuário</strong> (definido no perfil) para entrar.
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 font-heading font-semibold text-base rounded-xl premium-glow"
              disabled={isLoading || (!isLogin && !acceptedTerms)}
            >
              {isLoading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;