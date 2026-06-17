const API_BASE_URL = "https://appdedetizacao.onrender.com";
let map, currentMarker, stompClient = null;
let notificationClient = null;
let listaCompletaOrdens = [];
let filtroStatusAtual = 'TODAS';
let routePath = null; 
let routeCoordinates = [];
let trackingIdAtual = null; // 💡 Guarda a OS que está sendo monitorada ativamente no mapa

function initMap() {
    console.log("🗺️ [MAPA] Inicializando contêiner do Leaflet...");
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;
        
        map = L.map('map').setView([-23.55052, -46.633308], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20
        }).addTo(map);

        routePath = L.polyline([], {
            color: '#3DDC84', weight: 4, opacity: 0.8, lineJoin: 'round', className: 'neon-route'
        }).addTo(map);
    } catch (error) { console.error("🚨 [ERRO MAPA]:", error); }
}

function obterTokenAutomatico() {
    let tokenBruto = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
    if (!tokenBruto) return null;
    tokenBruto = tokenBruto.replace(/^"|"$/g, '').trim(); 
    if (tokenBruto.toLowerCase().startsWith("bearer ")) {
        tokenBruto = tokenBruto.substring(7).trim();
    }
    return tokenBruto;
}

function obterEmpresaId() {
    let idEmpresaBruto = localStorage.getItem("empresaId") || "";
    let idEmpresa = idEmpresaBruto.replace(/^"|"$/g, '').trim();
    if (!idEmpresa || idEmpresa === "null" || idEmpresa === "0") idEmpresa = "3";
    return idEmpresa;
}

function atualizarContadores() {
    if (!Array.isArray(listaCompletaOrdens)) return;
    let pendentes = 0, andamento = 0;

    listaCompletaOrdens.forEach((ordem) => {
        const status = String(ordem.status || "PENDENTE").toUpperCase();
        if (status === 'PENDENTE' || status === 'ABERTA' || status === 'AGENDADA') pendentes++;
        if (status === 'ACEITA' || status === 'EM_ROTA' || status === 'EM_ANDAMENTO') andamento++;
    });

    if (document.getElementById("counter-pendente")) document.getElementById("counter-pendente").innerText = pendentes;
    if (document.getElementById("counter-andamento")) document.getElementById("counter-andamento").innerText = andamento;
}

function filtrarLista(status) {
    filtroStatusAtual = status;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-[#21262d]', 'text-white', 'border-[#3DDC84]', 'shadow-[0_0_10px_rgba(61,220,132,0.3)]');
        btn.classList.add('bg-[#0d1117]', 'text-gray-400', 'border-[#21262d]');
    });

    const btnClicado = document.getElementById(`filter-${status}`);
    if (btnClicado) {
        btnClicado.classList.remove('bg-[#0d1117]', 'text-gray-400', 'border-[#21262d]');
        btnClicado.classList.add('bg-[#21262d]', 'text-white', 'border-[#3DDC84]', 'shadow-[0_0_10px_rgba(61,220,132,0.3)]');
    }
    renderizarListaFiltrada();
}

