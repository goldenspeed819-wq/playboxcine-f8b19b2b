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
  Users,
  Eye,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    movies: 0,
    series: 0,
    episodes: 0,
    comments: 0,
    users: 0,
    watchedMovies: 0,
    watchedEpisodes: 0,
  });
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [recentSeries, setRecentSeries] = useState<any[]>([]);
  const [topMovies, setTopMovies] = useState<any[]>([]);
  const [topSeries, setTopSeries] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecent();
    fetchTopContent();
    fetchRecentActivity();
    fetchCategoryStats();
  }, []);

  const fetchStats = async () => {
    const [moviesRes, seriesRes, episodesRes, commentsRes, usersRes, watchedMoviesRes, watchedEpisodesRes] =
      await Promise.all([
        supabase.from('movies').select('id', { count: 'exact', head: true }),
        supabase.from('series').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('watched_movies').select('id', { count: 'exact', head: true }),
        supabase.from('watched_episodes').select('id', { count: 'exact', head: true }),
      ]);

    setStats({
      movies: moviesRes.count || 0,
      series: seriesRes.count || 0,
      episodes: episodesRes.count || 0,
      comments: commentsRes.count || 0,
      users: usersRes.count || 0,
      watchedMovies: watchedMoviesRes.count || 0,
      watchedEpisodes: watchedEpisodesRes.count || 0,
    });
  };

  const fetchRecent = async () => {
    const [moviesRes, seriesRes] = await Promise.all([
      supabase.from('movies').select('id, title, thumbnail, created_at').order('created_at', { ascending: false }).limit(4),
      supabase.from('series').select('id, title, thumbnail, created_at').order('created_at', { ascending: false }).limit(4),
    ]);

    setRecentMovies(moviesRes.data || []);
    setRecentSeries(seriesRes.data || []);
  };

  const fetchTopContent = async () => {
    // Get most watched movies
    const { data: watchedMoviesData } = await supabase
      .from('watched_movies')
      .select('movie_id, movies(id, title, thumbnail)')
      .limit(100);

    // Count views per movie
    const movieCounts: Record<string, { count: number; movie: any }> = {};
    watchedMoviesData?.forEach((item: any) => {
      if (item.movies) {
        const id = item.movies.id;
        if (!movieCounts[id]) {
          movieCounts[id] = { count: 0, movie: item.movies };
        }
        movieCounts[id].count++;
      }
    });

    const sortedMovies = Object.values(movieCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({ ...item.movie, views: item.count }));

    setTopMovies(sortedMovies);

    // Get most watched series
    const { data: watchedEpisodesData } = await supabase
      .from('watched_episodes')
      .select('episode_id, episodes(id, series_id, series(id, title, thumbnail))')
      .limit(200);

    // Count views per series
    const seriesCounts: Record<string, { count: number; series: any }> = {};
    watchedEpisodesData?.forEach((item: any) => {
      if (item.episodes?.series) {
        const id = item.episodes.series.id;
        if (!seriesCounts[id]) {
          seriesCounts[id] = { count: 0, series: item.episodes.series };
        }
        seriesCounts[id].count++;
      }
    });

    const sortedSeries = Object.values(seriesCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item) => ({ ...item.series, views: item.count }));

    setTopSeries(sortedSeries);
  };

  const fetchRecentActivity = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentActivity(profiles || []);
  };

  const fetchCategoryStats = async () => {
    const { data: movies } = await supabase.from('movies').select('category');

    const categoryCounts: Record<string, number> = {};
    movies?.forEach((movie) => {
      const cat = movie.category || 'Sem categoria';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const data = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    setCategoryData(data);
  };

  const statCards = [
    { icon: Users, label: 'Usuários', value: stats.users, gradient: 'from-violet-500 to-purple-500', shadowColor: 'shadow-violet-500/20' },
    { icon: Film, label: 'Filmes', value: stats.movies, gradient: 'from-orange-500 to-red-500', shadowColor: 'shadow-orange-500/20' },
    { icon: Tv, label: 'Séries', value: stats.series, gradient: 'from-blue-500 to-cyan-500', shadowColor: 'shadow-blue-500/20' },
    { icon: TrendingUp, label: 'Episódios', value: stats.episodes, gradient: 'from-green-500 to-emerald-500', shadowColor: 'shadow-green-500/20' },
    { icon: Eye, label: 'Visualizações', value: stats.watchedMovies + stats.watchedEpisodes, gradient: 'from-pink-500 to-rose-500', shadowColor: 'shadow-pink-500/20' },
    { icon: MessageSquare, label: 'Comentários', value: stats.comments, gradient: 'from-yellow-500 to-amber-500', shadowColor: 'shadow-yellow-500/20' },
  ];

  const quickActions = [
    { icon: Film, label: 'Novo Filme', href: '/admin/movies/add', color: 'text-orange-400', bg: 'bg-orange-500/10 hover:bg-orange-500/20' },
    { icon: Tv, label: 'Nova Série', href: '/admin/series/add', color: 'text-blue-400', bg: 'bg-blue-500/10 hover:bg-blue-500/20' },
  ];

  const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">Visão geral da plataforma</p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.href} asChild variant="outline" className={cn('gap-2 border-white/10 bg-white/5 hover:bg-white/10', action.color)}>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('relative overflow-hidden p-4 bg-[#16161f] rounded-2xl border border-white/5', 'hover:border-white/10 transition-all duration-300')}>
              <div className={cn('absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-20', `bg-gradient-to-br ${stat.gradient}`)} />
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', `bg-gradient-to-br ${stat.gradient}`, stat.shadowColor, 'shadow-lg')}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-white/50 text-xs">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-0.5">{stat.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Movies Chart */}
        <div className="bg-[#16161f] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            <h2 className="font-semibold text-white">Filmes Mais Assistidos</h2>
          </div>
          {topMovies.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topMovies} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <YAxis dataKey="title" type="category" width={120} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'white' }} itemStyle={{ color: 'hsl(var(--primary))' }} />
                <Bar dataKey="views" fill="url(#orangeGradient)" radius={[0, 4, 4, 0]} />
                <defs>
                  <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-white/40">Sem dados de visualização</div>
          )}
        </div>

        {/* Categories Pie Chart */}
        <div className="bg-[#16161f] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-white">Filmes por Categoria</h2>
          </div>
          {categoryData.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <RechartsPieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((cat, index) => (
                  <div key={cat.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-white/70 flex-1 truncate">{cat.name}</span>
                    <span className="text-white font-semibold">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-white/40">Sem dados de categoria</div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Movies */}
        <div className="bg-[#16161f] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-orange-400" />
              Filmes Recentes
            </h2>
            <Link to="/admin/movies" className="text-sm text-white/50 hover:text-primary flex items-center gap-1 transition-colors">
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {recentMovies.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">Nenhum filme adicionado ainda</div>
            ) : (
              <div className="space-y-2">
                {recentMovies.map((movie) => (
                  <Link key={movie.id} to={`/admin/movies/edit/${movie.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {movie.thumbnail ? <img src={movie.thumbnail} alt={movie.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-white/20" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">{movie.title}</p>
                      <p className="text-xs text-white/40 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{new Date(movie.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
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
            <Link to="/admin/series" className="text-sm text-white/50 hover:text-primary flex items-center gap-1 transition-colors">
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {recentSeries.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">Nenhuma série adicionada ainda</div>
            ) : (
              <div className="space-y-2">
                {recentSeries.map((series) => (
                  <Link key={series.id} to={`/admin/series/edit/${series.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {series.thumbnail ? <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Tv className="w-4 h-4 text-white/20" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">{series.title}</p>
                      <p className="text-xs text-white/40 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{new Date(series.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-[#16161f] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              Novos Usuários
            </h2>
          </div>
          <div className="p-3">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-white/40 text-sm">Nenhum usuário ainda</div>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 shrink-0">
                      {user.avatar_url ? <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Users className="w-4 h-4 text-white/20" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.username || 'Usuário'}</p>
                      <p className="text-xs text-white/40 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{new Date(user.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Series */}
      {topSeries.length > 0 && (
        <div className="bg-[#16161f] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-white">Séries Mais Assistidas</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topSeries.map((series, index) => (
              <Link key={series.id} to={`/admin/series/edit/${series.id}`} className="group text-center">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 mb-2">
                  {series.thumbnail ? <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><Tv className="w-8 h-8 text-white/20" /></div>}
                  <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white">{index + 1}</div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-xs font-semibold text-white">{series.views} views</div>
                </div>
                <p className="text-sm text-white/80 truncate group-hover:text-primary transition-colors">{series.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Dicas Rápidas
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Zap, title: 'Upload Otimizado', description: 'Suporte a arquivos de até 100GB com upload resumível.' },
            { icon: Sparkles, title: 'Conversão Automática', description: 'MKV e TS são convertidos automaticamente para MP4.' },
            { icon: Shield, title: 'Realtime', description: 'Comentários atualizados em tempo real.' },
          ].map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.title} className="flex items-start gap-3 p-3 rounded-xl bg-black/20">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                <div><p className="text-sm font-medium text-white">{tip.title}</p><p className="text-xs text-white/50 mt-0.5">{tip.description}</p></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
