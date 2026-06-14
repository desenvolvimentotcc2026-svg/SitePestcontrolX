document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form-token");
    const btnReenviar = document.getElementById("resendBtn"); // CORRIGIDO: Agora bate com o seu HTML
    const BASE_URL = "https://appdedetizacao.onrender.com";

    if (!form) {
        console.error("Erro: Formulário 'form-token' não foi encontrado na página.");
        return;
    }

    // Inicializa o contador de reenvio assim que a página abre (baseado nos 60s do seu HTML)
    if (btnReenviar) {
        bloquearBotaoTemporariamente(60, "Reenviar Código");
        
        // LISTENER: Reenviar Código
        btnReenviar.addEventListener("click", function (e) {
            e.preventDefault();
            reenviarCodigo();
        });
    }

    // LISTENER: Enviar/Validar Token
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        validarToken();
    });

    // ==========================================
    // FUNÇÃO: VALIDAR TOKEN
    // ==========================================
    async function validarToken() {
        const codigoInput = document.getElementById("codigo");
        const btnSubmit = form.querySelector("button");
        
        if (!codigoInput) {
            alert("Erro interno: Campo de código de verificação não encontrado.");
            return;
        }

        const codigo = codigoInput.value.trim();
        const email = localStorage.getItem("emailTemp") || localStorage.getItem("logging_email");

        if (!email) {
            alert("Sessão expirada ou inválida. Por favor, faça o login novamente.");
            window.location.href = "index.html";
            return;
        }

        if (!codigo) {
            alert("Por favor, insira o código de autenticação enviado ao seu e-mail.");
            return;
        }

        // --- EFEITO CYBER-INDUSTRIAL DE CARREGAMENTO ---
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = "〈 VALIDANDO ACESSO AO TERMINAL 〉";
        btnSubmit.disabled = true;
        btnSubmit.style.boxShadow = "0 0 15px #00ffcc"; 
        btnSubmit.style.transition = "all 0.3s ease";

        try {
            const response = await fetch(`${BASE_URL}/auth/validar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, codigo })
            });

            const data = await response.json();
            console.log("LOG_SECURITY: Resposta de autenticação recebida:", data);

            if (!response.ok) {
                throw new Error(data.message || "Código de autenticação inválido ou expirado.");
            }

            const idEncontrado = data.id || data.empresaId || data.usuarioId;
            
            if (!idEncontrado) {
                console.error("❌ CRÍTICO: O payload do servidor não contém um ID válido.", data);
                throw new Error("Erro de sincronização: O servidor não retornou sua ID de usuário.");
            }

            localStorage.clear();
            sessionStorage.clear();

            localStorage.setItem("token", data.token);
            localStorage.setItem("empresaId", idEncontrado);
            localStorage.setItem("tipoUsuario", data.tipo);
            localStorage.setItem("userName", data.nome || "Operador");
            localStorage.setItem("userEmail", email);

            localStorage.setItem("TOKEN_AUTH", data.token);
            localStorage.setItem("usuario_id", idEncontrado);
            localStorage.setItem("empresaNome", data.nome || "Operador");

            console.log("🟢 Chaves de acesso geradas com sucesso no LocalStorage.");

            const tipoTratado = data.tipo ? data.tipo.toUpperCase() : "EMPRESA";
            
            let destino = "dashboard_empresa.html"; 
            if (tipoTratado === "ADMIN" || tipoTratado === "ADMINISTRADOR") {
                destino = "dashboard_admin.html";
            } else if (tipoTratado === "CLIENTE") {
                destino = "dashboard_cliente.html";
            }

            btnSubmit.innerHTML = "〈 CONEXÃO ESTABELECIDA 〉";
            btnSubmit.style.boxShadow = "0 0 20px #00ff55";
            btnSubmit.style.color = "#00ff55";

            setTimeout(() => {
                window.location.href = destino;
            }, 1000);

        } catch (err) {
            console.error("🚨 FALHA NA AUTENTICAÇÃO DE SEGUNDA ETAPA:", err);
            alert(err.message);
            
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            btnSubmit.style.boxShadow = "";
            btnSubmit.style.color = "";
        }
    }

    // ==========================================
    // FUNÇÃO: REENVIAR CÓDIGO
    // ==========================================
    async function reenviarCodigo() {
        const email = localStorage.getItem("emailTemp") || localStorage.getItem("logging_email");

        if (!email) {
            alert("Sessão expirada. Por favor, faça o login novamente.");
            window.location.href = "index.html";
            return;
        }

        btnReenviar.innerHTML = "〈 SOLICITANDO NOVO TOKEN... 〉";
        btnReenviar.disabled = true;

        try {
            const response = await fetch(`${BASE_URL}/auth/reenviar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erro ao processar reenvio do código.");
            }

            alert("Novo código de verificação enviado com sucesso para o seu e-mail!");
            bloquearBotaoTemporariamente(60, "Reenviar Código");

        } catch (err) {
            console.error("🚨 FALHA AO REENVIAR CÓDIGO:", err);
            alert(err.message);
            bloquearBotaoTemporariamente(5, "Tentar Novamente");
        }
    }

    // Timer de Bloqueio Automático Antibot / Spam
    function bloquearBotaoTemporariamente(segundos, textoFinal) {
        let tempoRestante = segundos;
        btnReenviar.disabled = true;
        btnReenviar.classList.add("disabled"); // Adiciona classe visual se tiver no CSS

        const intervalo = setInterval(() => {
            tempoRestante--;
            btnReenviar.innerHTML = `Reenviar (${tempoRestante}s)`;

            if (tempoRestante <= 0) {
                clearInterval(intervalo);
                btnReenviar.innerHTML = textoFinal;
                btnReenviar.disabled = false;
                btnReenviar.classList.remove("disabled");
            }
        }, 1000);
    }
});