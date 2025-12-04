import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'border-2 border-primary/20 border-t-primary rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4 mx-auto animate-pulse">
          <span className="font-display font-bold text-2xl text-primary-foreground">P</span>
        </div>
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground mt-4 font-body">Carregando...</p>
      </div>
    </div>
  );
}
