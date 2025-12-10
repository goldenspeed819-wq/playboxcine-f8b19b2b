import { useState, useEffect } from 'react';
import { Send, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Comment } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CommentSectionProps {
  movieId?: string;
  episodeId?: string;
}

const ADMIN_USER = 'User001';

export function CommentSection({ movieId, episodeId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [userName, setUserName] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();

    // Subscribe to realtime comments (INSERT and DELETE)
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          const newComment = payload.new as Comment;
          if (
            (movieId && newComment.movie_id === movieId) ||
            (episodeId && newComment.episode_id === episodeId)
          ) {
            setComments((prev) => [newComment, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          const deletedComment = payload.old as Comment;
          setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [movieId, episodeId]);

  const fetchComments = async () => {
    let query = supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (movieId) {
      query = query.eq('movie_id', movieId);
    } else if (episodeId) {
      query = query.eq('episode_id', episodeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }
    setComments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    const { error } = await supabase.from('comments').insert({
      movie_id: movieId || null,
      episode_id: episodeId || null,
      user_name: userName.trim() || 'Anônimo',
      text: text.trim(),
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o comentário.',
        variant: 'destructive',
      });
    } else {
      setText('');
      toast({
        title: 'Sucesso',
        description: 'Comentário enviado!',
      });
    }
    setIsLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o comentário.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Comentário excluído!',
      });
      // Remove from local state immediately
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
    
    setDeletingId(null);
  };

  const isAdmin = userName.trim().toLowerCase() === ADMIN_USER.toLowerCase();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="font-display text-xl font-bold flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-full" />
        Comentários ({comments.length})
      </h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Seu nome (opcional)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="bg-secondary/50 border-border focus:border-primary"
        />
        <Textarea
          placeholder="Escreva seu comentário..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bg-secondary/50 border-border focus:border-primary min-h-24 resize-none"
        />
        <Button type="submit" disabled={isLoading || !text.trim()} className="gap-2">
          <Send className="w-4 h-4" />
          Enviar Comentário
        </Button>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment, index) => (
            <div
              key={comment.id}
              className={cn(
                'p-4 bg-card rounded-xl border border-border opacity-0 animate-fade-in',
                `stagger-${Math.min(index % 5 + 1, 5)}`
              )}
              style={{ animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">
                      {comment.user_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{comment.text}</p>
                </div>
                {/* Delete button - only visible for User001 */}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    title="Excluir comentário"
                  >
                    <Trash2 className={cn("w-4 h-4", deletingId === comment.id && "animate-pulse")} />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
