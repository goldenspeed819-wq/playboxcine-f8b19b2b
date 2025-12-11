import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Check, ChevronLeft, ChevronRight } from "lucide-react";

// Avatares de personagens com imagens funcionais
const avatarCategories = [
  {
    title: "STRANGER THINGS",
    avatars: [
      { url: "https://i.imgur.com/8vYHVqL.png", name: "Eleven" },
      { url: "https://i.imgur.com/JqR3Y8N.png", name: "Mike" },
      { url: "https://i.imgur.com/KpM2L7Q.png", name: "Dustin" },
      { url: "https://i.imgur.com/Xm0N6Kp.png", name: "Lucas" },
      { url: "https://i.imgur.com/Wq9M5Lt.png", name: "Max" },
      { url: "https://i.imgur.com/qd1N5Xt.png", name: "Will" },
      { url: "https://i.imgur.com/YqS3N8J.png", name: "Steve" },
    ]
  },
  {
    title: "COBRA KAI",
    avatars: [
      { url: "https://i.imgur.com/Lp3K8Mq.png", name: "Johnny" },
      { url: "https://i.imgur.com/Nq4L9Nr.png", name: "Daniel" },
      { url: "https://i.imgur.com/Op5M0Os.png", name: "Miguel" },
      { url: "https://i.imgur.com/Pq6N1Pt.png", name: "Sam" },
      { url: "https://i.imgur.com/Qr7O2Qu.png", name: "Hawk" },
      { url: "https://i.imgur.com/Rs8P3Rv.png", name: "Tory" },
    ]
  },
  {
    title: "IT - BEM-VINDOS A DERRY",
    avatars: [
      { url: "https://i.imgur.com/St9Q4Sw.png", name: "Pennywise" },
      { url: "https://i.imgur.com/Tu0R5Tx.png", name: "Bill" },
      { url: "https://i.imgur.com/Uv1S6Uy.png", name: "Beverly" },
      { url: "https://i.imgur.com/Vw2T7Vz.png", name: "Richie" },
      { url: "https://i.imgur.com/Wx3U8Wa.png", name: "Eddie" },
      { url: "https://i.imgur.com/Xy4V9Xb.png", name: "Mike" },
    ]
  },
  {
    title: "LA CASA DE PAPEL",
    avatars: [
      { url: "https://i.imgur.com/Yz5W0Yc.png", name: "Professor" },
      { url: "https://i.imgur.com/Za6X1Zd.png", name: "Tokyo" },
      { url: "https://i.imgur.com/Ab7Y2Ae.png", name: "Berlin" },
      { url: "https://i.imgur.com/Bc8Z3Bf.png", name: "Nairobi" },
      { url: "https://i.imgur.com/Cd9A4Cg.png", name: "Denver" },
      { url: "https://i.imgur.com/De0B5Dh.png", name: "Rio" },
    ]
  },
  {
    title: "SQUID GAME",
    avatars: [
      { url: "https://i.imgur.com/Ef1C6Ei.png", name: "Gi-hun" },
      { url: "https://i.imgur.com/Fg2D7Fj.png", name: "Sae-byeok" },
      { url: "https://i.imgur.com/Gh3E8Gk.png", name: "Sang-woo" },
      { url: "https://i.imgur.com/Hi4F9Hl.png", name: "Il-nam" },
      { url: "https://i.imgur.com/Ij5G0Im.png", name: "Front Man" },
    ]
  },
  {
    title: "WEDNESDAY",
    avatars: [
      { url: "https://i.imgur.com/Jk6H1Jn.png", name: "Wednesday" },
      { url: "https://i.imgur.com/Kl7I2Ko.png", name: "Enid" },
      { url: "https://i.imgur.com/Lm8J3Lp.png", name: "Thing" },
      { url: "https://i.imgur.com/Mn9K4Mq.png", name: "Morticia" },
      { url: "https://i.imgur.com/No0L5Nr.png", name: "Gomez" },
    ]
  },
];

