import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, User, FileText, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const {
    signIn,
    signUp,
    user,
    profile,
    isLoading: authLoading
  } = useAuth();
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

    // Validate username format
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
          toast({
            title: 'Bem-vindo!',
            description: 'Login realizado com sucesso.'
          });
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
          toast({
            title: 'Conta criada!',
            description: 'Agora configure seu perfil.'
          });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center neon-glow">
              <span className="font-display font-bold text-xl text-primary-foreground">Rc</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-xl">
                <span className="text-primary">Ryn</span>
                <span className="text-foreground">ex</span>
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Cine</p>
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isLogin ? 'Entre com seu nome de usuário' : 'Escolha um nome de usuário único'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">
                Nome de Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="seu_usuario"
                  className="pl-10 bg-secondary/50 border-border focus:border-primary"
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
              <Label htmlFor="password" className="text-sm font-semibold">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-secondary/50 border-border focus:border-primary"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms and Privacy for signup */}
          {!isLogin && (
            <div className="p-4 bg-card rounded-xl border border-border space-y-3">
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
                <div className="flex items-center gap-2 text-green-500 text-sm">
                  <Check className="w-4 h-4" />
                  Termos aceitos
                </div>
              )}
            </div>
          )}

          {isLogin && (
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground text-center">
              Se você se cadastrou por email, use seu <strong>nome de usuário</strong> (definido no perfil) para entrar.
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 font-semibold neon-glow"
            disabled={isLoading || (!isLogin && !acceptedTerms)}
          >
            {isLoading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </Button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <a href="/browse" className="hover:text-primary transition-colors">
                ← Voltar ao site
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;