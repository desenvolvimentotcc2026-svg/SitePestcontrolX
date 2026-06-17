/**
 * Arquivo: ordem.js
 * Descrição: Gerencia o cadastro e edição de Ordens de Serviço (O.S.)
 */

document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 1. Captura de dados da URL
    const clienteId = urlParams.get('clienteId') || "0";
    const empresaId = urlParams.get('empresaId') || "0";
    const ordemId = urlParams.get('ordemId');
    const nomeCliente = urlParams.get('nomeCliente') ? decodeURIComponent(urlParams.get('nomeCliente')) : "";
    const enderecoCompletoUrl = urlParams.get('endereco') ? decodeURIComponent(urlParams.get('endereco')) : "";

    // Pré-preenchimento dos campos do formulário
    const elClienteId = document.getElementById("clienteId");
    const elEmpresaId = document.getElementById("empresaId");
    const elNomeCliente = document.getElementById("nomeCliente");
    const elEndereco = document.getElementById("endereco");

    if (elClienteId) elClienteId.value = clienteId;
    if (elEmpresaId) elEmpresaId.value = empresaId;
    if (elNomeCliente && nomeCliente) elNomeCliente.value = nomeCliente;
    if (elEndereco && enderecoCompletoUrl) elEndereco.value = enderecoCompletoUrl;

    // 2. Manipulação de Foto
    let fotoBase64 = null;
    const inputFoto = document.getElementById('fotoUpload');
    if (inputFoto) {
        inputFoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('nomeArquivo').innerText = `✅ Arquivo anexado: ${file.name}`;
                const reader = new FileReader();
                reader.onloadend = () => {
                    fotoBase64 = reader.result.split(',')[1];
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 3. Lógica do PestBot (Dinâmica do Procedimento)
    const elPraga = document.getElementById('pragaAlvo');
    if (elPraga) {
        elPraga.addEventListener('change', function(e) {
            const botMsg = document.getElementById('pestbot-msg');
            if (!botMsg) return;

            let recomendacao = "";
            let epi = "";

            switch(e.target.value) {
                case "BARATA":
                    recomendacao = "Indico formulações em gel para áreas sensíveis and pulverização líquida (Cipermetrina) em frestas.";
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
                    epi = "Nenhum específico.";
            }

            botMsg.innerHTML = `
                <p class="text-[#3DDC84]"><strong><i class="fa-solid fa-bolt"></i> Análise de Procedimento:</strong></p>
                <p style="margin-top: 8px;">${recomendacao}</p>
                <div class="bot-hint border-t border-[#21262d] mt-3 pt-2 text-gray-400">
                    <strong>🛡️ EPIs Obrigatórios para a Viatura:</strong><br>${epi}
                </div>
            `;
        });
    }

    // 4. Submissão do Formulário
    document.getElementById("formOrdem").addEventListener("submit", function(e) {
        e.preventDefault();
        
        const btn = document.getElementById("btnSalvar");
        const pragaSelecionada = document.getElementById("pragaAlvo").value;
        
        if (!pragaSelecionada) {
            Swal.fire('Atenção', 'Por favor, selecione o tipo de praga alvo.', 'warning');
            return;
        }

        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> ENVIANDO...";
        btn.disabled = true;

        let token = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH") || "";
        if (!token) {
            Swal.fire({ icon: 'warning', title: 'Acesso Negado', text: 'Token JWT ausente.', confirmButtonColor: '#3DDC84' });
            btn.innerHTML = "SALVAR ORDEM";
            btn.disabled = false;
            return;
        }
        token = token.replace(/^"|"$/g, '').trim();

        // Montagem de endereço
        const enderecoDigitado = document.getElementById("endereco").value;
        const num = document.getElementById("numero") ? document.getElementById("numero").value : "";
        const compl = document.getElementById("complemento") ? document.getElementById("complemento").value : "";
        let enderecoFinal = enderecoDigitado + (num ? `, ${num}` : "") + (compl ? ` - ${compl}` : "");

        // 🔥 CORREÇÃO 1: Payload ajustado exatamente com a estrutura da sua classe Java OrdemDeServico
        const payload = {
            clienteId: parseInt(document.getElementById("clienteId").value),
            empresaId: parseInt(document.getElementById("empresaId").value),
            cliente: document.getElementById("nomeCliente").value, // String direta mapeando com o backend
            endereco: enderecoFinal,
            pragaAlvo: pragaSelecionada,
            descricao: document.getElementById("descricao").value,
            restricoes: document.getElementById("restricoes").value,
            cuidados: document.getElementById("cuidados").value,
            stringFotoBase64: fotoBase64,
            status: "ABERTA" 
        };

        const endpoint = ordemId 
            ? `https://appdedetizacao.onrender.com/api/ordens/${ordemId}` 
            : "https://appdedetizacao.onrender.com/api/ordens";
        const metodoHttp = ordemId ? "PUT" : "POST";

        fetch(endpoint, {
            method: metodoHttp,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })
        .then(async response => {
            if(response.ok) {
                const data = await response.json();
                const idParaAgenda = ordemId ? ordemId : data.id;
                
                Swal.fire({
                    icon: 'success', title: 'O.S. Registrada!', text: 'Iniciando roteamento da equipe...',
                    showConfirmButton: false, timer: 2500, timerProgressBar: true,
                    background: '#161b22', color: '#3DDC84',
                    didOpen: () => { Swal.showLoading(); }
                }).then(() => {
                    // 🔥 CORREÇÃO 2: PASSANDO A ORDEM COMPLETA NA URL PARA A TELA DE AGENDA
                    window.location.href = `agenda.html?ordemId=${idParaAgenda}` +
                        `&status=ABERTA` +
                        `&empresaId=${payload.empresaId}` +
                        `&clienteId=${payload.clienteId}` +
                        `&nomeCliente=${encodeURIComponent(payload.cliente)}` +
                        `&endereco=${encodeURIComponent(payload.endereco)}` +
                        `&pragaAlvo=${encodeURIComponent(payload.pragaAlvo)}` +
                        `&descricao=${encodeURIComponent(payload.descricao)}` +
                        `&restricoes=${encodeURIComponent(payload.restricoes)}` +
                        `&cuidados=${encodeURIComponent(payload.cuidados)}`; 
                });
            } else {
                throw new Error(`Erro ${response.status}`);
            }
        })
        .catch(err => {
            Swal.fire({ icon: 'error', title: 'Falha no Servidor', text: 'Não foi possível salvar a ordem.', confirmButtonColor: '#d33' });
            btn.innerHTML = "<i class='fa-solid fa-satellite-dish'></i> TENTAR NOVAMENTE";
            btn.disabled = false;
        });
    });

    // 5. Função ViaCEP
    window.buscarEnderecoPorCEP = function(cep) {
        const cepLimpo = cep.replace(/\D/g, ''); 
        if (cepLimpo.length === 8) {
            fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
                .then(res => res.json())
                .then(data => {
                    if (!data.erro) {
                        document.getElementById("endereco").value = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
                        if(document.getElementById("numero")) document.getElementById("numero").focus(); 
                    }
                })
                .catch(() => console.error("Erro ao buscar CEP"));
        }
    };
});