async function carregarSolicitacoes() {
    const token = obterTokenAutomatico();
    const container = document.getElementById("lista-solicitacoes");
    
    if (!container || !token) return;

    const idEmpresa = obterEmpresaId();

    try {
        const response = await fetch(`${API_BASE_URL}/api/ordens/empresa/${idEmpresa}`, {
            method: "GET", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        listaCompletaOrdens = data.content ? data.content : data;
        
        atualizarContadores();
        renderizarListaFiltrada();
        
        // 📡 [REDUNDÂNCIA DE GPS VIA HTTP]: Se houver uma OS monitorada e o WebSocket falhar,
        // capturamos as coordenadas que vierem na requisição HTTP padrão e movemos o mapa!
        if (trackingIdAtual) {
            const ordemAtiva = listaCompletaOrdens.find(o => o.id === trackingIdAtual);
            if (ordemAtiva) {
                const latExibicao = ordemAtiva.latitude || ordemAtiva.lat;
                const lngExibicao = ordemAtiva.longitude || ordemAtiva.lng;
                if (latExibicao && lngExibicao && latExibicao !== 0.0 && lngExibicao !== 0.0) {
                    console.log(`🛰️ [HTTP FALLBACK] Atualizando mapa para OS #${trackingIdAtual}: ${latExibicao}, ${lngExibicao}`);
                    atualizarPosicaoMapa(latExibicao, lngExibicao);
                }
            }
        }
    } catch (error) { console.error("🚨 [ERRO AO CARREGAR OS]:", error); }
}

function conectarCanalNotificacoesGerais() {
    const token = obterTokenAutomatico();
    const idEmpresa = obterEmpresaId();
    if (!token) return;

    try {
        const socket = new SockJS(`${API_BASE_URL}/ws-pestcontrol-sockjs`);
        notificationClient = Stomp.over(socket);
        
        // Ativa logs no console do navegador para monitorar o handshake
        notificationClient.debug = function(str) { console.log("📣 [WS GERAL]: " + str); }; 

        notificationClient.connect({ "Authorization": `Bearer ${token}` }, function (frame) {
            console.log("🟢 Conectado ao canal de notificações da empresa: " + idEmpresa);
            notificationClient.subscribe(`/topic/empresa/${idEmpresa}`, function () {
                console.log("⚡ Nova atualização de OS capturada via WebSocket!");
                carregarSolicitacoes(); 
            });
        }, function (error) {
            console.warn("⚠️ WebSocket Geral instável. O Polling HTTP manterá a aplicação atualizada.");
        });
    } catch (e) {
        console.error("🚨 Erro ao inicializar canal de notificações:", e);
    }
}

function renderizarListaFiltrada() {
    const container = document.getElementById("lista-solicitacoes");
    if (!container) return;
    container.innerHTML = "";

    let ordensFiltradas = listaCompletaOrdens;
    if (filtroStatusAtual !== 'TODAS') {
        ordensFiltradas = listaCompletaOrdens.filter(ordem => {
            const status = String(ordem.status || "PENDENTE").toUpperCase();
            if (filtroStatusAtual === 'PENDENTE') return status === 'PENDENTE' || status === 'ABERTA' || status === 'AGENDADA';
            if (filtroStatusAtual === 'EM_ANDAMENTO') return status === 'ACEITA' || status === 'EM_ROTA' || status === 'EM_ANDAMENTO';
            return true;
        });
    }

    ordensFiltradas.sort((a, b) => b.id - a.id);

    ordensFiltradas.forEach((ordem) => {
        const statusOS = String(ordem.status || "PENDENTE").toUpperCase();
        
        let nomeClienteReal = "Cliente Não Informado";
        if (ordem.cliente) {
            nomeClienteReal = (typeof ordem.cliente === 'object') ? (ordem.cliente.nome || "Anônimo") : ordem.cliente;
        } else if (ordem.nomeCliente) {
            nomeClienteReal = ordem.nomeCliente;
        }

        const praga = ordem.pragaAlvo || ordem.praga || 'Vistoria Geral';
        const descricao = ordem.descricao || ordem.restricoes || 'Sem detalhes';

        let statusBadge = '', acaoBtn = '', bordaNeon = '';

        if (statusOS === 'PENDENTE' || statusOS === 'ABERTA' || statusOS === 'AGENDADA') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">A DESPACHAR</span>`;
            acaoBtn = `<button onclick="visualizarEMontarOrdem(${ordem.id})" class="mt-3 w-full bg-[#21262d] hover:border-yellow-500 border border-[#21262d] text-white font-bold text-[11px] py-2 px-3 rounded transition">🔍 AVALIAR OCORRÊNCIA</button>`;
            bordaNeon = 'border border-[#21262d]';
        } else if (statusOS === 'FINALIZADA' || statusOS === 'CONCLUIDO') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/50">FINALIZADA</span>`;
            acaoBtn = `<button disabled class="mt-3 w-full bg-[#21262d] text-gray-500 font-bold text-[11px] py-2 px-3 rounded">✅ SERVIÇO CONCLUÍDO</button>`;
            bordaNeon = 'border border-[#21262d]';
        } else {
            // Se o monitoramento ativo atual for desta OS, destaca o botão dinamicamente
            const estaMonitorando = trackingIdAtual === ordem.id;
            const textoBotao = estaMonitorando ? "📡 MONITORANDO AGORA..." : "🛰️ MONITORAR EQUIPE";
            const classeBotao = estaMonitorando ? "bg-[#2eb369] text-white" : "bg-[#3DDC84] hover:bg-[#2eb369] text-black";

            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-[#3DDC84]/10 text-[#3DDC84] border border-[#3DDC84]/50 shadow-[0_0_8px_rgba(61,220,132,0.5)]">EM OPERAÇÃO</span>`;
            acaoBtn = `<button onclick="conectarRastreamento(${ordem.id})" class="mt-3 w-full ${classeBotao} font-bold text-[11px] py-2 px-3 rounded shadow-[0_0_15px_rgba(61,220,132,0.3)]">${textoBotao}</button>`;
            bordaNeon = 'border border-[#3DDC84]/30 shadow-[0_0_10px_rgba(61,220,132,0.1)]';
        }

        const card = document.createElement("div");
        card.className = `bg-[#0d1117] p-4 rounded-lg flex flex-col justify-between mb-3 ${bordaNeon}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-gray-500">REQ #${ordem.id || '00'}</span>
                ${statusBadge}
            </div>
            <h3 class="text-white font-bold text-sm uppercase">${praga}</h3>
            <p class="text-xs text-gray-400 mt-1.5 truncate"><b class="text-gray-500">Info:</b> ${descricao}</p>
            <p class="text-xs text-gray-400 mt-0.5"><b class="text-gray-500">Alvo:</b> ${nomeClienteReal}</p>
            ${acaoBtn}
        `;
        container.appendChild(card);
    });
}

function visualizarEMontarOrdem(idOrdem) {
    const ordem = listaCompletaOrdens.find(o => o.id === idOrdem);
    if (!ordem) return;

    const detalheContainer = document.getElementById("visualizador-os-completa");
    if (!detalheContainer) return;
    
    let clienteIdParaEnvio = 0, nomeRealExibicao = "Cliente Não Informado";
    if (ordem.cliente) {
        if (typeof ordem.cliente === 'object') {
            clienteIdParaEnvio = ordem.cliente.id || 0;
            nomeRealExibicao = ordem.cliente.nome || "Cliente N/A";
        } else if (typeof ordem.cliente === 'string') {
            clienteIdParaEnvio = ordem.clienteId || 0;
            nomeRealExibicao = ordem.cliente;
        }
    } else if (ordem.nomeCliente) {
        nomeRealExibicao = ordem.nomeCliente;
        clienteIdParaEnvio = ordem.clienteId || 0;
    }

    const nomeParaUrl = encodeURIComponent(nomeRealExibicao);
    const enderecoCodificado = encodeURIComponent(ordem.endereco || "");
    const praga = ordem.pragaAlvo || ordem.praga || 'N/A';
    const descricao = ordem.descricao || ordem.restricoes || 'N/A';
    const imagemBase64 = ordem.stringFotoBase64 ? `<img src="data:image/jpeg;base64,${ordem.stringFotoBase64}" class="w-full h-32 object-cover rounded mt-2 border border-[#21262d]">` : '';

    detalheContainer.innerHTML = `
        <div class="border border-[#3DDC84]/50 bg-[#161b22] p-5 rounded-lg text-white mt-2 shadow-[0_0_15px_rgba(61,220,132,0.15)]">
            <h2 class="text-xs font-bold text-[#3DDC84] mb-3 uppercase tracking-widest border-b border-[#21262d] pb-2">Detalhes Operacionais - #${ordem.id}</h2>
            <div class="flex flex-col gap-2 text-xs mb-5 mt-3">
                <p><b class="text-gray-500">Solicitante:</b> ${nomeRealExibicao}</p>
                <p><b class="text-gray-500">Localização:</b> ${ordem.endereco || 'Não preenchida'}</p>
                <p><b class="text-gray-500">Ameaça Biológica:</b> <span class="text-red-400 font-bold">${praga}</span></p>
                <p><b class="text-gray-500">Relato:</b> ${descricao}</p>
                ${imagemBase64}
            </div>
            <button onclick="abrirFormularioOrdem(${clienteIdParaEnvio}, '${nomeParaUrl}', ${ordem.id}, '${enderecoCodificado}')" class="w-full bg-[#3DDC84] hover:bg-[#2eb369] text-black font-bold py-2.5 rounded text-xs transition uppercase tracking-wider shadow-[0_0_10px_rgba(61,220,132,0.3)]">
                ⚡ Despachar Equipe Técnica
            </button>
        </div>`;
}

window.abrirFormularioOrdem = function(clienteId, nomeCodificado, ordemId, enderecoCodificado) {
    const idEmpresa = obterEmpresaId();
    window.location.href = `form-ordem.html?clienteId=${clienteId}&empresaId=${idEmpresa}&nomeCliente=${nomeCodificado}&ordemId=${ordemId}&endereco=${enderecoCodificado}`;
}

function conectarRastreamento(idOrdem) {
    trackingIdAtual = idOrdem; // Atualiza globalmente para manter sincronismo
    
    const trackingEl = document.getElementById("os-tracking-id");
    if (trackingEl) trackingEl.innerText = `[ OS #${idOrdem} ]`;
    
    routeCoordinates = [];
    if (routePath) routePath.setLatLngs([]);

    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }

    renderizarListaFiltrada(); // Força atualização visual dos botões

    // Reseta conexões antigas de forma limpa, evitando travar sockets
    if (stompClient) {
        try {
            stompClient.disconnect();
        } catch(e) { console.error("Erro ao limpar canal anterior:", e); }
    }
    
    abrirCanalWebSocket(idOrdem);
}

