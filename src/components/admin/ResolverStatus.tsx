import { useEffect, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getLocalResolverBase, testLocalResolver } from '@/utils/localResolver';

export function ResolverStatus() {
  const [status, setStatus] = useState<{ ok: boolean; base: string | null; error: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);

  const check = async () => {
    setChecking(true);
    setStatus(await getLocalResolverBase(true));
    setChecking(false);
  };

  useEffect(() => {
    void check();
  }, []);

  const runTest = async () => {
    if (!testUrl.trim()) return;
    setTesting(true);
    setResult(await testLocalResolver(testUrl.trim()));
    setTesting(false);
  };

  return (
    <div className="premium-card p-5 space-y-4">
      <div className="flex items-center gap-2 font-semibold">
        <Activity className="h-4 w-4 text-primary" /> Diagnóstico do resolvedor
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            checking ? 'bg-muted-foreground' : status?.ok ? 'bg-primary' : 'bg-destructive'
          }`}
        />
        <span>
          {checking
            ? 'Verificando...'
            : status?.ok
              ? `Conectado em ${status.base}`
              : 'Não encontrado no seu PC'}
        </span>
        <Button size="sm" variant="outline" onClick={check} disabled={checking}>
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar conexão'}
        </Button>
      </div>

      {!checking && !status?.ok && status?.error && (
        <p className="text-xs text-destructive break-all">{status.error}</p>
      )}

      {!checking && !status?.ok && (
        <ul className="text-xs text-muted-foreground list-disc ml-5 space-y-1">
          <li>A janela do <b>INICIAR.bat</b> precisa estar aberta neste mesmo PC.</li>
          <li>Desative o <b>bloqueador de anúncios</b> nesta aba (ele bloqueia chamadas ao localhost).</li>
          <li>Abra <b>http://127.0.0.1:8791</b> numa aba: deve aparecer <code>{'{"ok":true}'}</code>.</li>
        </ul>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Testar extração com um link do provedor:</p>
        <div className="flex gap-2">
          <Input
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://redecanais.../server.php?..."
          />
          <Button onClick={runTest} disabled={testing || !testUrl.trim()}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Extrair'}
          </Button>
        </div>
        {result && (
          <p className={`text-xs break-all ${result.ok ? 'text-primary' : 'text-destructive'}`}>
            {result.ok ? `Stream: ${result.detail}` : `Falhou: ${result.detail}`}
          </p>
        )}
      </div>
    </div>
  );
}
