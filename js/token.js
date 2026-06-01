document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("form-token");
    const BASE_URL = "https://appdedetizacao.onrender.com";

    if (!form) {
        console.error("Erro: Formulário 'form-token' não foi encontrado na página.");
        return;
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        validarToken();
    });

    async function validarToken() {
        const codigoInput = document.getElementById("codigo");
        const btnSubmit = form.querySelector("button");
        
        if (!codigoInput) {
            alert("Erro interno: Campo de código de verificação não encontrado.");
            return;
        }

        const codigo = codigoInput.value.trim();
        
        // Recupera o e-mail buscando por qualquer uma das chaves usadas no Login
        const email = localStorage.getItem("emailTemp") || localStorage.getItem("logging_email");

        // Se o e-mail sumiu do navegador, manda de volta para o login logar novamente
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

            // --- CAPTURA E VALIDAÇÃO DO ID ---
            const idEncontrado = data.id || data.empresaId || data.usuarioId;
            
            if (!idEncontrado) {
                console.error("❌ CRÍTICO: O payload do servidor não contém um ID válido.", data);
                throw new Error("Erro de sincronização: O servidor não retornou sua ID de usuário.");
            }

            // --- LIMPEZA DE RESÍDUOS ANTIGOS ---
            localStorage.clear();
            sessionStorage.clear();

            // --- SALVAMENTO BLINDADO (Compatível com todas as suas telas) ---
            // Salva no formato padrão
            localStorage.setItem("token", data.token);
            localStorage.setItem("empresaId", idEncontrado);
            localStorage.setItem("tipoUsuario", data.tipo);
            localStorage.setItem("userName", data.nome || "Operador");
            localStorage.setItem("userEmail", email);

            // Salva no formato alternativo que o painel de solicitações e o App Android usam
            localStorage.setItem("TOKEN_AUTH", data.token);
            localStorage.setItem("usuario_id", idEncontrado);
            localStorage.setItem("empresaNome", data.nome || "Operador");

            console.log("🟢 Chaves de acesso geradas com sucesso no LocalStorage.");

            // --- REDIRECIONAMENTO INTELIGENTE ---
            // Trata maiúsculas/minúsculas para evitar falha na verificação de tipo
            const tipoTratado = data.tipo ? data.tipo.toUpperCase() : "EMPRESA";
            
            let destino = "dashboard_empresa.html"; // Destino padrão
            if (tipoTratado === "ADMIN" || tipoTratado === "ADMINISTRADOR") {
                destino = "dashboard_admin.html";
            } else if (tipoTratado === "CLIENTE") {
                destino = "dashboard_cliente.html";
            }

            // Feedback de sucesso rápido antes de pular de tela
            btnSubmit.innerHTML = "〈 CONEXÃO ESTABELECIDA 〉";
            btnSubmit.style.boxShadow = "0 0 20px #00ff55";
            btnSubmit.style.color = "#00ff55";

            setTimeout(() => {
                window.location.href = destino;
            }, 1000);

        } catch (err) {
            console.error("🚨 FALHA NA AUTENTICAÇÃO DE SEGUNDA ETAPA:", err);
            alert(err.message);
            
            // Restaura o botão para o estado original caso dê erro para o usuário tentar de novo
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            btnSubmit.style.boxShadow = "";
            btnSubmit.style.color = "";
        }
    }
});