function abrirCanalWebSocket(idOrdem) {
    const statusEl = document.getElementById("ws-status");
    if (statusEl) {
        statusEl.innerText = "SINC... ESPERE";
        statusEl.className = "text-yellow-500 font-bold ml-1";
    }
    
    try {
        const socket = new SockJS(`${API_BASE_URL}/ws-pestcontrol-sockjs`);
        stompClient = Stomp.over(socket);
        stompClient.debug = function(str) { console.log("🛰️ [WS TELEMETRIA]: " + str); };

        const token = obterTokenAutomatico();
        stompClient.connect({ "Authorization": `Bearer ${token}` }, function () {
            if (statusEl) {
                statusEl.innerText = "SINAL RECEBIDO";
                statusEl.className = "text-[#3DDC84] font-bold ml-1 glow-text";
            }
            
            stompClient.subscribe(`/topic/gps/${idOrdem}`, function (response) {
                try {
                    const dadosGps = JSON.parse(response.body);
                    // 💡 [PARSING TOLERANTE]: Aceita tanto latitude/longitude quanto lat/lng vindos do Back!
                    const lat = dadosGps.latitude || dadosGps.lat;
                    const lng = dadosGps.longitude || dadosGps.lng;
                    
                    if (lat && lng) {
                        atualizarPosicaoMapa(lat, lng);
                    }
                } catch (e) { console.error("Erro ao processar telemetria WS:", e); }
            });
        }, function (error) {
            if (statusEl) {
                statusEl.innerText = "VIA HTTP BACKUP";
                statusEl.className = "text-orange-400 font-bold ml-1";
            }
            console.warn("⚠️ WebSocket de rastreamento caiu. Alternando para redundância HTTP automática.");
        });
    } catch(err) {
        console.error("🚨 Falha ao instanciar canal WS de Rastreamento:", err);
    }
}

