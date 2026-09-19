import { Clock, Film } from 'lucide-react';

interface PendingContentNoticeProps {
  title: string;
  type: 'movie' | 'series';
  poster?: string | null;
}

export function PendingContentNotice({ title, type, poster }: PendingContentNoticeProps) {
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-card">
      {poster && (
        <img
          src={poster}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm"
        />
      )}
      <div className="relative h-full flex flex-col items-center justify-center text-center px-6 gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
          <Clock className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-display text-lg sm:text-2xl font-bold">
          {type === 'movie' ? 'Filme' : 'Série'} sem conteúdo por enquanto
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Adicionamos <span className="text-foreground font-semibold">{title}</span> ao catálogo
          automaticamente. A reprodução fica disponível assim que um administrador enviar
          {type === 'movie' ? ' o vídeo' : ' os episódios'}.
        </p>
        <span className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
          <Film className="w-3.5 h-3.5" />
          Aguardando envio do conteúdo
        </span>
      </div>
    </div>
  );
}
