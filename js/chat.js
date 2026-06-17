var stompClient = null;
var currentSubscription = null;
const BACKEND_BASE = 'https://appdedetizacao.onrender.com';
const RENDER_URL = `${BACKEND_BASE}/ws-pestcontrol-sockjs`; 

const tokenAuth = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
let empresaId = localStorage.getItem("empresaId") || "3"; // Fallback para BugTech
let clienteIdAtivo = null;

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    const campoTexto = document.getElementById('msg');
    const btnTransmitir = document.getElementById('btn-transmitir');

    if (campoTexto) {
        campoTexto.addEventListener("keypress", (e) => {
            if (e.key === "Enter") enviar();
        });
    }
    if (btnTransmitir) {
        btnTransmitir.addEventListener("click", enviar);
    }
    
    carregarClientes();
});

// BUSCA OS CLIENTES DA API E PREENCHE O MENU LATERAL
async function carregarClientes() {
    try {
        const res = await fetch(`${BACKEND_BASE}/api/clientes/empresa/${empresaId}`, {
            headers: { 'Authorization': 'Bearer ' + tokenAuth }
        });
        
        if (res.ok) {
            const clientes = await res.json();
            const listaContatos = document.getElementById('lista-contatos');
            listaContatos.innerHTML = '';
            
            if (clientes.length === 0) {
                listaContatos.innerHTML = `<div class="text-xs text-center text-gray-500 mt-4">Nenhum cliente cadastrado.</div>`;
                return;
            }

            clientes.forEach(c => {
                const nomeExibicao = c.nome ? c.nome : `Cliente #${c.id}`;
                listaContatos.innerHTML += `
                    <div id="contato-${c.id}" class="channel-item" onclick="selecionarCliente(${c.id}, '${nomeExibicao}')">
                        <i class="fa-solid fa-user"></i> ${nomeExibicao}
                    </div>
                `;
            });
            
            // Auto-seleciona o primeiro
            if (clientes.length > 0) {
                selecionarCliente(clientes[0].id, clientes[0].nome ? clientes[0].nome : `Cliente #${clientes[0].id}`);
            }
        }
    } catch (e) {
        console.error("Erro ao buscar clientes:", e);
    }
}

function selecionarCliente(id, nome) {
    if (clienteIdAtivo === id) return; // Evita recarregar se já estiver selecionado

    clienteIdAtivo = id;
    
    // Atualiza o visual
    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    const elAtivo = document.getElementById(`contato-${id}`);
    if (elAtivo) elAtivo.classList.add('active');
    
    const nomeEl = document.getElementById('chat-user-name');
    if (nomeEl) nomeEl.innerText = nome;
    
    // Libera os inputs
    document.getElementById('msg').disabled = false;
    document.getElementById('btn-transmitir').disabled = false;

    // Limpa a tela
    document.getElementById('chat-window').innerHTML = '';
    
    // Conecta ou apenas atualiza a subscrição
    conectarSocket();
}

function conectarSocket() {
    if (!clienteIdAtivo) return;

    // Se já estiver conectado, apenas muda o canal (subscrição)
    if (stompClient && stompClient.connected) {
        atualizarStatusSocket();
        return;
    }

    // Caso contrário, inicia conexão
    var socket = new SockJS(RENDER_URL);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Remove logs no console

    const headers = { 'Authorization': 'Bearer ' + tokenAuth };

    stompClient.connect(headers, function (frame) {
        atualizarStatusSocket();
    }, function(error) {
        console.error("Erro no Socket:", error);
        const status = document.getElementById('status-chat');
        if (status) {
            status.innerText = "DESCONECTADO";
            status.style.color = "#ef4444";
        }
        // Tentativa de reconexão automática
        setTimeout(conectarSocket, 5000); 
    });
}

function atualizarStatusSocket() {
    const statusElement = document.getElementById('status-chat');
    if(statusElement) {
        statusElement.innerText = "SINAL ESTABELECIDO";
        statusElement.style.color = "#22c55e";
    }
    
    // Desinscreve do canal anterior
    if (currentSubscription) {
        currentSubscription.unsubscribe();
    }
    
    // Carrega histórico antes de começar a ouvir em tempo real
    carregarHistoricoNoTerminal();
    
    // Inscreve no novo canal
    currentSubscription = stompClient.subscribe(`/topic/chat/${empresaId}/${clienteIdAtivo}`, function (msg) {
        var dados = JSON.parse(msg.body);
        renderizarMensagem(dados);
    });
}

async function carregarHistoricoNoTerminal() {
    const win = document.getElementById('chat-window');
    try {
        const res = await fetch(`${BACKEND_BASE}/api/chat/historico/${empresaId}/${clienteIdAtivo}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + tokenAuth,
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) throw new Error("Erro histórico");
        
        const mensagens = await res.json();
        mensagens.forEach(renderizarMensagem);
    } catch (e) {
        win.innerHTML = `<p class="text-xs text-center text-gray-500 py-4">Histórico indisponível.</p>`;
    }
}

function renderizarMensagem(dados) {
    const win = document.getElementById('chat-window');
    if (!win) return;

    const textoMsg = dados.conteudo || "";
    if(!textoMsg) return;

    const ehMinha = dados.tipoRemetente === 'EMPRESA';
    const msgRow = document.createElement("div");
    msgRow.className = `msg-row ${ehMinha ? 'me' : 'received'}`;
    
    msgRow.innerHTML = `<div class="bubble">${textoMsg}</div>`;
    
    win.appendChild(msgRow);
    win.scrollTop = win.scrollHeight; // Auto-scroll para baixo
}

function enviar() {
    var input = document.getElementById('msg');
    var texto = input.value.trim();
    
    if (texto !== "" && stompClient && stompClient.connected && clienteIdAtivo) {
        var payload = JSON.stringify({
            'tipoRemetente': 'EMPRESA',
            'conteudo': texto,
            'empresaId': parseInt(empresaId),
            'clienteId': parseInt(clienteIdAtivo)
        });
        
        stompClient.send(`/app/chat/${empresaId}/${clienteIdAtivo}`, {}, payload);
        input.value = '';
        input.focus();
    } else {
        console.warn("Não foi possível enviar: Socket desconectado ou cliente inválido.");
    }
}