document.addEventListener("DOMContentLoaded", function() {
    // Captura os parâmetros dinâmicos injetados pelo link do Android
    const urlParams = new URLSearchParams(window.location.search);
    const clienteId = urlParams.get('clienteId') || "34"; // Fallback se testado fora do app
    const empresaId = urlParams.get('empresaId') || "42";

    // Preenche os inputs travados em modo readonly
    document.getElementById("clienteId").value = clienteId;
    document.getElementById("empresaId").value = empresaId;

    // Envio do Formulário para a API REST do Spring Boot
    document.getElementById("formOrdem").addEventListener("submit", function(e) {
        e.preventDefault();

        // 🔐 PASSO 1: Resgatar o token JWT que foi salvo no solicitacoes.html
        let token = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
        
        if (!token) {
            alert("🚨 ERRO DE SEGURANÇA: Token JWT não encontrado. Volte para o painel principal e insira suas credenciais.");
            return; // Trava a execução aqui se não tiver token
        }

        // Limpa formatações indesejadas caso existam
        token = token.replace(/^"|"$/g, '').trim();

        // 📝 PASSO 2: O Payload com as chaves exatas que o seu Spring Boot espera
        const payload = {
            clienteId: parseInt(document.getElementById("clienteId").value),
            empresaId: parseInt(document.getElementById("empresaId").value),
            cliente: document.getElementById("nomeCliente").value, 
            endereco: `${document.getElementById("endereco").value}, ${document.getElementById("numero").value} - ${document.getElementById("complemento").value}`,
            pragaAlvo: document.getElementById("pragaAlvo").value,
            descricao: document.getElementById("descricao").value,
            status: "ABERTA"
        };

        // 🚀 PASSO 3: O Fetch com o Header de Autorização
        fetch("https://appdedetizacao.onrender.com/api/ordens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // A MÁGICA ACONTECE AQUI! O "crachá" é apresentado.
            },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            if(response.ok) {
                alert("🚀 ORDEM DE SERVIÇO EMITIDA! Banco de dados atualizado com sucesso.");
                window.close(); // Fecha a aba do formulário após o sucesso
            } else {
                const erroMsg = await response.text();
                console.error("Erro do servidor:", erroMsg);
                alert(`Erro ao emitir ordem (Status ${response.status}). Verifique o console.`);
            }
        })
        .catch(err => {
            console.error("Erro de conexão/CORS:", err);
            alert("Falha de rede ao tentar conectar com o Render.");
        });
    });

    // Função para buscar CEP automaticamente (Mantida intacta)
    window.buscarEnderecoPorCEP = function(cep) {
        const cepLimpo = cep.replace(/\D/g, ''); 
        if (cepLimpo.length === 8) {
            fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
                .then(res => res.json())
                .then(data => {
                    if (!data.erro) {
                        document.getElementById("endereco").value = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
                        document.getElementById("numero").focus(); 
                    }
                })
                .catch(err => console.error("Erro na busca de CEP", err));
        }
    };
});