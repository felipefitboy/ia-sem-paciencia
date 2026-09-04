import { Key, createClient, Agent, REGION_US } from "@relevanceai/sdk";

const RELEVANCE = {
  region: REGION_US,
  project: "4e2d30e0-22fa-51f7-b751-ab84cea50a8e",
  agents: {
    parcelado: "e3fb5871-5001-462b-a9ee-e8648554aa59",
    cida: "1875b6b7-ef34-48f9-b83b-f86637f4297d",
    ze: "b67b471d-802b-416a-8418-46dcad7b0d5c",
    sincerona: "08d6e949-4073-417e-9da2-41f825ded716",
    professor: "73e95201-fbf8-4172-8f81-7f9dee819d8a",
    osvaldo: "51bd1249-3291-4f5e-9da2-e728681f4be3",
  }
};

const characters = [
  {id:"parcelado",name:"Zé Parcelado",icon:"🧢",image:"assets/personagens/parcelado.webp",desc:"Especialista em sobreviver até o próximo boleto.",tags:["sarcasmo","boletos","sobrevivência"],greeting:"Manda a pergunta, meu consagrado. Se der pra resolver sem parcelar a dignidade, já é lucro."},
  {id:"cida",name:"Dona Cida",icon:"👵",image:"assets/personagens/cida.webp",desc:"Mãe brasileira. Dá conselho, bronca e opinião sem ninguém pedir.",tags:["bronca","carinho","mãe"],greeting:"Fala, criatura. E vê se dessa vez você não arruma problema."},
  {id:"ze",name:"Zé do Boteco",icon:"🍺",image:"assets/personagens/ze.webp",desc:"Tem uma teoria sobre tudo e provavelmente já contou isso três vezes.",tags:["boteco","conselho","filosofia"],greeting:"Manda a pergunta. Tenho uma teoria sobre isso e provavelmente ninguém pediu."},
  {id:"sincerona",name:"Sincerona",icon:"💅",image:"assets/personagens/sincerona.webp",desc:"Fala a verdade que você já sabia, mas não queria ouvir.",tags:["verdade","zero filtro","direta"],greeting:"Manda a pergunta. Só não vem buscar validação disfarçada de conselho."},
  {id:"professor",name:"Professor Óbvio",icon:"🧠",image:"assets/personagens/professor.webp",desc:"Transforma uma conclusão simples em uma aula desnecessariamente técnica.",tags:["técnico","óbvio","ironia"],greeting:"Formule sua dúvida. Tentarei explicar o óbvio com complexidade desnecessária."},
  {id:"osvaldo",name:"Osvaldo Promessa",icon:"🇧🇷",image:"assets/personagens/osvaldo.webp",desc:"Candidato a alguma coisa. Promete resolver tudo — como vai pagar é detalhe técnico.",tags:["promessas","campanha","cara de pau"],greeting:"Minha gente, companheiro, olha aqui: pode perguntar. Se eu não resolver, a culpa provavelmente é do governo anterior."}
];

const els = {
  grid: document.getElementById("characterGrid"),
  selectedAvatar: document.getElementById("selectedAvatar"),
  selectedName: document.getElementById("selectedName"),
  messages: document.getElementById("chatMessages"),
  form: document.getElementById("chatForm"),
  input: document.getElementById("chatInput"),
  send: document.getElementById("sendBtn"),
  status: document.getElementById("chatStatus"),
  typing: document.getElementById("typingRow"),
  counter: document.getElementById("counter"),
  quota: document.getElementById("dailyQuota"),
  change: document.getElementById("changeBtn"),
  newChat: document.getElementById("newChatBtn"),
};

const params = new URLSearchParams(location.search);
const initialCharacterIdRaw = params.get("char");
const initialCharacterId = initialCharacterIdRaw === "madruga" ? "parcelado" : initialCharacterIdRaw;
let selected = characters.find(c => c.id === initialCharacterId) || characters.find(c => c.id === "sincerona");
let agent = null;
let task = null;
let busy = false;
let sdkReady = false;
let lastUserQuestion = "";

const DAILY_LIMIT = 3;
const USAGE_KEY = "iasp_daily_usage_v2";
const QUOTA_API = "/api/quota";
let serverQuota = null;
let serverQuotaAvailable = false;

