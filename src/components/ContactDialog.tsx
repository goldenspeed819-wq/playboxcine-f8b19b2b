import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const contacts: { name: string; icon: JSX.Element; url: string; color: string }[] = [];

export function ContactDialog() {
  if (contacts.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-primary transition-colors text-sm text-left">
          Contato
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entre em Contato</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          {contacts.map((contact) => (
            <a
              key={contact.name}
              href={contact.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium transition-all ${contact.color}`}
            >
              {contact.icon}
              <span>{contact.name}</span>
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}