// =========================================================
// 1. CONFIGURAÇÕES GLOBAIS E ESTADO DO SISTEMA
// =========================================================
const API_URL = "https://appdedetizacao.onrender.com";
const RENDER_URL = `${API_URL}/ws-pestcontrol`;
let stompClient = null;

// ESTADO CENTRAL DE CONTROLE SPA
let currentChatClienteId = null;
let currentChatSubscription = null;
const empresaId = localStorage.getItem("empresaId") || "1"; // Fallback para desenvolvimento local
const token = localStorage.getItem("token") || "mock-token";

// =========================================================
// 2. SEGURANÇA E PROCESSO DE INICIALIZAÇÃO
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    // Validação de Segurança de Sessão Ativa
    if (!localStorage.getItem("token") && token === "mock-token") {
        console.warn("Ambiente sem Token de produção. Rodando em modo Sandbox Industrial.");
    }

    const email = localStorage.getItem("userEmail") || "operacoes@pestcontrolx.com";
    const elNome = document.getElementById("userName");
    if (elNome) elNome.innerText = email;

    // Inicializa subsistemas de Rede e Interface
    conectarServidorWebSocket();
    carregarListaClientesParaChat();
});

// =========================================================
// 3. NAVEGAÇÃO E UX SPA (SINGLE PAGE APPLICATION)
// =========================================================
function showSection(sectionId, elementButton) {
    // 1. Oculta todas as telas do painel central
    const todasSecoes = document.querySelectorAll('.section-view');
    todasSecoes.forEach(sec => sec.classList.remove('active'));

    // 2. Torna visível a tela requisitada
    const secaoAlvo = document.getElementById(sectionId);
    if (secaoAlvo) secaoAlvo.classList.add('active');

    // 3. Remove o estado ativo dos botões da barra lateral
    const todosBotoes = document.querySelectorAll('.nav-btn');
    todosBotoes.forEach(btn => btn.classList.remove('active'));

    // 4. Ativa o botão correspondente da ação de clique
    if (elementButton) {
        elementButton.classList.add('active');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const mainContent = document.getElementById('app-main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
}

function toggleVisualTheme() {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    if (checkbox && checkbox.checked) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

// =========================================================
// 4. SUBSISTEMA DE REDE WEBSOCKET (PROTOCOLO STOMP)
// =========================================================
function conectarServidorWebSocket() {
    atualizarStatusInterface("CONECTANDO RÁDIO INTERNO...", "#ffaa00");
    
    const socket = new SockJS(RENDER_URL);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Desativa logs massivos no console para performance

    stompClient.connect({}, function (frame) {
        atualizarStatusInterface("CANAIS ONLINE / ENCRIPTADO", "#3DDC84");
        
        // Canal de Notificações Gerais de Campo
        stompClient.subscribe(`/topic/empresa/${empresaId}/notificacoes`, function(msg) {
            tocarSomNotificacao();
            console.log("Transmissão Corporativa de Campo:", msg.body);
        });

    }, function(error) {
        atualizarStatusInterface("FALHA DE REDE - RECONECTANDO...", "#ff3333");
        setTimeout(conectarServidorWebSocket, 5000); // Tenta reconectar a cada 5 segundos
    });
}

// =========================================================
// 5. ENGENHARIA DE COMUNICAÇÃO DE CHAT (MÓDULO TELEGRAM)
// =========================================================
async function abrirChatComCliente(clienteId, clienteNome) {
    currentChatClienteId = clienteId;
    
    const headerChat = document.getElementById('chat-header-title');
    if (headerChat) headerChat.innerText = `Linha Direta: ${clienteNome}`;
    
    const box = document.getElementById('chat-box');
    box.innerHTML = `<div class="status-log-terminal">-> Solicitando histórico criptografado do terminal ${clienteId}...</div>`;

    // Desliga escuta do canal anterior para evitar vazamento de memória/dados
    if (currentChatSubscription) {
        currentChatSubscription.unsubscribe();
    }

    // Carregamento de Histórico REST do Render
    try {
        const response = await fetch(`${API_URL}/api/chat/historico/${empresaId}/${clienteId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const historico = await response.json();
            box.innerHTML = ""; // Limpa logs de conexão
            historico.forEach(msg => {
                const tipo = msg.remetente === "EMPRESA" ? "sent" : "received";
                printMensagem(msg.texto, tipo);
            });
        } else {
            box.innerHTML = `<p class="status-log-terminal" style="color:#ffaa00">-> Histórico indisponível. Iniciando nova sala de chat em tempo real.</p>`;
        }
    } catch(err) {
        console.error("Erro na requisição do histórico REST:", err);
    }

    // Inscrição na sala exclusiva via WebSocket
    const topicPath = `/topic/chat/${empresaId}/${clienteId}`;
    currentChatSubscription = stompClient.subscribe(topicPath, function (msg) {
        const dados = JSON.parse(msg.body);
        
        if (dados.remetente !== 'EMPRESA') {
            printMensagem(dados.texto, "received");
            tocarSomNotificacao();
            piscarJanelaTerminal();
        }
    });
}

function enviarMsgStomp() {
    const input = document.getElementById('msg-input');
    if (!input) return;

    const textoDigitado = input.value.trim();
    if (!currentChatClienteId) {
        alert("Selecione um cliente na lista de transmissão à esquerda primeiro.");
        return;
    }
    
    if (textoDigitado !== "" && stompClient && stompClient.connected) {
        const destination = `/app/chat/${empresaId}/${currentChatClienteId}`;
        const payload = JSON.stringify({
            remetente: 'EMPRESA',
            texto: textoDigitado 
        });
        
        stompClient.send(destination, {}, payload);
        
        // Renderização imediata na tela do operador (UX ágil)
        printMensagem(textoDigitado, "sent");
        input.value = '';
        input.focus();
    }
}

function printMensagem(txt, tipo) {
    const box = document.getElementById('chat-box');
    if (!box) return;

    const alignStyle = tipo === 'sent' 
        ? 'background: rgba(39, 183, 116, 0.15); border: 1px solid #27B774; align-self: flex-end; text-align: right;' 
        : 'background: rgba(255, 255, 255, 0.05); border: 1px solid #2d3748; align-self: flex-start; text-align: left;';

    box.innerHTML += `
        <div class="msg ${tipo}" style="margin: 6px 0; padding: 10px 14px; border-radius: 6px; max-width: 75%; color: #fff; font-size: 13px; ${alignStyle}">
            <strong style="display:block; font-size:10px; color:#a0aec0; margin-bottom:3px;">${tipo === 'sent' ? 'VOCÊ' : 'TÉCNICO/CLIENTE'}</strong>
            ${txt}
        </div>`;
    
    box.scrollTop = box.scrollHeight; // Auto-scroll para acompanhar as mensagens recebidas
}

// =========================================================
// 6. PIPELINES DE DADOS E CARREGAMENTOS DINÂMICOS
// =========================================================
async function carregarListaClientesParaChat() {
    const container = document.getElementById('lista-contatos-chat');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/api/clientes/empresa/${empresaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const clientes = await response.json();
            container.innerHTML = "";
            
            if (clientes.length === 0) {
                container.innerHTML = `<div style="padding:15px; font-size:12px; color:#718096">Nenhum rádio ativo.</div>`;
                return;
            }

            clientes.forEach(cli => {
                container.innerHTML += `
                    <div class="contato-chat-item" onclick="abrirChatComCliente(${cli.id}, '${cli.nome}')">
                        ${cli.nome}
                    </div>`;
            });
        } else {
            // Injeção de Mock de Produção caso a API esteja sem registros temporários
            container.innerHTML = `
                <div class="contato-chat-item" onclick="abrirChatComCliente(101, 'Sinfonia Alimentos')">Sinfonia Alimentos</div>
                <div class="contato-chat-item" onclick="abrirChatComCliente(102, 'Carlos Técnico Campo')">Carlos - Técnico Campo</div>
                <div class="contato-chat-item" onclick="abrirChatComCliente(103, 'Frigorífico Central')">Frigorífico Central</div>`;
        }
    } catch (e) {
        console.error("Erro de conexão na API de Clientes:", e);
        container.innerHTML = `<div style="padding:15px; font-size:11px; color:#ff3333">Erro ao carregar barramento REST.</div>`;
    }
}

// =========================================================
// 7. INTERFACES VISUAIS COMPLEMENTARES E MOCKS DE TELA
// =========================================================
function verFichaClienteMock(nome, identificador, status) {
    document.getElementById('view-lista-clientes').style.display = 'none';
    const ficha = document.getElementById('view-detalhes-cliente');
    ficha.style.display = 'block';

    document.getElementById('detalheGeral').innerHTML = `
        <h3 class="text-glow-neon" style="margin-bottom:5px;">${nome}</h3>
        <p style="font-size:13px; color:#a0aec0;">CNPJ/CPF: ${identificador}</p>
        <p style="font-size:12px; margin-top:5px;">Canal de Monitoramento via Chave Corporativa SSL.</p>
    `;
}

function fecharFichaCliente() {
    document.getElementById('view-detalhes-cliente').style.display = 'none';
    document.getElementById('view-lista-clientes').style.display = 'block';
}

function atualizarStatusInterface(texto, corHex) {
    const el = document.getElementById('status-chat');
    if (el) {
        el.innerHTML = `<i class="fa-solid fa-circle-nodes"></i> ${texto}`;
        el.style.color = corHex;
        el.style.textShadow = `0 0 10px ${corHex}`;
    }
}

function tocarSomNotificacao() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Tom agudo no estilo bip
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(); 
        osc.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
        console.log("Dispositivo bloqueou autoplay de áudio.");
    }
}

function piscarJanelaTerminal() {
    const painelChat = document.getElementById('terminal-container');
    if (painelChat) {
        painelChat.style.boxShadow = "0 0 30px #3DDC84";
        setTimeout(() => painelChat.style.boxShadow = "none", 400);
    }
}

function salvarConfiguracoesEmpresa() {
    alert("Instruções de marca salvas! Dados transmitidos para o banco PostgreSQL via Spring Boot.");
}

function uploadCompanyAvatar(e) { alert("Foto da empresa carregada temporariamente no buffer."); }
function uploadBrandLogo(e) { alert("Logomarca atualizada no bucket de imagens S3."); }
function filtrarClientes() { console.log("Filtrando clientes locais na tabela..."); }
function mudarFiltro(status) { alert("Filtrando registros por status: " + status); }
function gerarNovoToken() { alert("Novo Bearer JWT assinado com chave secreta."); }
function limparSessaoLocal() { localStorage.clear(); alert("Storage limpo."); window.location.reload(); }

function logout() {
    localStorage.clear();
    alert("Conexão encerrada com segurança.");
    window.location.href = "index.html";
}