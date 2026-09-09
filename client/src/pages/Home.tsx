import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  ChevronRight,
  FileAudio,
  FileText,
  Heart,
  ImagePlus,
  Loader2,
  Music2,
  Pause,
  Play,
  Quote,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Tab = "photos" | "songs" | "messages";
type Composer = "photo" | "song" | "text" | "audio" | null;

type FileState = { file: File; dataUrl: string } | null;

const tabs: Array<{ id: Tab; label: string; icon: typeof Heart }> = [
  { id: "photos", label: "Fotos", icon: ImagePlus },
  { id: "songs", label: "Trilha sonora", icon: Music2 },
  { id: "messages", label: "Mensagens", icon: Quote },
];

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler este arquivo"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler este arquivo"));
    reader.readAsText(file, "UTF-8");
  });
}

function todayInput() {
  return format(new Date(), "yyyy-MM-dd");
}

function displayDate(value: Date | string | null | undefined) {
  if (!value) return "Sem data";
  return format(new Date(value), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function spotifyEmbed(url: string) {
  const match = url.match(/open\.spotify\.com\/(?:intl-[^/]+\/)?(track|playlist|album|episode)\/([a-zA-Z0-9]+)/);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0` : null;
}

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: () => void }) {
  const copy = {
    photos: ["Seu mural ainda está em branco", "Adicione a primeira lembrança visual para começar a sua linha do tempo."],
    songs: ["A trilha sonora começa aqui", "Salve uma música do Spotify e associe uma história a ela."],
    messages: ["Guarde as palavras favoritas", "Importe um áudio do WhatsApp ou escreva uma mensagem especial."],
  }[tab];
  return (
    <div className="empty-state">
      <div className="empty-icon"><Sparkles className="size-5" /></div>
      <p className="font-serif text-2xl text-ink">{copy[0]}</p>
      <p className="max-w-sm text-sm leading-6 text-ink-muted">{copy[1]}</p>
      <Button onClick={onAdd} className="mt-3 rounded-full bg-ink px-5 text-white hover:bg-ink/90">
        Adicionar agora <ChevronRight className="ml-1 size-4" />
      </Button>
    </div>
  );
}

export default function Home() {
  const { user } = { user: null as { name?: string | null } | null };
  const { data, isLoading } = trpc.album.list.useQuery();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<Tab>("photos");
  const [composer, setComposer] = useState<Composer>(null);
  const [photoFile, setPhotoFile] = useState<FileState>(null);
  const [audioFile, setAudioFile] = useState<FileState>(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [photoDate, setPhotoDate] = useState(todayInput);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [songNote, setSongNote] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageNote, setMessageNote] = useState("");
  const [messageDate, setMessageDate] = useState(todayInput);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => utils.album.list.invalidate();
  const photoCreate = trpc.album.photos.create.useMutation({ onSuccess: refresh });
  const photoRemove = trpc.album.photos.remove.useMutation({ onSuccess: refresh });
  const songCreate = trpc.album.songs.create.useMutation({ onSuccess: refresh });
  const songRemove = trpc.album.songs.remove.useMutation({ onSuccess: refresh });
  const messageCreate = trpc.album.messages.create.useMutation({ onSuccess: refresh });
  const messageRemove = trpc.album.messages.remove.useMutation({ onSuccess: refresh });

  const counts = useMemo(() => ({
    photos: data?.photos.length ?? 0,
    songs: data?.songs.length ?? 0,
    messages: data?.messages.length ?? 0,
  }), [data]);

  const resetComposer = () => {
    setComposer(null);
    setPhotoFile(null);
    setAudioFile(null);
    setPhotoTitle("");
    setPhotoNote("");
    setSongTitle("");
    setSongArtist("");
    setSongUrl("");
    setSongNote("");
    setMessageTitle("");
    setMessageText("");
    setMessageNote("");
    setPhotoDate(todayInput());
    setMessageDate(todayInput());
  };

  const chooseTab = (tab: Tab) => {
    setActiveTab(tab);
    resetComposer();
  };

  const onPhotoFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Escolha uma imagem JPG, PNG, WebP ou GIF.");
    if (file.size > 32 * 1024 * 1024) return toast.error("A imagem precisa ter até 32 MB.");
    try {
      setPhotoFile({ file, dataUrl: await readAsDataUrl(file) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a imagem");
    }
  };

  const onAudioFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) return toast.error("Escolha um arquivo de áudio do WhatsApp ou do seu celular.");
    if (file.size > 32 * 1024 * 1024) return toast.error("O áudio precisa ter até 32 MB.");
    try {
      setAudioFile({ file, dataUrl: await readAsDataUrl(file) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o áudio");
    }
  };

  const savePhoto = async () => {
    if (!photoFile || !photoTitle.trim()) return toast.error("Escolha uma foto e dê um nome para ela.");
    try {
      await photoCreate.mutateAsync({ title: photoTitle, note: photoNote || undefined, fileName: photoFile.file.name, mimeType: photoFile.file.type, dataUrl: photoFile.dataUrl, receivedAt: new Date(`${photoDate}T12:00:00`).toISOString() });
      toast.success("Foto guardada na sua coleção.");
      resetComposer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a foto");
    }
  };

  const saveSong = async () => {
    if (!songTitle.trim() || !songUrl.trim()) return toast.error("Informe o título e o link do Spotify.");
    try {
      await songCreate.mutateAsync({ title: songTitle, artist: songArtist || undefined, note: songNote || undefined, spotifyUrl: songUrl });
      toast.success("Música adicionada à trilha sonora.");
      resetComposer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Confira se o link é do Spotify");
    }
  };

  const saveMessage = async (kind: "text" | "audio") => {
    if (!messageTitle.trim()) return toast.error("Dê um título para esta mensagem.");
    if (kind === "text" && !messageText.trim()) return toast.error("Escreva ou importe o texto da mensagem.");
    if (kind === "audio" && !audioFile) return toast.error("Escolha um áudio para importar.");
    try {
      await messageCreate.mutateAsync({
        kind,
        title: messageTitle,
        content: kind === "text" ? messageText : undefined,
        note: messageNote || undefined,
        receivedAt: new Date(`${messageDate}T12:00:00`).toISOString(),
        ...(kind === "audio" && audioFile ? { fileName: audioFile.file.name, mimeType: audioFile.file.type, dataUrl: audioFile.dataUrl } : {}),
      });
      toast.success(kind === "audio" ? "Áudio importado para suas favoritas." : "Mensagem guardada na coleção.");
      resetComposer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar a mensagem");
    }
  };

  const requestDelete = (kind: "photo" | "song" | "message", id: number) => {
    if (!window.confirm("Excluir este item da sua coleção?")) return;
    if (kind === "photo") photoRemove.mutate({ id });
    if (kind === "song") songRemove.mutate({ id });
    if (kind === "message") messageRemove.mutate({ id });
  };

  const showComposer = (kind: Exclude<Composer, null>) => {
    setComposer(kind);
    if (kind === "photo") setActiveTab("photos");
    if (kind === "song") setActiveTab("songs");
    if (kind === "text" || kind === "audio") setActiveTab("messages");
  };

  const currentCount = counts[activeTab];
  const greetingName = user?.name?.split(" ")[0] || "você";

  return (
    <div className="min-h-screen bg-paper px-4 pb-16 pt-6 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-8 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow mb-3"><span className="eyebrow-dot" /> arquivo pessoal · privado</div>
            <h1 className="font-serif text-4xl leading-none tracking-tight text-ink sm:text-5xl">As pequenas coisas<br /><em>que ficam.</em></h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink-muted">Um lugar calmo para guardar as imagens, músicas e mensagens que fazem um ano inteiro caber em um instante.</p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block"><p className="text-xs uppercase tracking-[0.18em] text-ink-faint">coleção de</p><p className="font-serif text-xl text-ink">{greetingName}</p></div>
            <div className="avatar-mark">{greetingName.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>

        <section className="mb-10 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="hero-card">
            <div className="relative z-10 max-w-md">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/80"><Heart className="size-3 fill-coral text-coral" /> capítulo aberto</div>
              <h2 className="font-serif text-3xl leading-tight text-white sm:text-4xl">Memórias não precisam<br /><em>de legenda perfeita.</em></h2>
              <p className="mt-4 text-sm leading-6 text-white/65">Só precisam de um lugar para voltar quando a saudade bater.</p>
              <button className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-coral" onClick={() => showComposer("photo")}>Adicionar uma lembrança <ChevronRight className="size-4" /></button>
            </div>
            <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" /><div className="hero-spark">✦</div>
          </div>
          <div className="stats-card">
            <div className="flex items-start justify-between"><div><p className="eyebrow">seu acervo</p><p className="mt-3 font-serif text-4xl text-ink">{counts.photos + counts.songs + counts.messages}</p><p className="mt-1 text-sm text-ink-muted">lembranças guardadas</p></div><div className="stat-heart"><Heart className="size-4 fill-coral text-coral" /></div></div>
            <div className="mt-8 space-y-4">{tabs.map(tab => <button key={tab.id} onClick={() => chooseTab(tab.id)} className="stat-row group"><span className="flex items-center gap-3"><span className="stat-icon"><tab.icon className="size-4" /></span><span className="text-sm text-ink-muted">{tab.label}</span></span><span className="flex items-center gap-2 font-serif text-xl text-ink"><span>{counts[tab.id]}</span><ChevronRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-1" /></span></button>)}</div>
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:w-52">
            <p className="eyebrow mb-3">organizar por</p>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} onClick={() => chooseTab(tab.id)} className={`tab-button ${activeTab === tab.id ? "tab-active" : ""}`}><Icon className="size-4" /><span>{tab.label}</span><span className="ml-auto tab-count">{counts[tab.id]}</span></button>; })}</nav>
            <div className="mt-8 hidden border-t border-line pt-5 lg:block"><p className="text-xs leading-5 text-ink-faint">Dica: a data pode ser ajustada para o dia em que você recebeu a lembrança.</p></div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="eyebrow mb-2">{activeTab === "photos" ? "mural visual" : activeTab === "songs" ? "sons que marcaram" : "palavras e vozes"}</div><h2 className="font-serif text-3xl text-ink">{tabs.find(tab => tab.id === activeTab)?.label}</h2></div><div className="flex items-center gap-2"><span className="hidden text-xs text-ink-faint sm:inline">{currentCount} {currentCount === 1 ? "item" : "itens"}</span><Button onClick={() => showComposer(activeTab === "messages" ? "text" : activeTab === "photos" ? "photo" : "song")} className="rounded-full bg-coral px-4 text-white shadow-sm hover:bg-coral-dark"><Sparkles className="mr-2 size-4" /> adicionar</Button></div></div>

            {composer && <ComposerPanel composer={composer} onClose={resetComposer} photoFile={photoFile} audioFile={audioFile} setPhotoFile={setPhotoFile} setAudioFile={setAudioFile} photoTitle={photoTitle} setPhotoTitle={setPhotoTitle} photoNote={photoNote} setPhotoNote={setPhotoNote} photoDate={photoDate} setPhotoDate={setPhotoDate} songTitle={songTitle} setSongTitle={setSongTitle} songArtist={songArtist} setSongArtist={setSongArtist} songUrl={songUrl} setSongUrl={setSongUrl} songNote={songNote} setSongNote={setSongNote} messageTitle={messageTitle} setMessageTitle={setMessageTitle} messageText={messageText} setMessageText={setMessageText} messageNote={messageNote} setMessageNote={setMessageNote} messageDate={messageDate} setMessageDate={setMessageDate} photoInputRef={photoInputRef} audioInputRef={audioInputRef} textInputRef={textInputRef} onChooseAudio={() => showComposer("audio")} onPhotoFile={onPhotoFile} onAudioFile={onAudioFile} onSavePhoto={savePhoto} onSaveSong={saveSong} onSaveText={() => saveMessage("text")} onSaveAudio={() => saveMessage("audio")} />}

            {isLoading ? <div className="loading-grid">{[1, 2, 3].map(item => <div className="skeleton-card" key={item} />)}</div> : activeTab === "photos" ? <PhotoGrid photos={data?.photos ?? []} onDelete={id => requestDelete("photo", id)} onAdd={() => showComposer("photo")} /> : activeTab === "songs" ? <SongList songs={data?.songs ?? []} onDelete={id => requestDelete("song", id)} onAdd={() => showComposer("song")} /> : <MessageList messages={data?.messages ?? []} onDelete={id => requestDelete("message", id)} onAdd={() => showComposer("text")} />}
          </main>
        </div>
        <footer id="sobre" className="mt-16 flex flex-col gap-2 border-t border-line pt-5 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between"><span>feito para guardar o que é só seu.</span><span className="flex items-center gap-1">privado por padrão <Check className="size-3 text-sage" /></span></footer>
      </div>
    </div>
  );
}

function ComposerPanel(props: any) {
  const { composer, onClose } = props;
  const isPhoto = composer === "photo";
  const isSong = composer === "song";
  const isAudio = composer === "audio";
  return <section className="composer-card mb-6"><div className="flex items-start justify-between border-b border-line px-5 py-4"><div><p className="eyebrow">nova lembrança</p><h3 className="mt-1 font-serif text-2xl text-ink">{isPhoto ? "Adicionar foto" : isSong ? "Adicionar à trilha" : isAudio ? "Importar áudio" : "Guardar mensagem"}</h3></div><button onClick={onClose} aria-label="Fechar" className="icon-button"><X className="size-4" /></button></div><div className="p-5">{isPhoto ? <PhotoComposer {...props} /> : isSong ? <SongComposer {...props} /> : isAudio ? <AudioComposer {...props} /> : <TextComposer {...props} />}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }

function PhotoComposer({ photoFile, setPhotoFile, photoTitle, setPhotoTitle, photoNote, setPhotoNote, photoDate, setPhotoDate, photoInputRef, onPhotoFile, onSavePhoto }: any) {
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-[180px_1fr]"><button className="upload-box" onClick={() => photoInputRef.current?.click()}>{photoFile ? <img src={photoFile.dataUrl} alt="Prévia da foto" /> : <><ImagePlus className="size-6 text-coral" /><span>Escolher foto</span><small>JPG, PNG, WebP ou GIF</small></>}<input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={event => onPhotoFile(event.target.files?.[0])} /></button><div className="grid gap-3"><Field label="Título"><Input value={photoTitle} onChange={event => setPhotoTitle(event.target.value)} placeholder="Ex.: domingo de sol" /></Field><Field label="Data em que recebeu"><Input type="date" value={photoDate} onChange={event => setPhotoDate(event.target.value)} /></Field><Field label="Legenda (opcional)"><Textarea value={photoNote} onChange={event => setPhotoNote(event.target.value)} placeholder="O que você quer lembrar desse momento?" rows={2} /></Field></div></div><div className="flex justify-end"><Button onClick={onSavePhoto} className="rounded-full bg-ink px-5 text-white hover:bg-ink/90">Guardar foto <Upload className="ml-2 size-4" /></Button></div></div>;
}

function SongComposer({ songTitle, setSongTitle, songArtist, setSongArtist, songUrl, setSongUrl, songNote, setSongNote, onSaveSong }: any) {
  return <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome da música"><Input value={songTitle} onChange={event => setSongTitle(event.target.value)} placeholder="Ex.: Turning Page" /></Field><Field label="Artista (opcional)"><Input value={songArtist} onChange={event => setSongArtist(event.target.value)} placeholder="Ex.: Sleeping At Last" /></Field><Field label="Link do Spotify"><Input value={songUrl} onChange={event => setSongUrl(event.target.value)} placeholder="https://open.spotify.com/track/..." /></Field><Field label="Por que ela ficou? (opcional)"><Input value={songNote} onChange={event => setSongNote(event.target.value)} placeholder="A música daquele dia..." /></Field><div className="flex justify-end sm:col-span-2"><Button onClick={onSaveSong} className="rounded-full bg-ink px-5 text-white hover:bg-ink/90">Adicionar música <Music2 className="ml-2 size-4" /></Button></div></div>;
}

function TextComposer({ messageTitle, setMessageTitle, messageText, setMessageText, messageNote, setMessageNote, messageDate, setMessageDate, textInputRef, onChooseAudio, onSaveText }: any) {
  const onTextFile = async (file?: File) => { if (!file) return; try { setMessageText(await readAsText(file)); toast.success("Texto importado. Revise antes de guardar."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível importar o texto"); } };
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Título"><Input value={messageTitle} onChange={event => setMessageTitle(event.target.value)} placeholder="Ex.: a mensagem que me fez sorrir" /></Field><Field label="Data em que recebeu"><Input type="date" value={messageDate} onChange={event => setMessageDate(event.target.value)} /></Field></div><Field label="Mensagem"><Textarea value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Cole aqui a mensagem favorita..." rows={5} /></Field><div className="flex flex-wrap items-center justify-between gap-3"><div><input ref={textInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={event => onTextFile(event.target.files?.[0])} /><Button type="button" variant="outline" onClick={() => textInputRef.current?.click()} className="rounded-full border-line text-ink-muted"><FileText className="mr-2 size-4" /> importar .txt</Button><span className="ml-2 text-xs text-ink-faint">exporte a conversa e selecione só o trecho favorito</span></div><Button onClick={onSaveText} className="rounded-full bg-ink px-5 text-white hover:bg-ink/90">Guardar mensagem <Quote className="ml-2 size-4" /></Button></div><Field label="Nota pessoal (opcional)"><Input value={messageNote} onChange={event => setMessageNote(event.target.value)} placeholder="O contexto que você não quer esquecer..." /></Field><button type="button" onClick={onChooseAudio} className="text-xs text-ink-faint underline underline-offset-4 hover:text-ink">Prefere importar um áudio do WhatsApp? Escolha o importador de áudio.</button></div>;
}

function AudioComposer({ audioFile, audioInputRef, onAudioFile, messageTitle, setMessageTitle, messageNote, setMessageNote, messageDate, setMessageDate, onSaveAudio }: any) {
  return <div className="space-y-4"><button className="audio-upload" onClick={() => audioInputRef.current?.click()}><FileAudio className="size-6 text-coral" /><span>{audioFile ? audioFile.file.name : "Escolher áudio do WhatsApp"}</span><small>MP3, M4A, WAV, OGG, OPUS ou WEBM · até 32 MB</small><input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={event => onAudioFile(event.target.files?.[0])} /></button>{audioFile && <audio controls src={audioFile.dataUrl} className="w-full" />}<div className="grid gap-4 sm:grid-cols-2"><Field label="Título"><Input value={messageTitle} onChange={event => setMessageTitle(event.target.value)} placeholder="Ex.: áudio de bom dia" /></Field><Field label="Data em que recebeu"><Input type="date" value={messageDate} onChange={event => setMessageDate(event.target.value)} /></Field></div><Field label="Nota pessoal (opcional)"><Input value={messageNote} onChange={event => setMessageNote(event.target.value)} placeholder="O contexto desse áudio..." /></Field><div className="flex justify-end"><Button onClick={onSaveAudio} className="rounded-full bg-ink px-5 text-white hover:bg-ink/90">Guardar áudio <FileAudio className="ml-2 size-4" /></Button></div></div>;
}

function PhotoGrid({ photos, onDelete, onAdd }: { photos: any[]; onDelete: (id: number) => void; onAdd: () => void }) {
  if (!photos.length) return <EmptyState tab="photos" onAdd={onAdd} />;
  return <div className="photo-grid">{photos.map((photo, index) => <article className={`photo-card ${index === 0 ? "photo-card-featured" : ""}`} key={photo.id}><div className="photo-frame"><img src={photo.fileUrl} alt={photo.title} loading="lazy" /><button onClick={() => onDelete(photo.id)} className="delete-button" aria-label={`Excluir ${photo.title}`}><Trash2 className="size-4" /></button><span className="photo-number">{String(index + 1).padStart(2, "0")}</span></div><div className="px-1 pt-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-serif text-xl leading-tight text-ink">{photo.title}</h3><p className="mt-1 flex items-center gap-1 text-xs text-ink-faint"><CalendarDays className="size-3" /> {displayDate(photo.receivedAt)}</p></div></div>{photo.note && <p className="mt-3 text-sm leading-5 text-ink-muted">{photo.note}</p>}</div></article>)}</div>;
}

function SongList({ songs, onDelete, onAdd }: { songs: any[]; onDelete: (id: number) => void; onAdd: () => void }) {
  if (!songs.length) return <EmptyState tab="songs" onAdd={onAdd} />;
  return <div className="space-y-4">{songs.map(song => { const embed = spotifyEmbed(song.spotifyUrl); return <article className="song-card" key={song.id}><div className="song-disc"><Music2 className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-serif text-2xl text-ink">{song.title}</h3><p className="mt-1 text-sm text-ink-muted">{song.artist || "Faixa favorita"} · adicionada {displayDate(song.addedAt)}</p></div><button onClick={() => onDelete(song.id)} className="delete-text"><Trash2 className="mr-1 size-3" /> excluir</button></div>{song.note && <p className="mt-3 text-sm italic leading-5 text-ink-muted">“{song.note}”</p>}{embed ? <iframe className="spotify-frame mt-4" src={embed} title={`Spotify: ${song.title}`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" /> : <a className="mt-4 inline-flex text-sm text-sage underline underline-offset-4" href={song.spotifyUrl} target="_blank" rel="noreferrer">Abrir no Spotify <ChevronRight className="ml-1 size-4" /></a>}</div></article>; })}</div>;
}

function MessageList({ messages, onDelete, onAdd }: { messages: any[]; onDelete: (id: number) => void; onAdd: () => void }) {
  if (!messages.length) return <EmptyState tab="messages" onAdd={onAdd} />;
  return <div className="message-list">{messages.map(message => <article className="message-card" key={message.id}><div className={`message-bubble ${message.kind === "audio" ? "audio-bubble" : ""}`}>{message.kind === "audio" ? <><div className="flex items-center gap-3"><div className="play-mark"><Play className="ml-0.5 size-4 fill-current" /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{message.title}</p><p className="text-xs text-ink-faint">{message.fileName}</p></div></div><audio controls src={message.fileUrl} className="mt-4 w-full" /></> : <><Quote className="mb-3 size-5 text-coral" /><p className="whitespace-pre-wrap font-serif text-xl leading-8 text-ink">{message.content}</p></>}</div><div className="mt-3 flex items-center justify-between gap-3 px-1"><div><p className="font-medium text-ink">{message.title}</p><p className="mt-1 text-xs text-ink-faint">recebida {displayDate(message.receivedAt)}{message.note ? ` · ${message.note}` : ""}</p></div><button onClick={() => onDelete(message.id)} className="delete-text"><Trash2 className="mr-1 size-3" /> excluir</button></div></article>)}</div>;
}