function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function readUsage(){
  try{ const data=JSON.parse(localStorage.getItem(USAGE_KEY)||"null"); if(data && data.date===todayKey()) return {date:data.date,used:Math.max(0,Math.min(DAILY_LIMIT,Number(data.used)||0))}; }catch{}
  return {date:todayKey(),used:0};
}
function writeUsage(data){ try{localStorage.setItem(USAGE_KEY,JSON.stringify(data));}catch{} }
function localRemaining(){ return Math.max(0,DAILY_LIMIT-readUsage().used); }
function remaining(){ return serverQuotaAvailable && Number.isFinite(serverQuota) ? Math.max(0,serverQuota) : localRemaining(); }
function consumeLocal(){ const u=readUsage(); if(u.used<DAILY_LIMIT){u.used++;writeUsage(u);} }

async function syncQuota(){
  if(location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1"){ serverQuotaAvailable=false; updateQuotaUI(); return; }
  try{
    const r=await fetch(QUOTA_API,{method:"GET",headers:{"Accept":"application/json"},credentials:"same-origin",cache:"no-store"});
    if(!r.ok) throw new Error(`quota ${r.status}`);
    const data=await r.json();
    serverQuota=Number(data.remaining); serverQuotaAvailable=(data.configured===true); updateQuotaUI();
  }catch(err){ console.warn("Quota do servidor indisponível; usando proteção local.",err); serverQuotaAvailable=false; updateQuotaUI(); }
}

async function reserveQuota(){
  if(!serverQuotaAvailable){ if(localRemaining()<=0) return false; consumeLocal(); updateQuotaUI(); return true; }
  try{
    const r=await fetch(QUOTA_API,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"consume"})});
    const data=await r.json().catch(()=>({}));
    if(r.status===429 || data.allowed===false){ serverQuota=0; updateQuotaUI(); return false; }
    if(!r.ok) throw new Error(`quota ${r.status}`);
    if(data.configured !== true){
      serverQuotaAvailable=false;
      if(localRemaining()<=0) return false;
      consumeLocal(); updateQuotaUI(); return true;
    }
    serverQuota=Number(data.remaining); consumeLocal(); updateQuotaUI(); return true;
  }catch(err){
    console.warn("Falha ao reservar quota no servidor; usando proteção local.",err);
    serverQuotaAvailable=false;
    if(localRemaining()<=0) return false; consumeLocal(); updateQuotaUI(); return true;
  }
}

function updateQuotaUI(){
  const left=remaining();
  if(els.quota) els.quota.innerHTML=`⚡ <strong>${left}</strong> de ${DAILY_LIMIT} perguntas restantes hoje`;
  const blocked=left<=0;
  if(blocked && !busy){ els.send.disabled=true; els.input.disabled=true; els.input.placeholder="Suas 3 perguntas de hoje acabaram. Volte amanhã 😈"; setStatus("😈 Suas 3 perguntas de hoje acabaram. Volte amanhã para mais desaforo.","error"); }
  else if(!blocked){ els.input.disabled=false; els.input.placeholder=`Pergunte qualquer coisa para ${selected.name}...`; if(sdkReady&&!busy) els.send.disabled=false; }
}

function setStatus(text, kind="") {
  els.status.textContent = text;
  els.status.className = `chat-status ${kind}`.trim();
}

function scrollMessages(){ els.messages.scrollTop = els.messages.scrollHeight; }

function avatarMarkup(character=selected){
  return `<img src="${character.image}" alt="${character.name}" loading="lazy">`;
}

async function loadCharacterImage(character=selected){
  return await new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=character.image;
  });
}

function shareTextFor(text, question=""){
  const q = question ? `Pergunta: “${question}”\n\n` : "";
  return `${selected.icon} ${selected.name} respondeu:\n\n${q}“${text}”\n\n— IA Sem Paciência`;
}

function wrapCanvasText(ctx, text, maxWidth){
  const paragraphs = String(text).split(/\n+/);
  const lines=[];
  for(const paragraph of paragraphs){
    const words=paragraph.split(/\s+/); let line="";
    for(const word of words){
      const test=line ? `${line} ${word}` : word;
      if(ctx.measureText(test).width > maxWidth && line){ lines.push(line); line=word; }
      else line=test;
    }
    if(line) lines.push(line);
    if(paragraph !== paragraphs[paragraphs.length-1]) lines.push("");
  }
  return lines;
}

function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill();
}

