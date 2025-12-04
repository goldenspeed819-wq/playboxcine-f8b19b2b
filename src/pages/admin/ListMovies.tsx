import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Film, Edit, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Movie } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const DELETE_PASSWORD = '*****';

const ListMovies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching movies:', error);
    } else {
      setMovies(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (deletePassword !== DELETE_PASSWORD) {
      toast({
        title: 'Senha incorreta',
        description: 'A senha de exclusão está incorreta.',
        variant: 'destructive',
      });
      return;
    }

    if (!deleteId) return;

    setIsDeleting(true);
    const { error } = await supabase.from('movies').delete().eq('id', deleteId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o filme.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Filme excluído com sucesso.',
      });
      setMovies(movies.filter((m) => m.id !== deleteId));
    }

    setDeleteId(null);
    setDeletePassword('');
    setIsDeleting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Film className="w-8 h-8 text-primary" />
            Filmes
          </h1>
          <p className="text-muted-foreground">
            {movies.length} filme(s) cadastrado(s)
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/admin/movies/add">
            <Plus className="w-4 h-4" />
            Adicionar
          </Link>
        </Button>
      </div>

      {/* Movies List */}
      {movies.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl text-muted-foreground mb-2">
            Nenhum filme cadastrado
          </h2>
          <p className="text-muted-foreground mb-4">
            Comece adicionando seu primeiro filme
          </p>
          <Button asChild>
            <Link to="/admin/movies/add">Adicionar Filme</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
            >
              {/* Thumbnail */}
              <div className="w-16 h-24 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                {movie.thumbnail ? (
                  <img
                    src={movie.thumbnail}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{movie.title}</h3>
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                  {movie.category && <span>{movie.category}</span>}
                  {movie.release_year && <span>• {movie.release_year}</span>}
                  {movie.duration && <span>• {movie.duration}</span>}
                </div>
                {movie.is_featured && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                    Destaque
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button asChild variant="outline" size="icon">
                  <Link to={`/admin/movies/edit/${movie.id}`}>
                    <Edit className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeleteId(movie.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Digite a senha de exclusão para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Senha de exclusão"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="bg-secondary/50"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePassword('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ListMovies;
