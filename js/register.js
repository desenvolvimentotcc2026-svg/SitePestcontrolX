document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM carregado, vinculando formulário...");

    const form = document.getElementById("registerForm");
    
    // Verificação de segurança: se o form for nulo, o JS vai avisar
    if (!form) {
        console.error("ERRO: Formulário 'registerForm' não encontrado no HTML!");
        return;
    }

    form.addEventListener("submit", async (e) => {
        // Isso força a parada imediata do reload
        e.preventDefault(); 
        console.log("Submit interceptado! Iniciando processamento...");

        const btnSubmit = document.getElementById("btnSubmit");
        btnSubmit.disabled = true;
        btnSubmit.innerText = "Processando...";

        // ... (resto do seu código de coleta de dados permanece igual)
        const body = {
            nome: document.getElementById("nome").value,
            email: document.getElementById("email").value,
            senha: document.getElementById("senha").value,
            tipo: document.getElementById("tipo").value,
            cep: document.getElementById("cep").value,
            rua: document.getElementById("rua").value,
            bairro: document.getElementById("bairro").value,
            numero: document.getElementById("numero").value,
            cnpj: document.getElementById("cnpj").value.replace(/\D/g, '') || "0"
        };

        try {
            console.log("Enviando para o backend:", body);

            const response = await fetch("https://appdedetizacao.onrender.com/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                console.log("Sucesso! Redirecionando...");
                window.location.href = "token.html"; // Redireciona para o token
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Erro no servidor");
            }
        } catch (err) {
            console.error("Erro capturado:", err);
            alert("Erro: " + err.message);
            btnSubmit.disabled = false;
            btnSubmit.innerText = "Finalizar Cadastro";
        }
    });
});