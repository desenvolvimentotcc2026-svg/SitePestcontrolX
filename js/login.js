document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const btnEsqueci = document.getElementById("txtEsqueciSenha"); 
    const BASE_URL = "https://appdedetizacao.onrender.com";

    // --- SISTEMA DE SEGURANÇA ---
    let tentativasFalhas = 0;
    const LIMITE_TENTATIVAS = 3;
    const TEMPO_BLOQUEIO = 30; // Segundos

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        localStorage.clear(); 
        sessionStorage.clear();

        if (tentativasFalhas >= LIMITE_TENTATIVAS) {
            alert(" ACESSO BLOQUEADO POR SEGURANÇA. AGUARDE O RESET DOS SISTEMAS.");
            return;
        }

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value.trim();

        if (!email || !senha) {
            alert("Campos vazios detectados. Preencha as credenciais.");
            return;
        }

        const btn = form.querySelector("button");
        const originalText = btn.innerHTML;
        
        // Estética Cyber-Industrial
        btn.innerHTML = "〈 VERIFICANDO CREDENCIAIS 〉";
        btn.disabled = true;
        btn.style.boxShadow = "0 0 15px #00ffcc"; 

        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, senha: senha })
            });

            if (response.ok) {
                const data = await response.json();
                tentativasFalhas = 0;

                localStorage.setItem("emailTemp", email);
                localStorage.setItem("tipoTemp", data.tipo || "");

                if (data.codigo_dev) console.log("LOG_SECURITY: Código DEV interceptado:", data.codigo_dev);

                window.location.href = "token.html"; 
            } else {
                registrarFalha(btn, originalText);
            }
        } catch (error) {
            console.error("FALHA CRÍTICA DE COMUNICAÇÃO:", error);
            alert("Erro na rede. Verifique a conexão com a matriz.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.boxShadow = "";
        }
    });

    // --- LÓGICA DE BLOQUEIO ---
    function registrarFalha(btn, originalText) {
        tentativasFalhas++;
        if (tentativasFalhas >= LIMITE_TENTATIVAS) {
            bloquearSistema(btn);
        } else {
            alert(`CREDENCIAIS INVÁLIDAS. Tentativas restantes: ${LIMITE_TENTATIVAS - tentativasFalhas}`);
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.boxShadow = "";
        }
    }

    function bloquearSistema(btn) {
        btn.disabled = true;
        btn.style.backgroundColor = "#222";
        btn.style.color = "#ff3333";
        btn.style.boxShadow = "0 0 20px #ff3333";
        
        let segundos = TEMPO_BLOQUEIO;
        const cronometro = setInterval(() => {
            btn.innerHTML = `SISTEMA BLOQUEADO (${segundos}s)`;
            segundos--;
            if (segundos < 0) {
                clearInterval(cronometro);
                tentativasFalhas = 0;
                btn.disabled = false;
                btn.innerHTML = "TENTAR NOVAMENTE";
                btn.style.backgroundColor = "";
                btn.style.color = "";
                btn.style.boxShadow = "";
            }
        }, 1000);
    }

    // --- ESQUECI A SENHA ---
    if (btnEsqueci) {
        btnEsqueci.addEventListener("click", async () => {
            const emailRecuperar = prompt("Digite seu e-mail para recuperação:");
            
            if (!emailRecuperar) return;

            btnEsqueci.innerText = "SOLICITANDO...";

            try {
                const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: emailRecuperar })
                });

                if (res.ok) {
                    alert("Protocolo de recuperação enviado! Verifique sua caixa de entrada.");
                } else {
                    alert("E-mail não localizado na base de dados.");
                }
            } catch (err) {
                alert("Erro ao conectar com o serviço de e-mail.");
            } finally {
                btnEsqueci.innerText = "Esqueceu sua senha?";
            }
        });
    }
});