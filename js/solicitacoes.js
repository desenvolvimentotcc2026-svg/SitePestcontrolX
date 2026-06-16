const API_BASE_URL = "https://appdedetizacao.onrender.com";
let map, currentMarker, stompClient = null;
let listaCompletaOrdens = [];
let filtroStatusAtual = 'TODAS';
let routePath = null; 
let routeCoordinates = [];

// Proteção contra falhas catastróficas ao carregar o mapa Leaflet
function initMap() {
    console.log("🗺️ [MAPA] Inicializando contêiner do Leaflet...");
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.warn("⚠️ [MAPA] Elemento div com id='map' não foi encontrado na estrutura HTML desta página.");
            return;
        }
        
        map = L.map('map').setView([-23.55052, -46.633308], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20
        }).addTo(map);

        routePath = L.polyline([], {
            color: '#3DDC84', weight: 4, opacity: 0.8, lineJoin: 'round'
        }).addTo(map);
        
        console.log("✅ [MAPA] Leaflet carregado e renderizado com sucesso.");
    } catch (error) {
        console.error("🚨 [ERRO CRÍTICO MAPA] Falha ao instanciar o Leaflet Map:", error);
        logTerminal(`Erro Mapa: ${error.message}`);
    }
}

function obterTokenAutomatico() {
    console.log("🔑 [AUTH] Buscando token de autenticação no LocalStorage...");
    let tokenBruto = localStorage.getItem("token") || "";
    if (!tokenBruto) {
        console.warn("⚠️ [AUTH] Nenhum token encontrado no localStorage.");
        return null;
    }
    
    // Limpa possíveis aspas residuais geradas por JSON.stringify()
    tokenBruto = tokenBruto.replace(/^"|"$/g, '').trim(); 
    if (tokenBruto.toLowerCase().startsWith("bearer ")) {
        tokenBruto = tokenBruto.substring(7).trim();
    }
    console.log("✅ [AUTH] Token recuperado e normalizado com sucesso.");
    return tokenBruto;
}

function atualizarContadores() {
    console.log("📊 [CONTADORES] Atualizando métricas com base na lista de ordens...");
    if (!Array.isArray(listaCompletaOrdens)) {
        console.error("🚨 [CONTADORES] Erro: 'listaCompletaOrdens' não é um Array válido.", listaCompletaOrdens);
        return;
    }

    let pendentes = 0;
    let andamento = 0;

    listaCompletaOrdens.forEach((ordem) => {
        const status = (ordem.status || "").toUpperCase();
        if (status === 'PENDENTE' || status === 'ABERTA') pendentes++;
        if (status === 'ACEITO' || status === 'EM_ROTA' || status === 'EM_ANDAMENTO') andamento++;
    });

    console.log(`📈 [CONTADORES] Resultados apurados -> Pendentes/Abertas: ${pendentes} | Em Operação: ${andamento}`);

    const elPendente = document.getElementById("counter-pendente");
    const elAndamento = document.getElementById("counter-andamento");

    if (elPendente) elPendente.innerText = pendentes;
    if (elAndamento) elAndamento.innerText = andamento;
}

function filtrarLista(status) {
    console.log(`🎯 [FILTRO] Alterando visualização para a categoria: [${status}]`);
    filtroStatusAtual = status;

    // Limpa as cores ativas de todos os botões de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-[#21262d]', 'text-white', 'border-[#3DDC84]');
        btn.classList.add('bg-[#0d1117]', 'text-gray-400', 'border-[#21262d]');
    });

    // Pinta apenas o botão clicado
    const btnClicado = document.getElementById(`filter-${status}`);
    if (btnClicado) {
        btnClicado.classList.remove('bg-[#0d1117]', 'text-gray-400', 'border-[#21262d]');
        btnClicado.classList.add('bg-[#21262d]', 'text-white', 'border-[#3DDC84]');
    } else {
        console.warn(`⚠️ [FILTRO] Botão correspondente ao filtro 'filter-${status}' não existe no HTML.`);
    }

    renderizarListaFiltrada();
}