async function makeShareCard(question, answer){
  const canvas=document.createElement("canvas"); canvas.width=1080; canvas.height=1350;
  const ctx=canvas.getContext("2d");
  const grad=ctx.createLinearGradient(0,0,1080,1350); grad.addColorStop(0,"#09090f"); grad.addColorStop(1,"#15151f"); ctx.fillStyle=grad; ctx.fillRect(0,0,1080,1350);
  ctx.fillStyle="#b9ff39"; ctx.fillRect(0,0,1080,14);
  ctx.fillStyle="#b9ff39"; ctx.font="900 34px Arial"; ctx.fillText("IA SEM PACIÊNCIA",72,88);
  ctx.fillStyle="#777783"; ctx.font="700 20px Arial"; ctx.fillText("PERGUNTE POR SUA CONTA E RISCO.",72,124);
  ctx.fillStyle="#20202b"; roundedRect(ctx,72,175,936,150,28);
  try{
    const portrait=await loadCharacterImage(selected);
    ctx.save(); ctx.beginPath(); ctx.arc(144,250,54,0,Math.PI*2); ctx.clip();
    const scale=Math.max(108/portrait.width,108/portrait.height);
    const w=portrait.width*scale,h=portrait.height*scale;
    ctx.drawImage(portrait,144-w/2,250-h/2,w,h); ctx.restore();
    ctx.strokeStyle="#b9ff39";ctx.lineWidth=4;ctx.beginPath();ctx.arc(144,250,56,0,Math.PI*2);ctx.stroke();
  }catch{ ctx.font="52px Arial"; ctx.fillText(selected.icon,112,267); }
  ctx.fillStyle="#ffffff"; ctx.font="800 38px Arial"; ctx.fillText(selected.name,225,242);
  ctx.fillStyle="#b9ff39"; ctx.font="800 18px Arial"; ctx.fillText("RESPONDEU",225,278);
  let y=385;
  ctx.fillStyle="#777783"; ctx.font="800 18px Arial"; ctx.fillText("VOCÊ PERGUNTOU",72,y); y+=45;
  ctx.fillStyle="#f3f3f6"; ctx.font="700 31px Arial";
  const qLines=wrapCanvasText(ctx,`“${question}”`,900).slice(0,5); qLines.forEach(l=>{ctx.fillText(l,72,y);y+=43}); y+=42;
  ctx.fillStyle="#b9ff39"; ctx.font="800 18px Arial"; ctx.fillText(`${selected.name.toUpperCase()} DISSE`,72,y); y+=48;
  ctx.fillStyle="#f3f3f6"; ctx.font="600 30px Arial";
  const maxLines=Math.max(7,Math.floor((1190-y)/42)); const aLines=wrapCanvasText(ctx,answer,900).slice(0,maxLines);
  aLines.forEach((l,i)=>{ const out=(i===aLines.length-1 && wrapCanvasText(ctx,answer,900).length>aLines.length)?l+"…":l; ctx.fillText(out,72,y);y+=42});
  ctx.fillStyle="#292934"; ctx.fillRect(72,1230,936,2);
  ctx.fillStyle="#b9ff39"; ctx.font="900 23px Arial"; ctx.fillText("IA Sem Paciência",72,1286);
  ctx.fillStyle="#777783"; ctx.font="600 18px Arial"; ctx.textAlign="right"; ctx.fillText("Uma pergunta. Seis personalidades.",1008,1286); ctx.textAlign="left";
  return canvas;
}

async function openShareCard(question, answer){
  const old=document.getElementById("shareCardModal"); if(old) old.remove();
  const modal=document.createElement("div"); modal.id="shareCardModal"; modal.className="share-modal";
  const panel=document.createElement("div"); panel.className="share-panel";
  const head=document.createElement("div"); head.className="share-head"; head.innerHTML='<div><strong>Seu card está pronto</strong><span>Compartilhe a resposta com a cara do IA Sem Paciência.</span></div>';
  const close=document.createElement("button"); close.type="button"; close.className="share-close"; close.textContent="×"; close.onclick=()=>modal.remove(); head.appendChild(close);
  const canvas=await makeShareCard(question,answer); canvas.className="share-preview";
  const actions=document.createElement("div"); actions.className="share-modal-actions";
  const save=document.createElement("button"); save.className="share-modal-btn"; save.textContent="↓ Salvar imagem";
  save.onclick=()=>{const a=document.createElement("a");a.download=`ia-sem-paciencia-${selected.id}.png`;a.href=canvas.toDataURL("image/png");a.click()};
  const share=document.createElement("button"); share.className="share-modal-btn primary"; share.textContent="↗ Compartilhar card";
  share.onclick=()=>canvas.toBlob(async blob=>{try{const file=new File([blob],"ia-sem-paciencia.png",{type:"image/png"});if(navigator.canShare?.({files:[file]})){await navigator.share({title:`${selected.name} — IA Sem Paciência`,text:"Olha a resposta que eu recebi 😂",files:[file]});}else{save.click();}}catch(e){if(e?.name!=="AbortError") save.click();}},"image/png");
  const copy=document.createElement("button"); copy.className="share-modal-btn ghost"; copy.textContent="⧉ Copiar texto"; copy.onclick=()=>copyResponse(answer,copy,question);
  actions.append(save,share,copy); panel.append(head,canvas,actions); modal.appendChild(panel); document.body.appendChild(modal);
  modal.addEventListener("click",e=>{if(e.target===modal)modal.remove()});
}