// Função para gerar avatar fallback colorido
const getAvatarFallback = (name: string, index: number) => {
  const colors = ['e50914', '1db954', '0066ff', 'ff6b35', '9b59b6', 'e91e63', '00bcd4', 'ff9800'];
  const color = colors[index % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=200&bold=true`;
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(getAvatarFallback("Eleven", 0));
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        navigate("/");
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Por favor, insira seu nome");
      return;
    }

    if (displayName.length > 50) {
      toast.error("Nome deve ter no máximo 50 caracteres");
      return;
    }

    if (!userId) {
      toast.error("Sessão expirada. Faça login novamente.");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("profiles").insert({
        user_id: userId,
        display_name: displayName.trim(),
        avatar_url: selectedAvatar,
      });

      if (error) throw error;

      toast.success("Perfil configurado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar perfil");
    } finally {
      setLoading(false);
    }
  };

  const scrollCategory = (categoryIndex: number, direction: 'left' | 'right') => {
    const container = document.getElementById(`category-${categoryIndex}`);
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center glow-primary">
            <span className="text-primary-foreground font-bold">P</span>
          </div>
          <span className="text-foreground font-semibold">
            <span className="text-primary">Play</span>Box
            <span className="text-muted-foreground text-xs ml-1">CINE</span>
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pb-8">
        {/* Title */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Quem está assistindo?
          </h1>
          <p className="text-muted-foreground">Escolha seu avatar e nome</p>
        </div>

        {/* Name Input */}
        <div className="max-w-md mx-auto mb-8 animate-slide-up">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome"
              maxLength={50}
              className="pl-10 bg-input border-border text-foreground h-12 text-center placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Selected Avatar Preview */}
        <div className="flex justify-center mb-8 animate-scale-in">
          <div className="relative">
            <img
              src={selectedAvatar}
              alt="Avatar selecionado"
              className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover border-4 border-primary glow-primary"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Avatar Categories */}
        <div className="space-y-6">
          {avatarCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="animate-slide-up" style={{ animationDelay: `${categoryIndex * 0.1}s` }}>
              <h3 className="text-sm font-bold text-foreground tracking-wider mb-3 px-1">
                {category.title}
              </h3>
              
              <div className="relative group">
                {/* Left Arrow */}
                <button
                  onClick={() => scrollCategory(categoryIndex, 'left')}
                  className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-background to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-6 h-6 text-foreground" />
                </button>

                {/* Avatars Row */}
                <div
                  id={`category-${categoryIndex}`}
                  className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {category.avatars.map((avatar, avatarIndex) => {
                    const avatarUrl = getAvatarFallback(avatar.name, categoryIndex * 10 + avatarIndex);
                    return (
                      <button
                        key={avatarIndex}
                        type="button"
                        onClick={() => setSelectedAvatar(avatarUrl)}
                        className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all duration-200 hover:scale-110 ${
                          selectedAvatar === avatarUrl
                            ? "ring-2 ring-primary scale-110"
                            : "hover:ring-2 hover:ring-muted-foreground"
                        }`}
                      >
                        <img
                          src={avatarUrl}
                          alt={avatar.name}
                          className="w-20 h-20 md:w-24 md:h-24 object-cover bg-card"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                          <p className="text-white text-[10px] font-medium truncate text-center">{avatar.name}</p>
                        </div>
                        {selectedAvatar === avatarUrl && (
                          <div className="absolute inset-0 border-2 border-primary rounded-lg" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Arrow */}
                <button
                  onClick={() => scrollCategory(categoryIndex, 'right')}
                  className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-6 h-6 text-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 max-w-md mx-auto animate-slide-up" style={{ animationDelay: "0.6s" }}>
          <Button
            onClick={handleSubmit}
            disabled={loading || !displayName.trim()}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity glow-primary"
          >
            {loading ? "Salvando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
