const API_BASE_URL = "https://appdedetizacao.onrender.com";
let map, currentMarker, stompClient = null;
let listaCompletaOrdens = [];
let filtroStatusAtual = 'TODAS';
let routePath = null; 
let routeCoordinates = [];

// 🗺️ 1. Proteção de Inicialização do Mapa
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
            color: '#3DDC84', weight: 4, opacity: 0.8, lineJoin: 'round'
        }).addTo(map);
        
    } catch (error) {
        console.error("🚨 [ERRO MAPA]:", error);
    }
}

// 🔑 2. Resgate Seguro do Token (Tratamento para JWT)
function obterTokenAutomatico() {
    let tokenBruto = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
    if (!tokenBruto) return null;
    
    tokenBruto = tokenBruto.replace(/^"|"$/g, '').trim(); 
    if (tokenBruto.toLowerCase().startsWith("bearer ")) {
        tokenBruto = tokenBruto.substring(7).trim();
    }
    return tokenBruto;
}

// 📊 3. Sincronização de Estatísticas UI
function atualizarContadores() {
    if (!Array.isArray(listaCompletaOrdens)) return;

    let pendentes = 0;
    let andamento = 0;

    listaCompletaOrdens.forEach((ordem) => {
        const status = String(ordem.status || "PENDENTE").toUpperCase();
        if (status === 'PENDENTE' || status === 'ABERTA' || status === 'AGENDADA') pendentes++;
        if (status === 'ACEITA' || status === 'EM_ROTA' || status === 'EM_ANDAMENTO') andamento++;
    });

    const elPendente = document.getElementById("counter-pendente");
    const elAndamento = document.getElementById("counter-andamento");

    if (elPendente) elPendente.innerText = pendentes;
    if (elAndamento) elAndamento.innerText = andamento;
}

// 🎯 4. Sistema de Filtragem em Tela
function filtrarLista(status) {
    filtroStatusAtual = status;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-[#21262d]', 'text-white', 'border-[#3DDC84]');
        btn.classList.add('bg-[#0d1117]', 'text-gray-400', 'border-[#21262d]');
    });

    const btnClicado = document.getElementById(`filter-${status}`);
    if (btnClicado) {
        btnClicado.classList.remove('bg-[#0d1117]', 'text-gray-400', 'border-[#21262d]');
        btnClicado.classList.add('bg-[#21262d]', 'text-white', 'border-[#3DDC84]');
    }

    renderizarListaFiltrada();
}

