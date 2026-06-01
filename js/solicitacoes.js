const API_URL = "https://appdedetizacao.onrender.com/api"; 

// Função auxiliar para recuperar o Token salvo no login da empresa
function obterToken() {
    return localStorage.getItem("TOKEN_AUTH") || localStorage.getItem("token_usuario");
}

async function carregarOrdens() {
    try {
        const token = obterToken();
        
        // 🚀 ADICIONADO: Cabeçalho de autorização para evitar Erro 401 na listagem
        const response = await fetch(`${API_URL}/solicitacoes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401 || response.status === 403) {
            console.error("Sessão expirada ao carregar ordens.");
            return;
        }

        if (!response.ok) return;
        const ordens = await response.json();
        
        document.getElementById('col-pendentes').innerHTML = '';
        document.getElementById('col-campo').innerHTML = '';
        document.getElementById('col-concluidas').innerHTML = '';

        ordens.forEach(os => {
            let btnAcao = '';
            
            // Padronização dos status vindo do Java
            if (os.status === 'PENDENTE' || os.status === 'NOVAS') {
                btnAcao = `<button class="os-action-btn" onclick="atualizarStatus(${os.id}, 'EM_ANDAMENTO')">ACEITAR CHAMADO</button>`;
            } else if (os.status === 'EM_ANDAMENTO' || os.status === 'EM_ATENDIMENTO') {
                btnAcao = `<button class="os-action-btn" onclick="atualizarStatus(${os.id}, 'CONCLUIDA')">FINALIZAR</button>`;
            } else {
                btnAcao = `<span style="color:var(--text-muted); font-size:11px; font-weight:bold;">ARQUIVADA</span>`;
            }

            // 🚀 CORREÇÃO DO UNDEFINED: Garante compatibilidade com o modelo de dados do Java
            const descricaoCard = os.descricao || os.description || os.texto || "Sem descrição informada";
            const nomeCliente = os.clienteNome || os.cliente || "App Mobile";

            const card = `
                <div class="os-card">
                    <h4 style="color: var(--text-main); margin-bottom: 5px;">#${os.id} - ${descricaoCard}</h4>
                    <p style="color: var(--text-muted); font-size: 12px;">Cliente: ${nomeCliente}</p>
                    ${btnAcao}
                </div>
            `;
            
            if (os.status === 'PENDENTE' || os.status === 'NOVAS') {
                document.getElementById('col-pendentes').innerHTML += card;
            } else if (os.status === 'EM_ANDAMENTO' || os.status === 'EM_ATENDIMENTO') {
                document.getElementById('col-campo').innerHTML += card;
            } else {
                document.getElementById('col-concluidas').innerHTML += card;
            }
        });
    } catch (e) {
        console.error("Erro ao processar ordens:", e);
    }
}

async function atualizarStatus(id, novoStatus) {
    try {
        const token = obterToken();

        // 🚀 CORRIGIDO: Agora envia o Token e valida se salvou com sucesso antes de mover o card
        const response = await fetch(`${API_URL}/ordens/${id}`, { 
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: novoStatus })
        });

        if (response.status === 401 || response.status === 403) {
            alert("Sessão expirada! Por favor, faça login novamente no painel.");
            logout();
            return;
        }

        if (response.ok) {
            // 📢 NOTIFICAÇÃO DE SUCESSO: Alerta visual de sincronia com o aplicativo móvel
            alert(`Chamado #${id} atualizado para [${novoStatus}]! O cliente foi notificado no celular.`);
            carregarOrdens(); 
        } else {
            alert(`Falha ao salvar no banco de dados. Status do servidor: ${response.status}`);
        }
    } catch(err) {
        alert("Erro de conexão com o servidor do Render.");
    }
}

// Inicia e atualiza a cada 10s
carregarOrdens();
setInterval(carregarOrdens, 10000);