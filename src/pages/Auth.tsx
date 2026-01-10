import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, FileText, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [switchingAccount, setSwitchingAccount] = useState(false);
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
    // Check if we're switching accounts
    const switchToEmail = localStorage.getItem('switchToEmail');
    if (switchToEmail) {
      setEmail(switchToEmail);
      setSwitchingAccount(true);
      localStorage.removeItem('switchToEmail');
    }
  }, []);
  useEffect(() => {
    if (!authLoading && user && profile) {
      // Check if profile is complete (has username and avatar)
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
    try {
      if (isLogin) {
        const {
          error
        } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email ou senha incorretos.');
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
        // Check if terms are accepted for signup
        if (!acceptedTerms) {
          setError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
          setIsLoading(false);
          return;
        }
        const {
          error
        } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('Este email já está cadastrado.');
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
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            {isLogin ? 'Entre com suas credenciais para acessar' : 'Preencha os dados para criar sua conta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 bg-card rounded-2xl border border-border space-y-4">
            {switchingAccount && <div className="p-3 bg-primary/10 border border-primary/50 rounded-lg text-primary text-sm">
                Trocando para conta: <strong>{email}</strong>
              </div>}

            {error && <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10 bg-secondary/50 border-border focus:border-primary" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10 bg-secondary/50 border-border focus:border-primary" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms and Privacy for signup */}
          {!isLogin && <div className="p-4 bg-card rounded-xl border border-border space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={checked => setAcceptedTerms(checked as boolean)} className="mt-1" />
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
              
              {acceptedTerms && <div className="flex items-center gap-2 text-green-500 text-sm">
                  <Check className="w-4 h-4" />
                  Termos aceitos
                </div>}
            </div>}

          <Button type="submit" className="w-full h-12 font-semibold neon-glow" disabled={isLoading || !isLogin && !acceptedTerms}>
            {isLoading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </Button>

          <div className="text-center space-y-2">
            <button type="button" onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }} className="text-sm text-muted-foreground hover:text-primary transition-colors">
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
    </div>;
};
export default Auth;