document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Captura os dados dinâmicos da URL
    const clienteId = urlParams.get('clienteId') || ""; 
    const empresaId = urlParams.get('empresaId') || "";
    // Recebe e decodifica o nome do cliente!
    const nomeCliente = urlParams.get('nomeCliente') ? decodeURIComponent(urlParams.get('nomeCliente')) : "";

    // Trava e preenche as informações
    document.getElementById("clienteId").value = clienteId;
    document.getElementById("empresaId").value = empresaId;
    document.getElementById("nomeCliente").value = nomeCliente; // PREENCHIMENTO MÁGICO AUTOMÁTICO

    document.getElementById("formOrdem").addEventListener("submit", function(e) {
        e.preventDefault();

        let token = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
        if (!token) {
            alert("🚨 ERRO: Token JWT ausente na sessão.");
            return;
        }
        token = token.replace(/^"|"$/g, '').trim();

        const payload = {
            clienteId: parseInt(document.getElementById("clienteId").value),
            empresaId: parseInt(document.getElementById("empresaId").value),
            cliente: document.getElementById("nomeCliente").value, 
            endereco: `${document.getElementById("endereco").value}, ${document.getElementById("numero").value} - ${document.getElementById("complemento").value}`,
            pragaAlvo: document.getElementById("pragaAlvo").value,
            descricao: document.getElementById("descricao").value,
            status: "ABERTA"
        };

        fetch("https://appdedetizacao.onrender.com/api/ordens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            if(response.ok) {
                // Captura a resposta do Spring Boot com o ID gerado no banco 
                const ordemGerada = await response.json(); 
                
                alert(" O.S. REGISTRADA! Redirecionando para roteamento da equipe...");
                
                //  Passa o ID da nova ordem direto para a URL da agenda!
                window.location.href = `agenda.html?ordemId=${ordemGerada.id}`; 
            } else {
                const erroMsg = await response.text();
                console.error("Erro do servidor:", erroMsg);
                alert(`Erro ao emitir ordem (Status ${response.status}). Verifique o console.`);
            }
        })
        .catch(err => alert("Falha crítica de rede."));
    });

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
        }
    };
});