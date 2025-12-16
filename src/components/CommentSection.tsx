import { useState, useEffect } from 'react';
import { Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Comment {
  id: string;
  movie_id: string | null;
  episode_id: string | null;
  user_name: string;
  user_id: string | null;
  user_avatar: string | null;
  text: string;
  created_at: string;
}

interface CommentSectionProps {
  movieId?: string;
  episodeId?: string;
}

export function CommentSection({ movieId, episodeId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchComments();
    
    // Subscribe to realtime comments
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
    if (!text.trim() || !user) return;

    setIsLoading(true);
    const { error } = await supabase.from('comments').insert({
      movie_id: movieId || null,
      episode_id: episodeId || null,
      user_id: user.id,
      user_name: profile?.username || 'Usuário',
      user_avatar: profile?.avatar_url || null,
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
        <div className="flex items-start gap-3">
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.username || 'Avatar'} 
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2">{profile?.username || 'Usuário'}</p>
            <Textarea
              placeholder="Escreva seu comentário..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-secondary/50 border-border focus:border-primary min-h-20 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading || !text.trim()} className="gap-2">
            <Send className="w-4 h-4" />
            Enviar
          </Button>
        </div>
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
                {comment.user_avatar ? (
                  <img 
                    src={comment.user_avatar} 
                    alt={comment.user_name} 
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