function atualizarPosicaoMapa(lat, lng) {
    if (!map || !lat || !lng || (lat === 0.0 && lng === 0.0)) return; 
    
    const coordenadas = [lat, lng];
    
    // Evita duplicar coordenadas estáticas repetidas seguidas na polyline da rota
    if (routeCoordinates.length === 0 || 
        routeCoordinates[routeCoordinates.length - 1][0] !== lat || 
        routeCoordinates[routeCoordinates.length - 1][1] !== lng) {
        routeCoordinates.push(coordenadas);
    }
    
    if (routePath) routePath.setLatLngs(routeCoordinates);

    const radarIcon = L.divIcon({ 
        className: 'custom-gps-marker', 
        html: '<span class="gps-pulse-icon" style="background:#3DDC84;box-shadow:0 0 10px #3DDC84;display:block;width:14px;height:14px;border-radius:50%;"></span>', 
        iconSize: [14, 14] 
    });
    
    if (currentMarker) currentMarker.setLatLng(coordenadas);
    else currentMarker = L.marker(coordenadas, { icon: radarIcon }).addTo(map);
    
    map.flyTo(coordenadas, 16, { animate: true, duration: 1.0 });
}

window.onload = () => {
    initMap(); 
    carregarSolicitacoes(); 
    conectarCanalNotificacoesGerais(); 
    
    // 🛡️ [MECANISMO DE DEFESA CRUCIAL CONTRA QUEDA DE WEBSOCKETS NO RENDER]
    // Executa um Polling HTTP a cada 10 segundos como plano de fundo.
    // Garante que o status da OS mude e que o GPS ande mesmo se a conexão WS fechar!
    setInterval(() => {
        console.log("🔄 [SINC] Atualizando dados via polling HTTP de segurança...");
        carregarSolicitacoes();
    }, 10000);
};