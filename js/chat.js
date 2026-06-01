var stompClient = null;
const BACKEND_BASE = 'https://appdedetizacao.onrender.com';
const RENDER_URL = `${BACKEND_BASE}/ws-pestcontrol-sockjs`; 

// Captura unificada de chaves no localStorage
const tokenAuth = localStorage.getItem("tokenJWT") || localStorage.getItem("token") || localStorage.getItem("token_usuario") || localStorage.getItem("TOKEN_AUTH");
const empresaId = localStorage.getItem("empresaId") || localStorage.getItem("usuario_id") || 1; 
const clienteId = localStorage.getItem("clienteId") || 1; 

document.addEventListener("DOMContentLoaded", () => {
    const campoTexto = document.getElementById('msg');
    const btnTransmitir = document.getElementById('btn-transmitir');

    if (campoTexto) {
        campoTexto.addEventListener("keypress", (e) => {
            if (e.key === "Enter") enviar();
        });
    }

    if (btnTransmitir) {
        btnTransmitir.addEventListener("click", () => {
            enviar();
        });
    }
    
    if (!tokenAuth) {
        atualizarStatusInterface("ERRO: TOKEN JWT AUSENTE", "#DC3545");
        console.error("Impossível conectar WebSocket sem Token JWT mapeado.");
        return;
    }

    conectar();
});

function atualizarStatusInterface(texto, corHex) {
    let el = document.getElementById('status-chat');
    if (el) {
        el.innerText = `> ${texto}`;
        el.style.color = corHex;
    }
}

function carregarHistoricoNoTerminal() {
    const win = document.getElementById('chat-window');
    if (!win) return;

    // Consome a rota mapeada no ChatController.java
    fetch(`${BACKEND_BASE}/api/chat/historico/${empresaId}/${clienteId}`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + tokenAuth,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error("Falha ao recuperar histórico");
        return response.json();
    })
    .then(mensagens => {
        mensagens.forEach(dados => {
            let cor = dados.remetente === 'EMPRESA' ? '#3DDC84' : '#00ffff'; 
            win.innerHTML += `<p class="msg-line" style="font-family: sans-serif;"><span style="color: ${cor}; font-weight: bold;">[${dados.remetente}]</span>: ${dados.texto || dados.conteudo}</p>`;
        });
        win.innerHTML += `<p class="status-log">>> [SISTEMA] Histórico carregado com sucesso. Sincronizado em tempo real.</p>`;
        win.scrollTop = win.scrollHeight;
    })
    .catch(err => {
        console.error("Erro carregando histórico:", err);
        win.innerHTML += `<p class="status-log" style="color: #ff3333;">>> [ALERTA] Não foi possível carregar o histórico de mensagens antigas.</p>`;
    });
}

function tocarSomNotificacao() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } catch (err) {}
}

function conectar() {
    atualizarStatusInterface("AUTENTICANDO NO BARRAMENTO...", "#ffaa00");
    var socket = new SockJS(RENDER_URL);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; // Remove logs poluídos no console do navegador

    const headers = {
        'Authorization': 'Bearer ' + tokenAuth
    };

    stompClient.connect(headers, function (frame) {
        console.log('Conectado com sucesso ao servidor STOMP');
        atualizarStatusInterface("BARRAMENTO ONLINE - CONEXÃO SEGURA", "#3DDC84");
        
        // Limpa avisos iniciais e carrega histórico
        document.getElementById('chat-window').innerHTML = '';
        carregarHistoricoNoTerminal();
        
        const topicoDinamico = `/topic/chat/${empresaId}/${clienteId}`;
        
        stompClient.subscribe(topicoDinamico, function (msg) {
            var dados = JSON.parse(msg.body);
            var chat = document.getElementById('chat-window');
            if (!chat) return;

            let cor = dados.remetente === 'EMPRESA' ? '#3DDC84' : '#00ffff'; 
            chat.innerHTML += `<p class="msg-line" style="font-family: sans-serif;"><span style="color: ${cor}; font-weight: bold;">[${dados.remetente}]</span>: ${dados.texto || dados.conteudo}</p>`;
            chat.scrollTop = chat.scrollHeight;

            if (dados.remetente !== 'EMPRESA') tocarSomNotificacao();
        });
    }, function(error) {
        console.error('Falha na conexão STOMP:', error);
        atualizarStatusInterface("CONEXÃO RECUSADA - RECONECTANDO EM 10S", "#ff3333");
        setTimeout(conectar, 10000); 
    });
}

function enviar() {
    var input = document.getElementById('msg');
    if (!input) return;

    var textoDigitado = input.value.trim();
    
    if (textoDigitado !== "" && stompClient && stompClient.connected) {
        var payload = JSON.stringify({
            'remetente': 'EMPRESA',
            'texto': textoDigitado,
            'conteudo': textoDigitado,
            'empresaId': parseInt(empresaId),
            'clienteId': parseInt(clienteId)
        });
        
        const rotaEnvio = `/app/chat/${empresaId}/${clienteId}`;
        stompClient.send(rotaEnvio, {}, payload);
        input.value = '';
        input.focus();
    } else {
        alert("Aguarde a conexão com o servidor ser estabelecida.");
    }
}