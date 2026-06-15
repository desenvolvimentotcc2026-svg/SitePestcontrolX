document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Captura os dados dinâmicos da URL
    const clienteId = urlParams.get('clienteId') || "0"; 
    const empresaId = urlParams.get('empresaId') || "0";
    const nomeCliente = urlParams.get('nomeCliente') ? decodeURIComponent(urlParams.get('nomeCliente')) : "";

    // Preenche as informações na tela
    document.getElementById("clienteId").value = clienteId;
    document.getElementById("empresaId").value = empresaId;
    if(nomeCliente) document.getElementById("nomeCliente").value = nomeCliente;

    // Lógica da Imagem (Converte para Base64)
    let fotoBase64 = null;
    document.getElementById('fotoUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('nomeArquivo').innerText = `✅ Arquivo anexado: ${file.name}`;
            const reader = new FileReader();
            reader.onloadend = () => {
                // Pega só a string base64 limpa, tirando o cabeçalho 'data:image/jpeg;base64,'
                fotoBase64 = reader.result.split(',')[1]; 
            };
            reader.readAsDataURL(file);
        }
    });

    // Lógica do PestBot Reativo!
    document.getElementById('pragaAlvo').addEventListener('change', function(e) {
        const botMsg = document.getElementById('pestbot-msg');
        let recomendacao = "";
        let epi = "";

        switch(e.target.value) {
            case "BARATA":
                recomendacao = "Indico formulações em gel para áreas sensíveis e pulverização líquida (Cipermetrina) em frestas.";
                epi = "Luvas nitrílicas, máscara semi-facial e óculos de proteção.";
                break;
            case "ROEDOR":
                recomendacao = "Atenção: Instale porta-iscas mapeados. Verifique se o cliente informou 'Presença de Pets' nos cuidados!";
                epi = "Luvas reforçadas e máscara N95.";
                break;
            case "ESCORPIAO":
                recomendacao = "ALERTA VERMELHO: Risco de acidente grave. O tratamento deve ser focado em microencapsulados e remoção de entulhos.";
                epi = "Botas de couro, luvas de raspa grossa e perneiras.";
                break;
            case "CUPIM":
                recomendacao = "Avaliar a estrutura do imóvel. Prever uso de furadeiras para barreira química no solo ou madeiramento.";
                epi = "Máscara com filtro para vapores orgânicos, óculos e capacete.";
                break;
            default:
                recomendacao = "Aguardando seleção do vetor...";
        }

        botMsg.innerHTML = `
            <p><strong><i class="fa-solid fa-bolt"></i> Análise de Procedimento:</strong></p>
            <p style="margin-top: 8px;">${recomendacao}</p>
            <div class="bot-hint">
                <strong>🛡️ EPIs Obrigatórios para a Viatura:</strong><br>${epi}
            </div>
        `;
    });

    // Submissão do Formulário para a API
    document.getElementById("formOrdem").addEventListener("submit", function(e) {
        e.preventDefault();
        const btn = document.getElementById("btnSalvar");
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> ENVIANDO...";
        btn.disabled = true;

        let token = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
        if (!token) {
            alert("🚨 ERRO: Token JWT ausente na sessão. Volte ao dashboard.");
            btn.disabled = false;
            return;
        }
        token = token.replace(/^"|"$/g, '').trim();

        // Monta o Payload Profissional com todos os campos novos
        const payload = {
            clienteId: parseInt(document.getElementById("clienteId").value),
            empresaId: parseInt(document.getElementById("empresaId").value),
            cliente: document.getElementById("nomeCliente").value, 
            endereco: `${document.getElementById("endereco").value}, ${document.getElementById("numero").value} - ${document.getElementById("complemento").value}`,
            pragaAlvo: document.getElementById("pragaAlvo").value,
            descricao: document.getElementById("descricao").value,
            restricoes: document.getElementById("restricoes").value,
            cuidados: document.getElementById("cuidados").value,
            stringFotoBase64: fotoBase64, // A imagem vai aqui!
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
                const ordemGerada = await response.json(); 
                alert("✅ O.S. REGISTRADA COM SUCESSO! Iniciando roteamento da equipe...");
                // Passa o bastão para a Agenda com o ID real!
                window.location.href = `agenda.html?ordemId=${ordemGerada.id}`; 
            } else {
                const erroMsg = await response.text();
                console.error("Erro do servidor:", erroMsg);
                alert(`Erro ao emitir ordem (Status ${response.status}).`);
                btn.innerHTML = "<i class='fa-solid fa-satellite-dish'></i> TENTAR NOVAMENTE";
                btn.disabled = false;
            }
        })
        .catch(err => {
            alert("Falha crítica de rede externa.");
            btn.innerHTML = "<i class='fa-solid fa-satellite-dish'></i> TENTAR NOVAMENTE";
            btn.disabled = false;
        });
    });

    // Sistema de CEP Automático
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