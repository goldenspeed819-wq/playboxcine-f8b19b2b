import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Clock, Film, Tv, Check, Trash2, RefreshCw } from 'lucide-react';

interface ContentRequest {
  id: string;
  query: string;
  title: string;
  content_type: string;
  content_id: string | null;
  tmdb_id: number | null;
  status: string;
  created_at: string;
}

const ContentRequests = () => {
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('content_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setRequests((data || []) as ContentRequest[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const markDone = async (request: ContentRequest) => {
    const { error } = await supabase
      .from('content_requests')
      .update({ status: 'done' })
      .eq('id', request.id);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    if (request.content_id) {
      const table = request.content_type === 'movie' ? 'movies' : 'series';
      await supabase.from(table).update({ pending_content: false }).eq('id', request.content_id);
    }

    toast({ title: 'Pedido concluído', description: request.title });
    fetchRequests();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('content_requests').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    fetchRequests();
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const done = requests.filter((r) => r.status !== 'pending');

  const renderRow = (request: ContentRequest) => {
    const editHref = request.content_id
      ? request.content_type === 'movie'
        ? `/admin/movies/edit/${request.content_id}`
        : `/admin/series/edit/${request.content_id}`
      : null;

    return (
      <div
        key={request.id}
        className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-border bg-card"
      >
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
          {request.content_type === 'movie' ? (
            <Film className="w-4 h-4 text-primary" />
          ) : (
            <Tv className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="font-semibold text-sm">{request.title}</p>
          <p className="text-xs text-muted-foreground">
            Busca: "{request.query}" · {new Date(request.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        {editHref && (
          <Button asChild size="sm" variant="outline">
            <Link to={editHref}>Adicionar conteúdo</Link>
          </Button>
        )}
        {request.status === 'pending' && (
          <Button size="sm" onClick={() => markDone(request)} className="gap-1">
            <Check className="w-3.5 h-3.5" />
            Concluir
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => remove(request.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Pedidos de Conteúdo
          </h1>
          <p className="text-sm text-muted-foreground">
            Títulos adicionados automaticamente pelo TMDB quando alguém pesquisou e não encontrou.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Aguardando conteúdo ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
            ) : (
              pending.map(renderRow)
            )}
          </section>

          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Concluídos ({done.length})
              </h2>
              {done.map(renderRow)}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default ContentRequests;
