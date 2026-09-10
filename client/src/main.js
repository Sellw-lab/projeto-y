import { createClient } from "@supabase/supabase-js";
import "./style.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zcrwrvftibsthfcglujo.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_RqX2tVnQRgM3dkBBDkGHLA_w80YQ8LB";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ALBUM_SLUG = "marina-leo";
const tabs = ["Todas", "Fotos", "Mensagens", "Músicas"];
const icons = { Todas: "✦", Fotos: "▧", Mensagens: "▱", Músicas: "◒" };
const typeMap = { Fotos: "photo", Mensagens: "message", Músicas: "song" };
const state = { user: null, album: null, active: "Todas", query: "", memories: [], modal: false, authMode: "login", busy: false, message: "" };
const app = document.querySelector("#app");

function dateLabel(date) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`)).replace(" de ", " ").replace(".", ""); }
function count(type) { return state.memories.filter((item) => item.type === type).length; }
function filteredMemories() { return state.memories.filter((item) => (state.active === "Todas" || item.type === typeMap[state.active]) && (!state.query || `${item.title} ${item.note || ""}`.toLowerCase().includes(state.query.toLowerCase()))); }
function authView() {
  app.innerHTML = `<main class="auth-page"><div class="auth-art"><div class="brand"><span class="brand-mark">e</span><span>entre nós</span></div><div class="auth-art-copy"><p class="eyebrow">um espaço só nosso</p><h1>o que fica,<br/><em>fica aqui.</em></h1><p>Guarde os pequenos instantes que fazem a vida valer a pena.</p></div><span class="auth-flower">✻</span></div><section class="auth-panel"><div class="auth-box"><p class="eyebrow">${state.authMode === "login" ? "bem-vindos de volta" : "começar um álbum"}</p><h2>${state.authMode === "login" ? "entrar no álbum" : "criar seu acesso"}</h2><p class="auth-subtitle">${state.authMode === "login" ? "Entre para continuar guardando suas memórias." : "Use seu e-mail. Depois sua namorada poderá criar o acesso dela."}</p><form id="auth-form"><label>e-mail<input name="email" type="email" required placeholder="voce@email.com" autocomplete="email" /></label><label>senha<input name="password" type="password" required minlength="6" placeholder="mínimo de 6 caracteres" autocomplete="${state.authMode === "login" ? "current-password" : "new-password"}" /></label><button class="add-btn full" type="submit">${state.busy ? "aguarde..." : state.authMode === "login" ? "entrar" : "criar acesso"} <span>↗</span></button></form>${state.message ? `<p class="auth-message">${state.message}</p>` : ""}<button class="auth-switch" id="auth-switch">${state.authMode === "login" ? "Ainda não tenho acesso → criar conta" : "Já tenho uma conta → entrar"}</button></div></section></main>`;
  document.querySelector("#auth-form").addEventListener("submit", handleAuth);
  document.querySelector("#auth-switch").addEventListener("click", () => { state.authMode = state.authMode === "login" ? "signup" : "login"; state.message = ""; authView(); });
}
async function handleAuth(event) {
  event.preventDefault(); state.busy = true; state.message = ""; authView();
  const data = new FormData(event.target); const email = data.get("email"); const password = data.get("password");
  const result = state.authMode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
  state.busy = false;
  if (result.error) { state.message = result.error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : result.error.message; authView(); return; }
  if (state.authMode === "signup" && !result.data.session) { state.message = "Conta criada. Verifique seu e-mail para confirmar o acesso e depois entre."; authView(); return; }
  state.user = result.data.user; await startApp();
}
async function startApp() {
  if (!state.user) { authView(); return; }
  await supabase.rpc("claim_album_membership");
  const { data: album } = await supabase.from("albums").select("id,name").eq("slug", ALBUM_SLUG).single();
  state.album = album;
  await loadMemories(); render();
}
async function loadMemories() {
  if (!state.album) return;
  const { data, error } = await supabase.from("memories").select("id,type,title,note,date,file_path,created_at").eq("album_id", state.album.id).order("created_at", { ascending: false });
  if (error) { state.message = "Não foi possível carregar as memórias."; return; }
  state.memories = await Promise.all((data || []).map(async (item) => {
    let image = "";
    if (item.file_path) { const signed = await supabase.storage.from("memories").createSignedUrl(item.file_path, 3600); image = signed.data?.signedUrl || ""; }
    return { ...item, image };
  }));
}
function render() {
  if (!state.user) return authView();
  const memories = filteredMemories();
  app.innerHTML = `<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><span class="brand-mark">e</span><span>entre nós</span></div><p class="sidebar-label">seu espaço</p><nav class="nav">${tabs.map((tab) => `<button class="nav-item ${state.active === tab ? "active" : ""}" data-tab="${tab}"><span class="nav-icon">${icons[tab]}</span><span>${tab}</span><span class="nav-count">${tab === "Todas" ? state.memories.length : count(typeMap[tab])}</span></button>`).join("")}</nav><div class="sidebar-bottom"><div class="quote">“Guardar é uma forma de agradecer.”</div><button class="settings" id="rename-album"><span>✎</span> editar nome do álbum</button><button class="settings" id="logout"><span>↪</span> sair da conta</button><div class="profile"><div class="avatar">${(state.user.email || "M")[0].toUpperCase()}</div><div><strong>${state.user.email}</strong><small>álbum privado</small></div></div></div></aside><main class="main"><header class="topbar"><button class="mobile-menu" id="mobile-menu">☰</button><div class="crumb"><span>memórias</span><b>/</b><strong>${state.active.toLowerCase()}</strong></div><div class="top-actions"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar nas memórias..." value="${state.query}" /></label><button class="icon-btn">♢</button><button class="add-btn" id="open-modal"><span>＋</span> nova memória</button></div></header><section class="content"><div class="intro"><div><p class="eyebrow album-kicker">álbum compartilhado</p><h1><span class="album-name">${state.album?.name || "Nosso álbum"}</span></h1><p class="album-strapline">o que fica, <em>fica aqui.</em></p><p class="lead">Um lugar para guardar os instantes que merecem durar um pouco mais.</p></div><div class="intro-note"><span>✻</span><p>“A vida é feita<br/>de pequenos<br/><b>encontros.</b>”</p></div></div><div class="toolbar"><div class="filters">${tabs.map((tab) => `<button class="filter ${state.active === tab ? "selected" : ""}" data-tab="${tab}">${tab}</button>`).join("")}</div><button class="sort">mais recentes <span>⌄</span></button></div><div class="memory-grid">${memories.length ? memories.map((item, index) => card(item, index)).join("") : emptyState()}</div><div class="footer-line"><span>mostrando ${memories.length} de ${state.memories.length} memórias</span><span class="line"></span><span>feito com cuidado <span class="heart">♥</span></span></div></section></main></div>${state.modal ? modal() : ""}`;
  bindEvents();
}
function card(item, index) {
  if (item.type === "photo") return `<article class="memory-card ${index === 0 ? "wide" : ""}"><div class="photo-wrap">${item.image ? `<img src="${item.image}" alt="${item.title}"/>` : `<div class="photo-placeholder">imagem indisponível</div>`}<div class="photo-overlay"><span>${String(index + 1).padStart(2, "0")}</span><button class="delete" data-delete="${item.id}" aria-label="Excluir">×</button></div></div><div class="card-meta"><div><h2>${item.title}</h2><p>${item.note || "Uma lembrança especial."}</p></div><time>${dateLabel(item.date)}</time></div></article>`;
  return `<article class="memory-card text-card ${item.type}"><span class="type-mark">${item.type === "song" ? "◒" : "“"}</span><h2>${item.title}</h2><p>${item.note || "Uma lembrança guardada com carinho."}</p><time>${dateLabel(item.date)}</time><button class="delete text-delete" data-delete="${item.id}">excluir</button></article>`;
}
function emptyState() { return `<div class="empty"><span>✦</span><h2>ainda não há nada por aqui</h2><p>Adicione a primeira lembrança do álbum.</p><button class="add-btn" id="empty-add">＋ nova memória</button></div>`; }
function modal() { return `<div class="modal-backdrop" id="modal-backdrop"><section class="modal"><button class="close" id="close-modal">×</button><p class="eyebrow">nova entrada</p><h2>guardar uma memória</h2><p class="modal-subtitle">A foto ficará disponível para os membros do álbum.</p><form id="memory-form"><label>tipo<select name="type"><option value="photo">Foto</option><option value="message">Mensagem</option><option value="song">Música</option></select></label><label>título<input name="title" required placeholder="ex.: um domingo qualquer" /></label><div class="form-row"><label>data<input name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></label><label>arquivo<input name="file" type="file" accept="image/*" /></label></div><label>nota<input name="note" placeholder="O que você quer lembrar?" /></label><button class="add-btn full" type="submit">${state.busy ? "enviando..." : "guardar memória"} <span>↗</span></button></form></section></div>`; }
function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => { state.active = button.dataset.tab; render(); }));
  document.querySelector("#search")?.addEventListener("input", (event) => { state.query = event.target.value; render(); const input = document.querySelector("#search"); input.focus(); input.setSelectionRange(state.query.length, state.query.length); });
  document.querySelector("#open-modal")?.addEventListener("click", () => { state.modal = true; render(); });
  document.querySelector("#empty-add")?.addEventListener("click", () => { state.modal = true; render(); });
  document.querySelector("#close-modal")?.addEventListener("click", () => { state.modal = false; render(); });
  document.querySelector("#modal-backdrop")?.addEventListener("click", (event) => { if (event.target.id === "modal-backdrop") { state.modal = false; render(); } });
  document.querySelector("#rename-album")?.addEventListener("click", renameAlbum);
  document.querySelector("#logout")?.addEventListener("click", async () => { await supabase.auth.signOut(); state.user = null; state.memories = []; authView(); });
  document.querySelector("#memory-form")?.addEventListener("submit", handleMemory);
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => removeMemory(button.dataset.delete)));
  document.querySelector("#mobile-menu")?.addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("open"));
}
async function renameAlbum() {
  const name = prompt("Qual será o novo nome do álbum?", state.album?.name || "Nosso álbum")?.trim();
  if (!name || name === state.album.name) return;
  const { data, error } = await supabase.from("albums").update({ name }).eq("id", state.album.id).select("id,name").single();
  if (error) { alert("Não foi possível alterar o nome agora."); return; }
  state.album = data; render();
}
async function handleMemory(event) {
  event.preventDefault(); state.busy = true; render();
  const data = new FormData(event.target); const type = data.get("type"); const file = data.get("file"); let filePath = null;
  if (file?.size) { filePath = `${state.album.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const upload = await supabase.storage.from("memories").upload(filePath, file); if (upload.error) { state.busy = false; state.message = upload.error.message; render(); return; } }
  const insert = await supabase.from("memories").insert({ album_id: state.album.id, user_id: state.user.id, type, title: data.get("title"), note: data.get("note") || null, date: data.get("date"), file_path: filePath }).select().single();
  if (insert.error) { if (filePath) await supabase.storage.from("memories").remove([filePath]); state.busy = false; state.message = insert.error.message; render(); return; }
  state.busy = false; state.modal = false; await loadMemories(); render();
}
async function removeMemory(id) { const item = state.memories.find((memory) => memory.id === id); if (!item || !confirm("Excluir esta memória?")) return; const result = await supabase.from("memories").delete().eq("id", id); if (!result.error && item.file_path) await supabase.storage.from("memories").remove([item.file_path]); await loadMemories(); render(); }
supabase.auth.getSession().then(({ data }) => { state.user = data.session?.user || null; startApp(); });
supabase.auth.onAuthStateChange((_event, session) => { if (session?.user && !state.user) { state.user = session.user; startApp(); } });
