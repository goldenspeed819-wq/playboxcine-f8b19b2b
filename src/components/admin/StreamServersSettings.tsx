import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { parseServers, STREAM_SERVERS_KEY, type StreamServer } from '@/hooks/useStreamServers';

export function StreamServersSettings() {
  const [servers, setServers] = useState<StreamServer[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', STREAM_SERVERS_KEY).maybeSingle()
      .then(({ data }) => setServers(parseServers(data?.value)));
  }, []);

  const update = (i: number, patch: Partial<StreamServer>) =>
    setServers((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setSaving(true);
    const value = JSON.stringify(servers.filter((s) => s.name.trim()));
    const { data: existing } = await supabase.from('site_settings').select('id').eq('key', STREAM_SERVERS_KEY).maybeSingle();
    const { error } = existing
      ? await supabase.from('site_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', STREAM_SERVERS_KEY)
      : await supabase.from('site_settings').insert({ key: STREAM_SERVERS_KEY, value });
    setSaving(false);
    toast(error ? { title: 'Erro ao salvar', description: error.message, variant: 'destructive' } : { title: 'Servidores salvos' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Servidores de reprodução</CardTitle>
        <CardDescription>
          Players buscados na hora pelo ID do título. Use <code>{'{imdb}'}</code>, <code>{'{tmdb}'}</code>,{' '}
          <code>{'{season}'}</code> e <code>{'{episode}'}</code> no endereço.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {servers.map((s, i) => (
          <div key={i} className="grid gap-2 border border-border rounded-lg p-3">
            <div className="flex gap-2">
              <Input placeholder="Nome (ex.: Servidor 1)" value={s.name} onChange={(e) => update(i, { name: e.target.value })} />
              <Button variant="ghost" size="icon" onClick={() => setServers((x) => x.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input placeholder="Filmes: https://.../embed/movie/{imdb}" value={s.movie} onChange={(e) => update(i, { movie: e.target.value })} />
            <Input placeholder="Séries: https://.../embed/tv/{imdb}/{season}/{episode}" value={s.tv} onChange={(e) => update(i, { tv: e.target.value })} />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setServers((s) => [...s, { name: `Servidor ${s.length + 1}`, movie: '', tv: '' }])}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
