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

        const payload = {
            clienteId: parseInt(document.getElementById("clienteId").value),
            empresaId: parseInt(document.getElementById("empresaId").value),
            nomeCliente: document.getElementById("nomeCliente").value, // NOVO
            enderecoCompleto: `${document.getElementById("endereco").value}, ${document.getElementById("numero").value} - ${document.getElementById("complemento").value}`, // NOVO
            pragaAlvo: document.getElementById("pragaAlvo").value,
            descricao: document.getElementById("descricao").value,
            status: "ABERTA"
        };

        fetch("https://appdedetizacao.onrender.com/api/ordens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if(response.ok) {
                alert("🚀 ORDEM DE SERVIÇO EMITIDA! Técnico de campo alertado no painel corporativo.");
                window.close();
            } else {
                alert("Erro ao emitir ordem. Verifique o console.");
            }
        })
        .catch(err => console.error("Erro na requisição:", err));
    });

    // Função para buscar CEP automaticamente
function buscarEnderecoPorCEP(cep) {
    const cepLimpo = cep.replace(/\D/g, ''); // Limpa pontuação
    if (cepLimpo.length === 8) {
        fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
            .then(res => res.json())
            .then(data => {
                if (!data.erro) {
                    document.getElementById("endereco").value = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
                    document.getElementById("numero").focus(); // Joga o cursor pro número
                }
            })
            .catch(err => console.error("Erro na busca de CEP", err));
    }
}
});