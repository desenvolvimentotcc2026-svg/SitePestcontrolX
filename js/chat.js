var stompClient = null;
var currentSubscription = null;
const BACKEND_BASE = 'https://appdedetizacao.onrender.com';
const RENDER_URL = `${BACKEND_BASE}/ws-pestcontrol-sockjs`; 

const tokenAuth = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
let empresaId = localStorage.getItem("empresaId"); 
if (!empresaId || empresaId === "null" || empresaId === "0") empresaId = "3"; // Fallback BugTech

let clienteIdAtivo = null; // Só define quando clica na lista

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
    
    // Inicia buscando os clientes para a lateral
    carregarClientes();
});

// 🔥 BUSCA OS CLIENTES DA API E PREENCHE O MENU LATERAL
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
            
            // Auto-seleciona o primeiro cliente da lista
            if (clientes.length > 0) {
                selecionarCliente(clientes[0].id, clientes[0].nome ? clientes[0].nome : `Cliente #${clientes[0].id}`);
            }
        }
    } catch (e) {
        console.error("Erro ao buscar clientes:", e);
        document.getElementById('lista-contatos').innerHTML = `<div class="text-xs text-center text-red-500 mt-4">Erro ao buscar rede.</div>`;
    }
}

// 🔥 FUNÇÃO EXECUTADA AO CLICAR EM UM CLIENTE NO MENU ESQUERDO
function selecionarCliente(id, nome) {
    clienteIdAtivo = id;
    
    // Atualiza o visual
    document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`contato-${id}`).classList.add('active');
    document.getElementById('chat-user-name').innerText = nome;
    
    // Libera os inputs
    document.getElementById('msg').disabled = false;
    document.getElementById('btn-transmitir').disabled = false;

    // Limpa a tela e chama o Socket para esse novo cliente
    document.getElementById('chat-window').innerHTML = '';
    conectarSocket();
}

function conectarSocket() {
    if (!clienteIdAtivo) return;

    if (!stompClient || !stompClient.connected) {
        var socket = new SockJS(RENDER_URL);
        stompClient = Stomp.over(socket);
        stompClient.debug = null;

        const headers = { 'Authorization': 'Bearer ' + tokenAuth };

        stompClient.connect(headers, function (frame) {
            atualizarStatusSocket();
        }, function(error) {
            document.getElementById('status-chat').innerText = "RECONECTANDO...";
            document.getElementById('status-chat').style.color = "#ef4444";
            setTimeout(conectarSocket, 5000); 
        });
    } else {
        atualizarStatusSocket();
    }
}

function atualizarStatusSocket() {
    const statusElement = document.getElementById('status-chat');
    if(statusElement) {
        statusElement.innerText = "SINAL ESTABELECIDO";
        statusElement.style.color = "#22c55e";
    }
    
    // Desinscreve do cliente anterior se já estivesse ouvindo um
    if (currentSubscription) {
        currentSubscription.unsubscribe();
    }
    
    carregarHistoricoNoTerminal();
    
    // Inscreve no novo canal Empresa <-> Cliente Específico
    currentSubscription = stompClient.subscribe(`/topic/chat/${empresaId}/${clienteIdAtivo}`, function (msg) {
        var dados = JSON.parse(msg.body);
        renderizarMensagem(dados);
    });
}

function carregarHistoricoNoTerminal() {
    const win = document.getElementById('chat-window');
    fetch(`${BACKEND_BASE}/api/chat/historico/${empresaId}/${clienteIdAtivo}`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + tokenAuth,
            'Content-Type': 'application/json'
        }
    })
    .then(res => res.json())
    .then(mensagens => {
        mensagens.forEach(renderizarMensagem);
    })
    .catch(() => {
        win.innerHTML = `<p class="text-xs text-center text-gray-500 py-4">Histórico offline. Canal em tempo real ativo.</p>`;
    });
}

function renderizarMensagem(dados) {
    const win = document.getElementById('chat-window');
    if (!win) return;

    const ehMinha = dados.tipoRemetente === 'EMPRESA';
    const classeBubble = ehMinha ? 'me' : 'received';
    const textoMsg = dados.conteudo || "";

    if(!textoMsg) return;

    const msgRow = document.createElement("div");
    msgRow.className = `msg-row ${classeBubble}`;
    msgRow.innerHTML = `<div class="bubble">${textoMsg}</div>`;
    
    win.appendChild(msgRow);
    win.scrollTop = win.scrollHeight;
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
            // Não enviamos remetenteId aqui, o Java vai forçar 0L no backend!
        });
        
        stompClient.send(`/app/chat/${empresaId}/${clienteIdAtivo}`, {}, payload);
        input.value = '';
        input.focus();
    }
}