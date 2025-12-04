import { useState, useEffect } from 'react';
import { Film, Tv, MessageSquare, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [stats, setStats] = useState({
    movies: 0,
    series: 0,
    episodes: 0,
    comments: 0,
  });

  useEffect(() => {
    fetchStats();
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

  const statCards = [
    {
      icon: Film,
      label: 'Total de Filmes',
      value: stats.movies,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Tv,
      label: 'Total de Séries',
      value: stats.series,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Total de Episódios',
      value: stats.episodes,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      icon: MessageSquare,
      label: 'Total de Comentários',
      value: stats.comments,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu conteúdo
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-6 bg-card rounded-2xl border border-border"
            >
              <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
              <p className="font-display text-3xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Info */}
      <div className="p-6 bg-card rounded-2xl border border-border">
        <h2 className="font-display text-lg font-bold mb-4">Informações Rápidas</h2>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            <span className="text-foreground font-semibold">Storage:</span> O upload de vídeos é feito diretamente para o Lovable Cloud Storage, suportando arquivos de até 100GB.
          </p>
          <p className="text-muted-foreground">
            <span className="text-foreground font-semibold">Legendas:</span> O player suporta legendas nos formatos SRT e VTT. Você pode carregar legendas externas na página do filme/episódio.
          </p>
          <p className="text-muted-foreground">
            <span className="text-foreground font-semibold">Realtime:</span> Comentários são atualizados em tempo real sem necessidade de recarregar a página.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
