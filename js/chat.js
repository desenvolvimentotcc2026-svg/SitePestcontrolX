var stompClient = null;
// 🛠️ CORREÇÃO PRINCIPAL: Rota correta mapeada para SockJS usando HTTPS
const RENDER_URL = 'https://appdedetizacao.onrender.com/ws-pestcontrol-sockjs'; 

// Chaves unificadas para evitar falhas de leitura
const tokenAuth = localStorage.getItem("tokenJWT") || localStorage.getItem("token") || localStorage.getItem("token_usuario") || localStorage.getItem("TOKEN_AUTH");
const empresaId = localStorage.getItem("empresaId") || localStorage.getItem("usuario_id") || 1; 
const clienteId = localStorage.getItem("clienteId") || 1; 

document.addEventListener("DOMContentLoaded", () => {
    const campoTexto = document.getElementById('msg');
    if (campoTexto) {
        campoTexto.addEventListener("keypress", (e) => {
            if (e.key === "Enter") enviar();
        });
    }
    
    if(!tokenAuth) {
        atualizarStatusInterface("ERRO: TOKEN AUSENTE", "#DC3545");
        console.error("Impossível conectar WebSocket sem Token JWT.");
        return;
    }

    conectar();
});

function atualizarStatusInterface(texto, corHex) {
    let el = document.getElementById('status-chat') || document.querySelector('.status-chat');
    if (!el) {
        const elementos = document.querySelectorAll('div, span, button, p');
        for (let item of elementos) {
            if (item.innerText && (item.innerText.includes("SISTEMA") || item.innerText.includes("Conectando") || item.innerText.includes("BARRAMENTO"))) {
                el = item; break;
            }
        }
    }
    if (el) {
        el.innerText = texto;
        el.style.color = corHex;
    }
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
    atualizarStatusInterface("AUTENTICANDO...", "#ffaa00");
    var socket = new SockJS(RENDER_URL);
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 

    const headers = {
        'Authorization': 'Bearer ' + tokenAuth
    };

    stompClient.connect(headers, function (frame) {
        console.log('Conectado de forma segura ao Servidor STOMP');
        atualizarStatusInterface("BARRAMENTO ONLINE", "#3DDC84");
        
        const topicoDinamico = `/topic/chat/${empresaId}/${clienteId}`;
        
        stompClient.subscribe(topicoDinamico, function (msg) {
            var dados = JSON.parse(msg.body);
            var chat = document.getElementById('chat');
            if (!chat) return;

            let cor = dados.remetente === 'EMPRESA' ? '#3DDC84' : '#00ffff'; 
            chat.innerHTML += `<p style="margin: 6px 0; font-family: sans-serif;"><span style="color: ${cor}; font-weight: bold;">[${dados.remetente}]</span>: ${dados.texto || dados.conteudo}</p>`;
            chat.scrollTop = chat.scrollHeight;

            if (dados.remetente !== 'EMPRESA') tocarSomNotificacao();
        });
    }, function(error) {
        console.error('Falha de Segurança/Rede STOMP.', error);
        atualizarStatusInterface("CONEXÃO RECUSADA", "#ff3333");
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
            'remetenteId': empresaId,
            'destinatarioId': clienteId
        });
        
        const rotaEnvio = `/app/chat/${empresaId}/${clienteId}`;
        stompClient.send(rotaEnvio, {}, payload);
        input.value = '';
        input.focus();
    } else {
        alert("Aguarde a conexão com o servidor ser estabelecida.");
    }
}