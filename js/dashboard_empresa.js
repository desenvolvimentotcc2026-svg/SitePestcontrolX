document.addEventListener("DOMContentLoaded", () => {
    // Busca dados reais gravados na autenticação corporativa
    const email = localStorage.getItem("userEmail") || "central@pestcontrolx.com";
    const nome = localStorage.getItem("empresaNome") || "PestControlX Matriz";
    
    if (document.getElementById("userName")) {
        document.getElementById("userName").innerText = nome;
    }
    if (document.getElementById("userEmail")) {
        document.getElementById("userEmail").innerText = email;
    }

    // Carrega foto de perfil do cache se existir
    const fotoSalva = localStorage.getItem("pfpBase64");
    if(fotoSalva) {
        if(document.getElementById("imgPfpSidebar")) document.getElementById("imgPfpSidebar").src = fotoSalva;
        if(document.getElementById("imgPfpTopbar")) document.getElementById("imgPfpTopbar").src = fotoSalva;
    }
});

// Sistema de navegação por iframes internos das telas
function navegar(btnElement, url) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    const telaExterna = document.getElementById('telaExterna');
    if (telaExterna) {
        telaExterna.src = url;
    }
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (mainContent) mainContent.classList.toggle('expanded');
}

function uploadFotoPerfil(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            localStorage.setItem("pfpBase64", base64);
            if(document.getElementById("imgPfpSidebar")) document.getElementById("imgPfpSidebar").src = base64;
            if(document.getElementById("imgPfpTopbar")) document.getElementById("imgPfpTopbar").src = base64;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Limpeza segura dos tokens corporativos ao deslogar
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

window.addEventListener('message', function(event) {
    if (event.data === 'toggleTheme') {
        document.body.classList.toggle('dark-theme');
    }
});