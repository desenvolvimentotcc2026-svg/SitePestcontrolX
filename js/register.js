document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");
    const cepInput = document.getElementById("cep");
    const ruaInput = document.getElementById("rua");
    const bairroInput = document.getElementById("bairro");
    const tipoSelect = document.getElementById("tipo");
    const cnpjGroup = document.getElementById("cnpjGroup");

    const BASE_URL = "https://appdedetizacao.onrender.com";

    // --- BUSCA CEP ---
    cepInput.addEventListener("blur", () => {
        let cep = cepInput.value.replace(/\D/g, '');
        if (cep.length === 8) {
            ruaInput.value = "...";
            bairroInput.value = "...";

            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(res => res.json())
                .then(dados => {
                    if (!dados.erro) {
                        ruaInput.value = dados.logradouro;
                        bairroInput.value = dados.bairro;
                        document.getElementById("numero").focus();
                    } else {
                        alert("CEP não encontrado.");
                    }
                }).catch(() => alert("Erro ao buscar CEP."));
        }
    });

    // --- EXIBIÇÃO CNPJ ---
    tipoSelect.addEventListener("change", () => {
        cnpjGroup.style.display = (tipoSelect.value === "EMPRESA") ? "block" : "none";
    });

    // --- NAVEGAÇÃO ENTRE PASSOS ---
    window.nextStep = function() {
        const nome = document.getElementById("nome").value;
        if (!tipoSelect.value || !nome) {
            alert("Selecione o tipo de perfil e digite seu nome!");
            return;
        }

        tipoSelect.disabled = true;
        document.getElementById("step1").classList.remove("active");
        document.getElementById("step2").classList.add("active");
    };

    window.prevStep = function() {
        tipoSelect.disabled = false;
        document.getElementById("step2").classList.remove("active");
        document.getElementById("step1").classList.add("active");
    };

    // --- SUBMIT FINAL ---
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const body = {
            nome: document.getElementById("nome").value,
            email: document.getElementById("email").value,
            senha: document.getElementById("senha").value,
            tipo: tipoSelect.value, 
            cep: cepInput.value,
            rua: ruaInput.value,
            bairro: bairroInput.value,
            numero: document.getElementById("numero").value
        };

        if (body.tipo === "EMPRESA") {
            body.cnpj = document.getElementById("cnpj").value;
        }

        try {
            const response = await fetch(`${BASE_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Erro no registro");
            }

            alert("Cadastro realizado com sucesso!");
            window.location.href = "index.html"; 
        } catch (err) {
            alert(err.message);
        }
    });
});