// 📡 5. O CÉREBRO CORRIGIDO: Carrega estritamente as solicitações da empresa logada
async function carregarSolicitacoes() {
    const token = obterTokenAutomatico();
    const container = document.getElementById("lista-solicitacoes");
    
    if (!container) return;

    if (!token) {
         container.innerHTML = `<div class="text-center py-8 text-red-400 text-xs font-bold">Sessão Expirada ou Não Iniciada. Faça o login.</div>`;
         return;
    }

    // Resgata e limpa o ID da empresa logada
    let idEmpresaBruto = localStorage.getItem("empresaId") || "";
    const idEmpresa = idEmpresaBruto.replace(/^"|"$/g, '').trim(); 

    // 🔥 CORREÇÃO CRÍTICA: Se não houver empresa identificada, barra a execução para evitar vazamento ou erro 500
    if (!idEmpresa || idEmpresa === "null" || idEmpresa === "0") {
        console.error("🚨 [BLOQUEIO] Tentativa de carregar dados sem um empresaId válido no localStorage.");
        container.innerHTML = `<div class="text-center py-8 text-yellow-500 text-xs font-bold">⚠️ Conta de Empresa não identificada. Por favor, refaça o login.</div>`;
        return;
    }

    container.innerHTML = `<p class="text-sm text-gray-500 animate-pulse text-center py-8">Sincronizando Solicitações da Empresa...</p>`;

    try {
        // Alvo estrito: Busca apenas as ordens da empresa logada
        const endpointUrl = `${API_BASE_URL}/api/ordens/empresa/${idEmpresa}`;
        console.log(`🌐 [FETCH CORRIGIDO] Buscando solicitações para a Empresa ID: ${idEmpresa}`);

        const response = await fetch(endpointUrl, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`, 
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                throw new Error("Acesso negado. Token expirado ou sem permissão.");
            }
            throw new Error(`Erro no servidor remoto (Código HTTP: ${response.status})`);
        }

        const data = await response.json();
        
        // Mapeia os dados aceitando tanto arrays puros quanto paginações do Spring (.content)
        listaCompletaOrdens = data.content ? data.content : data;
        
        atualizarContadores();
        renderizarListaFiltrada();

    } catch (error) {
        console.error("🚨 [FALHA NO SUCESSO DO CARREGAMENTO]:", error);
        container.innerHTML = `<div class="text-center py-6 text-red-400 text-xs font-bold">Falha ao puxar dados da empresa: ${error.message}</div>`;
    }
}

// 🖌️ 6. Renderização da Lista (Protegida contra Null Pointers do Java)
function renderizarListaFiltrada() {
    const container = document.getElementById("lista-solicitacoes");
    if (!container) return;
    container.innerHTML = "";

    if (!Array.isArray(listaCompletaOrdens) || listaCompletaOrdens.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 text-center py-8 font-bold">Nenhuma solicitação de serviço pendente para a sua empresa.</p>`;
        return;
    }

    let ordensFiltradas = listaCompletaOrdens;
    if (filtroStatusAtual !== 'TODAS') {
        ordensFiltradas = listaCompletaOrdens.filter(ordem => {
            const status = String(ordem.status || "PENDENTE").toUpperCase();
            if (filtroStatusAtual === 'PENDENTE') return status === 'PENDENTE' || status === 'ABERTA' || status === 'AGENDADA';
            if (filtroStatusAtual === 'EM_ANDAMENTO') return status === 'ACEITA' || status === 'EM_ROTA' || status === 'EM_ANDAMENTO';
            return true;
        });
    }

    if (ordensFiltradas.length === 0) {
        container.innerHTML = `<p class="text-xs text-gray-500 text-center py-8">Nenhum registro encontrado para este filtro.</p>`;
        return;
    }

    // Ordenação (Mais novas primeiro)
    ordensFiltradas.sort((a, b) => b.id - a.id);

    ordensFiltradas.forEach((ordem) => {
        const statusOS = String(ordem.status || "PENDENTE").toUpperCase();
        
        let nomeClienteReal = "Cliente Não Informado";
        if (ordem.cliente && typeof ordem.cliente === 'object') {
            nomeClienteReal = ordem.cliente.nome || "Anônimo";
        } else if (ordem.nomeCliente) {
            nomeClienteReal = ordem.nomeCliente;
        }

        const praga = ordem.pragaAlvo || ordem.praga || 'Vistoria Geral';
        const descricao = ordem.descricao || ordem.restricoes || 'Sem detalhes';

        let statusBadge = '';
        let acaoBtn = '';

        if (statusOS === 'PENDENTE' || statusOS === 'ABERTA' || statusOS === 'AGENDADA') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">A DESPACHAR</span>`;
            acaoBtn = `<button onclick="visualizarEMontarOrdem(${ordem.id})" class="mt-3 w-full bg-[#21262d] hover:border-yellow-500 border border-[#21262d] text-white font-bold text-[11px] py-2 px-3 rounded transition">🔍 AVALIAR OCORRÊNCIA</button>`;
        } else {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] bg-[#3DDC84]/10 text-[#3DDC84] border border-[#3DDC84]/20">EM OPERAÇÃO</span>`;
            acaoBtn = `<button onclick="conectarRastreamento(${ordem.id})" class="mt-3 w-full bg-[#3DDC84] hover:bg-[#2eb369] text-black font-bold text-[11px] py-2 px-3 rounded shadow-[0_0_15px_rgba(61,220,132,0.3)]">🛰️ MONITORAR EQUIPE</button>`;
        }

        const card = document.createElement("div");
        card.className = `neon-border bg-[#0d1117] p-4 rounded-lg flex flex-col justify-between mb-3`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-gray-500">REQ #${ordem.id || '00'}</span>
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

// 📋 7. Detalhamento Dinâmico Lateral
function visualizarEMontarOrdem(idOrdem) {
    const ordem = listaCompletaOrdens.find(o => o.id === idOrdem);
    if (!ordem) return;

    const detalheContainer = document.getElementById("visualizador-os-completa");
    if (!detalheContainer) return;
    
    let clienteIdParaEnvio = 0;
    let nomeParaUrl = "Desconhecido";
    
    if (ordem.cliente && typeof ordem.cliente === 'object') {
        clienteIdParaEnvio = ordem.cliente.id || 0;
        nomeParaUrl = encodeURIComponent(ordem.cliente.nome || "Cliente N/A");
    } else {
        clienteIdParaEnvio = ordem.clienteId || 0;
        nomeParaUrl = encodeURIComponent(ordem.nomeCliente || "Cliente N/A");
    }

    const praga = ordem.pragaAlvo || ordem.praga || 'N/A';
    const descricao = ordem.descricao || ordem.restricoes || 'N/A';
    const imagemBase64 = ordem.stringFotoBase64 ? `<img src="data:image/jpeg;base64,${ordem.stringFotoBase64}" class="w-full h-32 object-cover rounded mt-2 border border-[#21262d]">` : '';

    detalheContainer.innerHTML = `
        <div class="border border-[#3DDC84]/30 bg-[#161b22] p-5 rounded-lg text-white mt-2 shadow-[0_0_10px_rgba(61,220,132,0.1)]">
            <h2 class="text-xs font-bold text-[#3DDC84] mb-3 uppercase tracking-widest border-b border-[#21262d] pb-2">Detalhes Operacionais - #${ordem.id}</h2>
            <div class="flex flex-col gap-2 text-xs mb-5 mt-3">
                <p><b class="text-gray-500">Solicitante:</b> ${decodeURIComponent(nomeParaUrl)}</p>
                <p><b class="text-gray-500">Ameaça Biológica:</b> <span class="text-red-400 font-bold">${praga}</span></p>
                <p><b class="text-gray-500">Relato:</b> ${descricao}</p>
                ${ordem.cuidados ? `<p class="bg-yellow-500/10 text-yellow-500 p-2 rounded mt-1 border border-yellow-500/20"><b class="uppercase">⚠️ Cuidados:</b> ${ordem.cuidados}</p>` : ''}
                ${imagemBase64}
            </div>
            
            <button onclick="abrirFormularioOrdem(${clienteIdParaEnvio}, '${nomeParaUrl}')" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded text-xs transition uppercase tracking-wider">
                ⚡ Despachar Equipe Técnico
            </button>
        </div>`;
}

// 🔥 CORREÇÃO EXTRA: Garante que o formulário de despacho use estritamente a ID correta da empresa sem brechas
function abrirFormularioOrdem(clienteId, nomeCodificado) {
    const idEmpresaBruto = localStorage.getItem("empresaId") || "";
    const idEmpresa = idEmpresaBruto.replace(/^"|"$/g, '').trim();
    
    if (!idEmpresa || idEmpresa === "null" || idEmpresa === "0") {
        alert("Erro crítico: Código identificador da Empresa ausente. Faça login novamente.");
        return;
    }
    
    const url = `form-ordem.html?clienteId=${clienteId}&empresaId=${idEmpresa}&nomeCliente=${nomeCodificado}`;
    window.location.href = url;
}

// 🛰️ 8. Integração Radar Stomp
function conectarRastreamento(idOrdem) {
    const trackingEl = document.getElementById("os-tracking-id");
    if (trackingEl) trackingEl.innerText = `[ OS #${idOrdem} ]`;
    
    routeCoordinates = [];
    if (routePath) routePath.setLatLngs([]);

    if (stompClient && stompClient.connected) {
        stompClient.disconnect(() => abrirCanalWebSocket(idOrdem));
    } else {
         abrirCanalWebSocket(idOrdem);
    }
}

function abrirCanalWebSocket(idOrdem) {
    const statusEl = document.getElementById("ws-status");
    if (statusEl) {
        statusEl.innerText = "SINC... ESPERE";
        statusEl.className = "text-yellow-500 font-bold ml-1";
    }
    
    const socket = new SockJS(`${API_BASE_URL}/ws-pestcontrol-sockjs`);
    stompClient = Stomp.over(socket);

    const token = obterTokenAutomatico();
    stompClient.connect({ "Authorization": `Bearer ${token}` }, function (frame) {
        if (statusEl) {
            statusEl.innerText = "SINAL RECEBIDO";
            statusEl.className = "text-[#3DDC84] font-bold ml-1";
        }
        
        stompClient.subscribe(`/topic/gps/${idOrdem}`, function (response) {
            try {
                const dadosGps = JSON.parse(response.body);
                atualizarPosicaoMapa(dadosGps.latitude, dadosGps.longitude, idOrdem);
            } catch (e) {}
        });
    }, function (error) {
        if (statusEl) {
            statusEl.innerText = "FALHA / RECUSADO";
            statusEl.className = "text-red-500 font-bold ml-1";
        }
    });
}

function atualizarPosicaoMapa(lat, lng, idOrdem) {
    if (!map) return;
    
    const coordenadas = [lat, lng];
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

// Gatilho Principal
window.onload = () => {
    initMap(); 
    carregarSolicitacoes(); 
};