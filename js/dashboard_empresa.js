document.addEventListener("DOMContentLoaded", () => {
    // Carrega os dados reais coletados na autenticação
    const email = localStorage.getItem("userEmail") || localStorage.getItem("logging_email") || "central@pestcontrolx.com";
    const nome = localStorage.getItem("empresaNome") || localStorage.getItem("userName") || "Operador Corporativo";
    
    const userNameElement = document.getElementById("userName");
    const userEmailElement = document.getElementById("userEmail");

    if (userNameElement) userNameElement.innerText = nome;
    if (userEmailElement) userEmailElement.innerText = email;

    // Recuperação segura e aplicação da foto de perfil guardada em cache
    const fotoSalva = localStorage.getItem("pfpBase64");
    if (fotoSalva) {
        if (document.getElementById("imgPfpSidebar")) document.getElementById("imgPfpSidebar").src = fotoSalva;
        if (document.getElementById("imgPfpTopbar")) document.getElementById("imgPfpTopbar").src = fotoSalva;
    }
});

// Sistema de Navegação Fluida por Módulos Internos
function navegar(btnElement, url) {
    if (!btnElement) return;
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    
    const telaExterna = document.getElementById('telaExterna');
    if (telaExterna) {
        telaExterna.src = url;
    }
}

// Controle de Recolhimento Retrátil do Menu Lateral
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (mainContent) mainContent.classList.toggle('expanded');
}

// Upload e Conversão Otimizada de Imagens em Base64
function uploadFotoPerfil(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validação básica de tamanho (limite de 2MB para preservar localStorage)
        if (file.size > 2 * 1024 * 1024) {
            alert("A imagem selecionada é muito pesada. Escolha uma foto de até 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            localStorage.setItem("pfpBase64", base64);
            
            if (document.getElementById("imgPfpSidebar")) document.getElementById("imgPfpSidebar").src = base64;
            if (document.getElementById("imgPfpTopbar")) document.getElementById("imgPfpTopbar").src = base64;
        }
        reader.readAsDataURL(file);
    }
}

// Injeção de Sincronização de Tema para os Iframes Filhos
function sincronizarTemaComIframe() {
    const iframe = document.getElementById('telaExterna');
    if (iframe && iframe.contentWindow) {
        const temaAtual = localStorage.getItem('theme') || 'light';
        // Envia mensagem segura para as telas internas adaptarem suas cores
        iframe.contentWindow.postMessage({ tipo: 'sincronizarTema', tema: temaAtual }, '*');
    }
}

// Listener global para capturar mudanças vindas da tela configuracoestela.html
window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'toggleTheme') {
        const novoTema = event.data.theme;
        if (novoTema === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        sincronizarTemaComIframe();
    }
});

// Encerramento Seguro de Sessão Corporativa
function logout() {
    // Preserva apenas a preferência estética do usuário para o próximo login
    const temaSalvo = localStorage.getItem('theme');
    localStorage.clear();
    if (temaSalvo) localStorage.setItem('theme', temaSalvo);
    
    window.location.href = "index.html";
}