async function copyResponse(text, btn, question=""){
  try{
    await navigator.clipboard.writeText(shareTextFor(text,question));
    const old = btn.textContent; btn.textContent = "✓ Copiado"; btn.classList.add("success");
    setTimeout(()=>{btn.textContent=old;btn.classList.remove("success")},1600);
  }catch{ setStatus("Não consegui copiar automaticamente.", "error"); }
}

function shareResponse(text, question){ openShareCard(question,text); }

function addMessage(text, who="agent", {actions=true, question=""}={}){
  const wrap = document.createElement("div");
  wrap.className = `message-block ${who === "user" ? "user-block" : "agent-block"}`;
  const row = document.createElement("div");
  row.className = `message-row ${who === "user" ? "user-row" : "agent-row"}`;
  if (who !== "user") {
    const av = document.createElement("div");
    av.className = "mini-avatar";
    av.innerHTML = avatarMarkup(selected);
    row.appendChild(av);
  }
  const bubble = document.createElement("div");
  bubble.className = `message ${who === "user" ? "user-message" : "agent-message"}`;
  bubble.textContent = text;
  row.appendChild(bubble);
  wrap.appendChild(row);

  if(who === "agent" && actions){
    const actionsEl = document.createElement("div");
    actionsEl.className = "response-actions";
    const copy = document.createElement("button");
    copy.type="button"; copy.className="response-action"; copy.textContent="⧉ Copiar";
    copy.addEventListener("click",()=>copyResponse(text,copy,question));
    const share = document.createElement("button");
    share.type="button"; share.className="response-action primary"; share.textContent="↗ Compartilhar";
    share.addEventListener("click",()=>shareResponse(text,question));
    actionsEl.append(copy,share);
    wrap.appendChild(actionsEl);
  }
  els.messages.appendChild(wrap);
  scrollMessages();
}

function showTyping(show){ els.typing.classList.toggle("hidden", !show); if(show) scrollMessages(); }

function renderCharacters(){
  els.grid.innerHTML = characters.map(c => `
    <article class="character ${c.id===selected.id?'active':''}" data-id="${c.id}">
      <span class="live-badge">AO VIVO</span>
      <div class="char-portrait"><img src="${c.image}" alt="${c.name}" loading="lazy"></div>
      <div class="char-copy"><h3>${c.name}</h3><p>${c.desc}</p></div>
      <div class="tags">${c.tags.map(t=>`<span>${t}</span>`).join("")}</div>
    </article>`).join("");
  els.grid.querySelectorAll(".character").forEach(card => card.addEventListener("click", () => selectCharacter(card.dataset.id)));
}

function selectCharacter(id){
  const next = characters.find(c => c.id === id);
  if(!next || busy || next.id === selected.id) return;
  const url = new URL(location.href);
  url.searchParams.set("char", next.id);
  url.hash = "chatShell";
  location.href = url.toString();
}

async function getEmbedKey(){
  return await Key.generateEmbedKey({region:RELEVANCE.region, project:RELEVANCE.project, agentId:RELEVANCE.agents[selected.id]});
}

