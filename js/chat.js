var stompClient = null;
const BACKEND_BASE = 'https://appdedetizacao.onrender.com';
const RENDER_URL = `${BACKEND_BASE}/ws-pestcontrol-sockjs`; 

const tokenAuth = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
let empresaId = localStorage.getItem("empresaId"); 
if (!empresaId || empresaId === "null" || empresaId === "0") empresaId = "3"; // Fallback BugTech

let clienteId = localStorage.getItem("clienteId");
if (!clienteId || clienteId === "null" || clienteId === "0") clienteId = "34"; // Fallback Cliente

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
    
    conectar();
});

function conectar() {
    var socket = new SockJS(RENDER_URL);
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    const headers = { 'Authorization': 'Bearer ' + tokenAuth };

    stompClient.connect(headers, function (frame) {
        const statusElement = document.getElementById('status-chat');
        if(statusElement) {
            statusElement.innerText = "ONLINE";
            statusElement.style.color = "#22c55e";
        }
        
        document.getElementById('chat-window').innerHTML = '';
        carregarHistoricoNoTerminal();
        
        stompClient.subscribe(`/topic/chat/${empresaId}/${clienteId}`, function (msg) {
            var dados = JSON.parse(msg.body);
            renderizarMensagem(dados);
        });
    }, function(error) {
        document.getElementById('status-chat').innerText = "RECONECTANDO...";
        document.getElementById('status-chat').style.color = "#ef4444";
        setTimeout(conectar, 5000); 
    });
}

function carregarHistoricoNoTerminal() {
    const win = document.getElementById('chat-window');
    fetch(`${BACKEND_BASE}/api/chat/historico/${empresaId}/${clienteId}`, {
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

    // 🔥 Sincronia perfeita com o Backend e Android
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
    
    if (texto !== "" && stompClient && stompClient.connected) {
        //  Payload Unificado
        var payload = JSON.stringify({
            'tipoRemetente': 'EMPRESA',
            'conteudo': texto,
            'empresaId': parseInt(empresaId),
            'clienteId': parseInt(clienteId),
            'remetenteId': parseInt(empresaId)
        });
        
        stompClient.send(`/app/chat/${empresaId}/${clienteId}`, {}, payload);
        input.value = '';
        input.focus();
    }
}