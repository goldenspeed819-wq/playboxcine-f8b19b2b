import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Film,
  Tv,
  MessageSquare,
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Dashboard = () => {
  const [stats, setStats] = useState({
    movies: 0,
    series: 0,
    episodes: 0,
    comments: 0,
  });
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [recentSeries, setRecentSeries] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, []);

  const fetchStats = async () => {
    const [moviesRes, seriesRes, episodesRes, commentsRes] = await Promise.all([
      supabase.from('movies').select('id', { count: 'exact', head: true }),
      supabase.from('series').select('id', { count: 'exact', head: true }),
      supabase.from('episodes').select('id', { count: 'exact', head: true }),
      supabase.from('comments').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      movies: moviesRes.count || 0,
      series: seriesRes.count || 0,
      episodes: episodesRes.count || 0,
      comments: commentsRes.count || 0,
    });
  };

  const fetchRecent = async () => {
    const [moviesRes, seriesRes] = await Promise.all([
      supabase
        .from('movies')
        .select('id, title, thumbnail, created_at')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('series')
        .select('id, title, thumbnail, created_at')
        .order('created_at', { ascending: false })
        .limit(4),
    ]);

    setRecentMovies(moviesRes.data || []);
    setRecentSeries(seriesRes.data || []);
  };

  const statCards = [
    {
      icon: Film,
      label: 'Filmes',
      value: stats.movies,
      gradient: 'from-orange-500 to-red-500',
      shadowColor: 'shadow-orange-500/20',
    },
    {
      icon: Tv,
      label: 'Séries',
      value: stats.series,
      gradient: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      icon: TrendingUp,
      label: 'Episódios',
      value: stats.episodes,
      gradient: 'from-green-500 to-emerald-500',
      shadowColor: 'shadow-green-500/20',
    },
    {
      icon: MessageSquare,
      label: 'Comentários',
      value: stats.comments,
      gradient: 'from-purple-500 to-pink-500',
      shadowColor: 'shadow-purple-500/20',
    },
  ];

  const quickActions = [
    {
      icon: Film,
      label: 'Novo Filme',
      href: '/admin/movies/add',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 hover:bg-orange-500/20',
    },
    {
      icon: Tv,
      label: 'Nova Série',
      href: '/admin/series/add',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    },
  ];

  const tips = [
    {
      icon: Zap,
      title: 'Upload Otimizado',
      description: 'Suporte a arquivos de até 100GB com upload resumível.',
    },
    {
      icon: Sparkles,
      title: 'Conversão Automática',
      description: 'MKV e TS são convertidos automaticamente para MP4.',
    },
    {
      icon: Shield,
      title: 'Realtime',
      description: 'Comentários atualizados em tempo real.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">Bem-vindo ao painel de administração</p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.href}
                asChild
                variant="outline"
                className={cn(
                  'gap-2 border-white/10 bg-white/5 hover:bg-white/10',
                  action.color
                )}
              >
                <Link to={action.href}>
                  <Plus className="w-4 h-4" />
                  {action.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn(
                'relative overflow-hidden p-5 bg-[#16161f] rounded-2xl border border-white/5',
                'hover:border-white/10 transition-all duration-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20',
                  `bg-gradient-to-br ${stat.gradient}`
                )}
              />
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center mb-4',
                  `bg-gradient-to-br ${stat.gradient}`,
                  stat.shadowColor,
                  'shadow-lg'
                )}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-white/50 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Movies */}
        <div className="bg-[#16161f] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-orange-400" />
              Filmes Recentes
            </h2>
            <Link
              to="/admin/movies"
              className="text-sm text-white/50 hover:text-primary flex items-center gap-1 transition-colors"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {recentMovies.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">
                Nenhum filme adicionado ainda
              </div>
            ) : (
              <div className="space-y-2">
                {recentMovies.map((movie) => (
                  <Link
                    key={movie.id}
                    to={`/admin/movies/edit/${movie.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {movie.thumbnail ? (
                        <img
                          src={movie.thumbnail}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">
                        {movie.title}
                      </p>
                      <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(movie.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Series */}
        <div className="bg-[#16161f] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Tv className="w-4 h-4 text-blue-400" />
              Séries Recentes
            </h2>
            <Link
              to="/admin/series"
              className="text-sm text-white/50 hover:text-primary flex items-center gap-1 transition-colors"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {recentSeries.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">
                Nenhuma série adicionada ainda
              </div>
            ) : (
              <div className="space-y-2">
                {recentSeries.map((series) => (
                  <Link
                    key={series.id}
                    to={`/admin/series/edit/${series.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {series.thumbnail ? (
                        <img
                          src={series.thumbnail}
                          alt={series.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tv className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">
                        {series.title}
                      </p>
                      <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(series.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Dicas Rápidas
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.title}
                className="flex items-start gap-3 p-3 rounded-xl bg-black/20"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{tip.title}</p>
                  <p className="text-xs text-white/50 mt-0.5">{tip.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
