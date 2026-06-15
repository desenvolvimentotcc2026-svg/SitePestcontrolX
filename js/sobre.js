/**
 * PestControlX - Script de Controle do Perfil Institucional
 * Arquivo isolado e focado na integração com a rota JWT inteligente do Render.
 */

const API_URL = "https://appdedetizacao.onrender.com";
const token = localStorage.getItem("token") || localStorage.getItem("TOKEN_AUTH");

// Sincronizador reativo de tema antes do carregamento completo do DOM
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
}

// Aguarda o DOM estar pronto para mapear os elementos e eventos
document.addEventListener("DOMContentLoaded", () => {
    
    // Captura de Elementos do Formulário
    const formSobre = document.getElementById("formSobre");
    const inputSobre = document.getElementById("inputSobre");
    const inputFuncionamento = document.getElementById("inputFuncionamento");
    const inputContatos = document.getElementById("inputContatos");
    const inputLicencaNum = document.getElementById("inputLicencaNum");
    const inputQuimico = document.getElementById("inputQuimico");
    const inputWelcome = document.getElementById("inputWelcome");
    const checkboxesEspecialidades = document.querySelectorAll(".chk-spec");

    // Captura de Elementos do Preview Mobile
    const viewSobre = document.getElementById("viewSobre");
    const viewHorario = document.getElementById("viewHorario");
    const badgeLicenca = document.getElementById("badgeLicenca");
    const containerTags = document.getElementById("previewTags");
    const counterLabel = document.getElementById("counter");
    const statusLabel = document.getElementById("statusSalvar");

    // Atribuição de Eventos Reativos em Tempo Real (Substituindo os inline)
    inputSobre.addEventListener("input", sincronizarCampos);
    inputFuncionamento.addEventListener("input", sincronizarCampos);
    inputLicencaNum.addEventListener("input", sincronizarCampos);
    
    checkboxesEspecialidades.forEach(chk => {
        chk.addEventListener("change", atualizarTagsPreview);
    });

    formSobre.addEventListener("submit", salvarDadosEmpresa);

    // Inicialização da página
    carregarDadosEmpresa();

    // Acessibilidade sensorial calma
    if (localStorage.getItem('sensory_calm') === 'true') {
        document.body.style.transition = "none";
    }

    /**
     * Sincroniza dinamicamente as caixas de texto com o mockup do smartphone
     */
    function sincronizarCampos() {
        const textoSobre = inputSobre.value;
        const funcionamento = inputFuncionamento.value;
        const licenca = inputLicencaNum.value;

        viewSobre.innerText = textoSobre || "Escreva uma descrição para visualizar o anúncio...";
        viewHorario.innerHTML = `<i class="fa-regular fa-clock"></i> ${funcionamento || 'Horário Comercial'}`;
        
        if (licenca) {
            badgeLicenca.innerHTML = `<i class="fa-solid fa-file-shield"></i> ${licenca}`;
            badgeLicenca.style.display = "inline-block";
        } else {
            badgeLicenca.innerHTML = `<i class="fa-solid fa-file-shield"></i> Licenciado`;
        }

        counterLabel.innerText = `${textoSobre.length} / 600 caracteres`;
    }

    /**
     * Atualiza as tags visuais de especialidade dentro do Mockup
     */
    function atualizarTagsPreview() {
        containerTags.innerHTML = "";
        document.querySelectorAll(".chk-spec:checked").forEach(chk => {
            const tag = document.createElement("span");
            tag.style.cssText = "background: var(--bg-global); border: 1px solid var(--border); padding: 3px 8px; border-radius: 6px; font-size: 11px; color: var(--text-main); font-weight: 500;";
            tag.innerText = chk.value;
            containerTags.appendChild(tag);
        });
    }

    /**
     * GET: Puxa o perfil autenticado diretamente via Token (Sem expor IDs)
     */
    async function carregarDadosEmpresa() {
        try {
            // Chamada para a rota inteligente /perfil
            const response = await fetch(`${API_URL}/api/empresas/perfil`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const emp = await response.json();
                
                document.getElementById("viewNome").innerText = emp.nome || "PestControlX Soluções";
                document.getElementById("viewCnpj").innerText = "CNPJ: " + (emp.cnpj || "00.000.000/0001-00");
                
                // Popula os inputs de controle
                inputSobre.value = emp.sobre || "";
                inputFuncionamento.value = emp.janelaAtendimento || "";
                inputContatos.value = emp.contatoPlantao || "";
                inputLicencaNum.value = emp.licencaSanitaria || "";
                inputQuimico.value = emp.responsavelTecnico || "";
                inputWelcome.value = emp.mensagemAutomatica || "";

                // Restaura o estado das especialidades salvas
                if (emp.especialidades && Array.isArray(emp.especialidades)) {
                    checkboxesEspecialidades.forEach(chk => {
                        chk.checked = emp.especialidades.includes(chk.value);
                    });
                }

                sincronizarCampos();
                atualizarTagsPreview();
            } else {
                viewSobre.innerText = "Sessão expirada ou perfil não localizado. Efetue o login novamente.";
            }
        } catch (err) {
            console.error("Erro na comunicação com a API", err);
            viewSobre.innerText = "Falha de rede ao carregar dados do Render.";
        }
    }

    /**
     * PUT: Envia o payload completo sincronizando na rota /perfil orientada a Token
     */
    async function salvarDadosEmpresa(e) {
        e.preventDefault();
        
        statusLabel.innerText = "Sincronizando com o Servidor...";
        statusLabel.style.color = "orange";

        const especialidadesSelecionadas = Array.from(document.querySelectorAll(".chk-spec:checked"))
                                                .map(chk => chk.value);

        // Payload estruturado exatamente igual às propriedades do seu Java Entity
        const payload = {
            sobre: inputSobre.value,
            janelaAtendimento: inputFuncionamento.value,
            contatoPlantao: inputContatos.value,
            licencaSanitaria: inputLicencaNum.value,
            responsavelTecnico: inputQuimico.value,
            mensagemAutomatica: inputWelcome.value,
            especialidades: especialidadesSelecionadas
        };

        try {
            const response = await fetch(`${API_URL}/api/empresas/perfil`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                statusLabel.innerText = "✓ Sincronizado no Render com sucesso!";
                statusLabel.style.color = "var(--primary)";
                sincronizarCampos();
            } else {
                statusLabel.innerText = `Erro ${response.status}: Falha na validação do Perfil no Servidor.`;
                statusLabel.style.color = "red";
            }
        } catch (err) {
            statusLabel.innerText = "Falha crítica de conexão.";
            statusLabel.style.color = "red";
        }
    }
});

// Escuta mensagens de atualização de tema dinâmico vindos da janela pai dashboard
window.addEventListener('message', function(event) {
    if (event.data && event.data.tipo === 'sincronizarTema') {
        if(event.data.tema === 'dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    }
});