async function connect(){
  if (location.protocol === "file:") {
    sdkReady=false; els.send.disabled=true; setStatus("Abra pelo INICIAR_SITE.bat para ativar o chat real.","error"); return;
  }
  const connectingId=selected.id, connectingName=selected.name;
  try{
    if(!RELEVANCE.agents[selected.id] || RELEVANCE.agents[selected.id].startsWith("COLE_AQUI")){ sdkReady=false; els.send.disabled=true; setStatus(`${connectingName} já está no site, mas falta informar o ID público do agente para conectar o chat.`,"error"); return; }
    setStatus(`Conectando a ${connectingName}...`);
    const key=await getEmbedKey();
    const client=createClient(key);
    const loadedAgent=await Agent.get(RELEVANCE.agents[connectingId],client);
    if(selected.id!==connectingId) return;
    agent=loadedAgent; task=null; sdkReady=true; els.send.disabled=remaining()<=0;
    if(remaining()>0) setStatus(`${connectingName} conectado — pode mandar.`,"ready");
    updateQuotaUI();
  }catch(error){
    console.error("Falha ao conectar agente:",error);
    if(selected.id!==connectingId) return;
    agent=null; task=null; sdkReady=false; els.send.disabled=true;
    setStatus(`Falha técnica ao conectar ${connectingName}. Veja o Console para o erro exato.`,"error");
  }
}

function attachTaskListeners(currentTask){
  currentTask.addEventListener("message",({detail})=>{
    const {message}=detail;
    if(message.isAgent && message.isAgent() && (!message.isThought || !message.isThought())){
      showTyping(false); addMessage(message.text||"","agent",{actions:true,question:lastUserQuestion}); busy=false; els.send.disabled=remaining()<=0;
      if(remaining()>0) setStatus(`${selected.name} conectado — pode mandar.`,"ready");
      updateQuotaUI();
    } else if(message.isTyping && message.isTyping()) showTyping(true);
  });
  currentTask.addEventListener("error",({detail})=>{
    console.error("Relevance AI error",detail); showTyping(false); busy=false; els.send.disabled=false;
    setStatus(`${selected.name} tropeçou na própria personalidade. Tente de novo.`,"error");
  });
}

async function sendMessage(text){
  if(remaining()<=0){ updateQuotaUI(); return; }
  if(!sdkReady||!agent||busy) return;
  busy=true; els.send.disabled=true; setStatus("Reservando uma das suas 3 perguntas...");
  const allowed=await reserveQuota();
  if(!allowed){ busy=false; updateQuotaUI(); return; }
  lastUserQuestion=text; addMessage(text,"user"); els.input.value=""; els.counter.textContent="0/500"; showTyping(true);
  setStatus(`${selected.name} está preparando a resposta...`);
  try{
    if(!task){ task=await agent.sendMessage(text); attachTaskListeners(task); }
    else await agent.sendMessage(text,task);
  }catch(error){
    console.error(error); showTyping(false); busy=false; updateQuotaUI(); setStatus("Falha ao enviar. A pergunta foi reservada para proteger o limite diário; tente novamente mais tarde.","error");
  }
}

function resetConversation(){
  if(busy) return;
  task=null;
  els.messages.innerHTML="";
  addMessage(selected.greeting,"agent",{actions:false});
  if(remaining()>0) setStatus(`${selected.name} conectado — conversa reiniciada.`,"ready");
  updateQuotaUI();
  els.input.focus();
}

els.form.addEventListener("submit",e=>{e.preventDefault();const text=els.input.value.trim();if(text)sendMessage(text)});
els.input.addEventListener("input",()=>{els.counter.textContent=`${els.input.value.length}/500`;els.input.style.height="auto";els.input.style.height=`${Math.min(150,Math.max(58,els.input.scrollHeight))}px`});
els.input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();els.form.requestSubmit()}});
document.querySelectorAll(".quick button").forEach(btn=>btn.addEventListener("click",()=>{els.input.value=btn.dataset.q||"";els.input.dispatchEvent(new Event("input"));els.input.focus()}));
els.change.addEventListener("click",()=>document.getElementById("personagens").scrollIntoView({behavior:"smooth",block:"start"}));
els.newChat.addEventListener("click",resetConversation);

els.selectedAvatar.innerHTML=avatarMarkup(selected);
els.selectedName.textContent=selected.name;
const typingAvatar=document.querySelector("#typingRow .mini-avatar"); if(typingAvatar) typingAvatar.innerHTML=avatarMarkup(selected);
els.input.placeholder=`Pergunte qualquer coisa para ${selected.name}...`;
els.messages.innerHTML="";
addMessage(selected.greeting,"agent",{actions:false});
renderCharacters();
updateQuotaUI();
syncQuota();
connect();
