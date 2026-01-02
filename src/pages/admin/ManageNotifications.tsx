import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Bell, Plus, Trash2, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  expires_at: string | null;
}

const ManageNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [expiresHours, setExpiresHours] = useState('24');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }

    if (!user) return;

    setSending(true);

    const expiresAt = expiresHours 
      ? new Date(Date.now() + parseInt(expiresHours) * 60 * 60 * 1000).toISOString()
      : null;

    const { error } = await supabase
      .from('admin_notifications')
      .insert({
        title: title.trim(),
        message: message.trim(),
        created_by: user.id,
        expires_at: expiresAt,
      });

    if (error) {
      toast.error('Erro ao enviar notificação');
      console.error(error);
    } else {
      toast.success('Notificação enviada para todos os usuários!');
      setTitle('');
      setMessage('');
      fetchNotifications();
    }

    setSending(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação removida');
    } else {
      toast.error('Erro ao remover notificação');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Notificações</h1>
          <p className="text-muted-foreground text-sm">
            Envie notificações para todos os usuários
          </p>
        </div>
      </div>

      {/* Create Notification */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Nova Notificação
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Nova atualização disponível!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite a mensagem que será exibida para os usuários..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expirar após (horas)</Label>
            <Input
              id="expires"
              type="number"
              placeholder="24"
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
              min="1"
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para não expirar automaticamente
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg mb-6">
          Notificações Enviadas
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma notificação enviada ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 bg-secondary/50 rounded-xl border border-border/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1">{notif.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Enviado: {formatDate(notif.created_at)}
                      </span>
                      {notif.expires_at && (
                        <span className="text-yellow-500">
                          Expira: {formatDate(notif.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Notificação</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover esta notificação?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(notif.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageNotifications;