async function carregarSolicitacoes() {
    console.log("📡 [API] Iniciando sincronização de dados com o servidor...");
    const token = obterTokenAutomatico();
    
    // Limpeza rigorosa de aspas no ID
    let idEmpresaBruto = localStorage.getItem("empresaId") || "";
    const idEmpresa = idEmpresaBruto.replace(/^"|"$/g, '').trim(); 
    
    console.log(`🔍 [PROPRIEDADES ATUAIS] ID Empresa Limpo: "${idEmpresa}" | Token Presente: ${token ? "SIM" : "NÃO"}`);

    const container = document.getElementById("lista-solicitacoes");
    if (!container) {
        console.error("🚨 [ERRO DE ESTRUTURA HTML] Não foi possível encontrar a div com id='lista-solicitacoes'!");
        alert("Erro estrutural: Insira <div id='lista-solicitacoes'></div> no corpo do seu HTML.");
        return;
    }

    if (!idEmpresa || !token) {
         console.error("❌ [LOGIN REQUERIDO] Credenciais ausentes no LocalStorage. Abortando requisição.");
         container.innerHTML = `
            <div class="text-center py-8 px-4 border border-dashed border-red-500/30 rounded-lg bg-red-500/5">
                <p class="text-xs text-red-400 font-bold uppercase mb-2">Sessão Expirada ou Não Iniciada</p>
                <p class="text-[10px] text-gray-500 mb-1">Faça o login novamente para autenticar o sistema.</p>
                <p class="text-[9px] text-gray-600">Contexto técnico -> ID Empresa: ${idEmpresa ? 'OK' : 'FALTANDO'} | Token: ${token ? 'OK' : 'FALTANDO'}</p>
            </div>`;
         return;
    }

    container.innerHTML = `<p class="text-sm text-gray-500 animate-pulse text-center py-8">Sincronizando com a Central...</p>`;

    try {
        // CORREÇÃO AQUI: Adicionado ?size=100&sort=id,desc para driblar limite de paginação do Spring Boot
        const endpointUrl = `${API_BASE_URL}/api/ordens/empresa/${idEmpresa}?size=100&sort=id,desc`;
        console.log(`🌐 [FETCH REQUEST] GET -> ${endpointUrl}`);

        const response = await fetch(endpointUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`, 
                "Content-Type": "application/json"
            }
        });
        
        console.log(`📥 [API RESPONSE] HTTP Status recebido: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status} - Servidor recusou a requisição.`);
        }
        
        const data = await response.json();
        console.log("📦 [DADOS BRUTOS DO JAVA]:", data);
        
        // Tratamento caso o Java utilize paginação do Spring Data (.content) ou retorne List direto
        listaCompletaOrdens = data.content ? data.content : data;
        console.log("📝 [LISTA TRATADA E ARMAZENADA]:", listaCompletaOrdens);
        
        atualizarContadores();
        renderizarListaFiltrada();

    } catch (error) {
        console.error("🚨 [EXCEÇÃO CAPTURADA NO FETCH]:", error);
        container.innerHTML = `
            <div class="text-center py-6 border border-dashed border-red-500/30 rounded bg-red-500/5 px-4">
                <p class="text-xs text-red-400 font-bold uppercase">🚨 Falha na Comunicação</p>
                <p class="text-[10px] text-gray-400 mt-2">${error.message}</p>
                <p class="text-[9px] text-gray-500 mt-1">Verifique a aba 'Network'/'Rede' do F12 para ver a resposta exata da nuvem.</p>
            </div>`;
        logTerminal(`Erro API: ${error.message}`);
    }
}

function renderizarListaFiltrada() {
    console.log(`🖌️ [RENDER] Renderizando cards baseados no filtro atual: '${filtroStatusAtual}'`);
    const container = document.getElementById("lista-solicitacoes");
    if (!container) return;
    
    container.innerHTML = "";

    if (!Array.isArray(listaCompletaOrdens) || listaCompletaOrdens.length === 0) {
        console.warn("⚠️ [RENDER] A lista de ordens está vazia ou não é um array configurado.");
        container.innerHTML = `<p class="text-xs text-gray-500 text-center py-8 font-bold tracking-wider uppercase">Nenhuma ordem cadastrada no Banco</p>`;
        return;
    }

    let ordensFiltradas = listaCompletaOrdens;
    if (filtroStatusAtual !== 'TODAS') {
        ordensFiltradas = listaCompletaOrdens.filter(ordem => {
            const status = (ordem.status || "").toUpperCase();
            if (filtroStatusAtual === 'PENDENTE') return status === 'PENDENTE' || status === 'ABERTA';
            if (filtroStatusAtual === 'EM_ANDAMENTO') return status === 'ACEITO' || status === 'EM_ROTA' || status === 'EM_ANDAMENTO';
            return true;
        });
    }

    console.log(`📊 [RENDER] Quantidade após aplicação de regras de filtro: ${ordensFiltradas.length} de ${listaCompletaOrdens.length}`);

    if (ordensFiltradas.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 text-center py-8">Nenhuma ordem nesta categoria.</p>`;
        return;
    }

    ordensFiltradas.forEach((ordem, index) => {
        if (!ordem.id) {
            console.warn(`⚠️ [RENDER] Objeto na posição [${index}] não possui atributo '.id' legível.`, ordem);
        }

        const statusOS = (ordem.status || "PENDENTE").toUpperCase();
        
        let nomeClienteReal = "Cliente Não Registrado";
        if (ordem.cliente && typeof ordem.cliente === 'object') {
            nomeClienteReal = ordem.cliente.nome || "Cliente (Objeto sem nome)";
        } else {
            nomeClienteReal = ordem.cliente || ordem.nomeCliente || "Cliente Não Registrado";
        }

        const praga = ordem.praga || ordem.pragaAlvo || 'Vistoria Geral';
        const descricao = ordem.descricao || ordem.restricoes || 'N/A';

        let statusBadge = '';
        let acaoBtn = '';

        if (statusOS === 'PENDENTE' || statusOS === 'ABERTA') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">A DESPACHAR</span>`;
            acaoBtn = `<button onclick="visualizarEMontarOrdem(${ordem.id})" class="mt-3 w-full bg-[#21262d] hover:border-yellow-500 border border-[#21262d] text-white font-bold text-[11px] py-2 px-3 rounded transition">🔍 AVALIAR OCORRÊNCIA</button>`;
        } else {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-[#3DDC84]/10 text-[#3DDC84] border border-[#3DDC84]/20">EM OPERAÇÃO</span>`;
            acaoBtn = `<button onclick="conectarRastreamento(${ordem.id})" class="mt-3 w-full bg-[#3DDC84] hover:bg-[#2eb369] text-black font-bold text-[11px] py-2 px-3 rounded transition shadow-[0_0_15px_rgba(61,220,132,0.3)]">🛰️ CONECTAR RADAR</button>`;
        }

        const card = document.createElement("div");
        card.className = `neon-border bg-[#0d1117] p-4 rounded-lg flex flex-col justify-between mb-3`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-gray-500">REQ #${ordem.id || '???'}</span>
                ${statusBadge}
            </div>
            <h3 class="text-white font-bold text-sm uppercase">${praga}</h3>
            <p class="text-xs text-gray-400 mt-1.5"><b class="text-gray-500">Info:</b> ${descricao}</p>
            <p class="text-xs text-gray-400 mt-0.5"><b class="text-gray-500">Alvo:</b> ${nomeClienteReal}</p>
            ${acaoBtn}
        `;
        container.appendChild(card);
    });
}

function visualizarEMontarOrdem(idOrdem) {
    console.log(`📋 [DETALHES] Abrindo visualizador dinâmico para a OS ID: #${idOrdem}`);
    const ordem = listaCompletaOrdens.find(o => o.id === idOrdem);
    if (!ordem) {
        console.error(`🚨 [DETALHES] Erro Fatal: A OS #${idOrdem} sumiu ou não existe na memória cache local!`);
        return;
    }

    const detalheContainer = document.getElementById("visualizador-os-completa");
    if (!detalheContainer) {
        console.error("🚨 [ERRO DE DESIGN HTML] Div container 'visualizador-os-completa' está ausente na tela.");
        return;
    }
    
    const clienteId = ordem.clienteId || (ordem.cliente && ordem.cliente.id) || 0;
    
    let nomeParaUrl = "Cliente N/A";
    if (ordem.cliente && typeof ordem.cliente === 'object') {
        nomeParaUrl = encodeURIComponent(ordem.cliente.nome || "Cliente");
    } else {
        nomeParaUrl = encodeURIComponent(ordem.cliente || ordem.nomeCliente || "Cliente N/A");
    }

    const praga = ordem.praga || ordem.pragaAlvo || 'N/A';
    const descricao = ordem.descricao || ordem.restricoes || 'N/A';
    const imagemBase64 = ordem.stringFotoBase64 ? `<img src="data:image/jpeg;base64,${ordem.stringFotoBase64}" class="w-full h-32 object-cover rounded mt-2 border border border-[#21262d]">` : '';

    detalheContainer.innerHTML = `
        <div class="border border-[#3DDC84]/30 bg-[#161b22] p-5 rounded-lg text-white mt-2 shadow-[0_0_10px_rgba(61,220,132,0.1)]">
            <h2 class="text-xs font-bold text-[#3DDC84] mb-3 uppercase tracking-widest border-b border-[#21262d] pb-2">Detalhes Operacionais</h2>
            <div class="flex flex-col gap-2 text-xs mb-5 mt-3">
                <p><b class="text-gray-500">Solicitante:</b> ${decodeURIComponent(nomeParaUrl)}</p>
                <p><b class="text-gray-500">Ameaça Biológica:</b> <span class="text-red-400 font-bold">${praga}</span></p>
                <p><b class="text-gray-500">Relato:</b> ${descricao}</p>
                ${ordem.cuidados ? `<p class="bg-yellow-500/10 text-yellow-500 p-2 rounded mt-1 border border-yellow-500/20"><b class="uppercase">⚠️ Atenção Especial:</b> ${ordem.cuidados}</p>` : ''}
                ${imagemBase64}
            </div>
            
            <button onclick="abrirFormularioOrdem(${clienteId}, '${nomeParaUrl}')" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded text-xs transition uppercase tracking-wider">
                ⚡ Despachar Equipe Técnica
            </button>
        </div>`;
}

function abrirFormularioOrdem(clienteId, nomeCodificado) {
    const idEmpresaBruto = localStorage.getItem("empresaId") || "";
    const idEmpresa = idEmpresaBruto.replace(/^"|"$/g, '').trim();
    const redirectUrl = `form-ordem.html?clienteId=${clienteId}&empresaId=${idEmpresa}&nomeCliente=${nomeCodificado}`;
    console.log(`🔀 [REDIRECIONAMENTO] Encaminhando gestor para montagem nativa da ordem -> URL: ${redirectUrl}`);
    window.location.href = redirectUrl;
}

function conectarRastreamento(idOrdem) {
    console.log(`🛰️ [WEBSOCKET] Requisição de acoplamento com fluxo de rastreio para OS #${idOrdem}`);
    const trackingEl = document.getElementById("os-tracking-id");
    if (trackingEl) trackingEl.innerText = `[ OS #${idOrdem} ]`;
    
    routeCoordinates = [];
    if (routePath) routePath.setLatLngs([]);

    if (stompClient && stompClient.connected) {
        console.log("🔄 [WEBSOCKET] Conexão prévia ativa identificada. Realizando reset antes do novo acoplamento...");
        stompClient.disconnect(() => abrirCanalWebSocket(idOrdem));
    } else {
        abrirCanalWebSocket(idOrdem);
    }
}

function abrirCanalWebSocket(idOrdem) {
    logTerminal(`Requisitando link com Satélite [OS #${idOrdem}]...`);
    const statusEl = document.getElementById("ws-status");
    
    if (statusEl) {
        statusEl.innerText = "SINC... ESPERE";
        statusEl.className = "text-yellow-500 font-bold ml-1";
    }
    
    console.log(`🔌 [STOMP CONECT] Estabelecendo ponte SockJS para: ${API_BASE_URL}/ws-pestcontrol-sockjs`);
    const socket = new SockJS(`${API_BASE_URL}/ws-pestcontrol-sockjs`);
    stompClient = Stomp.over(socket);
    stompClient.debug = function(str) { console.log("🖧 [STOMP INTERNAL LOG]", str); }; 

    const token = obterTokenAutomatico();
    stompClient.connect({ "Authorization": `Bearer ${token}` }, function (frame) {
        console.log("✅ [STOMP CONNECTED] Autenticação WebSocket efetuada com sucesso!");
        if (statusEl) {
            statusEl.innerText = "SINAL RECEBIDO";
            statusEl.className = "text-[#3DDC84] font-bold ml-1 drop-shadow-[0_0_5px_rgba(61,220,132,0.5)]";
        }
        logTerminal(`Canal seguro estabelecido com viatura técnica.`);
        
        const topicPath = `/topic/gps/${idOrdem}`;
        console.log(`📌 [STOMP SUBSCRIBE] Registrando escuta no canal: ${topicPath}`);
        
        stompClient.subscribe(topicPath, function (response) {
            console.log("📥 [STOMP FRAME] Nova coordenada capturada em tempo real:", response.body);
            try {
                const dadosGps = JSON.parse(response.body);
                atualizarPosicaoMapa(dadosGps.latitude, dadosGps.longitude, idOrdem);
            } catch (e) {
                console.error("🚨 [WEBSOCKET JSON ERROR] Falha ao processar dados GPS:", e);
                logTerminal(`Pacote corrompido descartado.`);
            }
        });
    }, function (error) {
        console.error("🚨 [STOMP CONNECTION ERROR] Erro na comunicação de pacotes:", error);
        if (statusEl) {
            statusEl.innerText = "SINAL PERDIDO";
            statusEl.className = "text-red-500 font-bold ml-1";
        }
        logTerminal(`[ERRO] Transmissão interrompida.`);
    });
}

function atualizarPosicaoMapa(lat, lng, idOrdem) {
    if (!map) {
        console.error("🚨 [MAP ENGINE ERROR] Tentativa de plotar coordenadas sem o mapa estar carregado na div.");
        return;
    }
    
    const coordenadas = [lat, lng];
    console.log(`📍 [PLOT GPS] Reposicionando marcador da viatura #${idOrdem} -> Lat: ${lat}, Lng: ${lng}`);
    logTerminal(`Viatura #${idOrdem} Coordenadas: ${lat.toFixed(5)} / ${lng.toFixed(5)}`);

    routeCoordinates.push(coordenadas);
    if (routePath) routePath.setLatLngs(routeCoordinates);

    const radarIcon = L.divIcon({ className: 'custom-gps-marker', html: '<span class="gps-pulse-icon"></span>', iconSize: [14, 14] });
    
    if (currentMarker) {
        currentMarker.setLatLng(coordenadas);
    } else {
        currentMarker = L.marker(coordenadas, { icon: radarIcon }).addTo(map);
    }

    map.flyTo(coordenadas, 16, { animate: true, duration: 1.0 });
}

let simInterval = null;
function acionarModoDemonstracao() {
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
        console.log("🛑 [SIMULADOR] Loop encerrado pelo operador.");
        logTerminal("[SISTEMA] Modo simulação encerrado.");
        const statusEl = document.getElementById("ws-status");
        if (statusEl) {
            statusEl.innerText = "AGUARDANDO";
            statusEl.className = "text-gray-500 font-bold ml-1";
        }
        return;
    }

    console.log("🚀 [SIMULADOR] Modo de testes de bancada ativado localmente.");
    logTerminal("[SIMULAÇÃO] Iniciando rastreio fantasma...");
    
    const statusEl = document.getElementById("ws-status");
    if (statusEl) {
        statusEl.innerText = "MOCK ATIVADO";
        statusEl.className = "text-purple-400 font-bold ml-1";
    }
    
    const trackingEl = document.getElementById("os-tracking-id");
    if (trackingEl) trackingEl.innerText = "[ MOCK TEST ]";

    let latMock = -23.5614;
    let lngMock = -46.6565;
    routeCoordinates = [];
    if (routePath) routePath.setLatLngs([]);

    simInterval = setInterval(() => {
        latMock += (Math.random() - 0.2) * 0.0005;
        lngMock += (Math.random() - 0.2) * 0.0005;
        atualizarPosicaoMapa(latMock, lngMock, 999);
    }, 2000);
}

function logTerminal(mensagem) {
    const logBox = document.getElementById("terminal-log");
    if(!logBox) return;
    const logItem = document.createElement("span");
    logItem.className = "block text-gray-400 mb-1";
    logItem.innerHTML = `<span class="text-[#21262d] font-bold">[${new Date().toLocaleTimeString()}]</span> <span class="text-[#3DDC84]">></span> ${mensagem}`;
    logBox.insertBefore(logItem, logBox.firstChild);
}

// Inicialização protegida contra erros sequenciais
window.onload = () => {
    console.log("🏁 [SISTEMA] DOM Completamente montado. Disparando rotinas obrigatórias...");
    initMap(); 
    carregarSolicitacoes(); 
};