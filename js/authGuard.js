function verificarAuth(tiposPermitidos = []) {

    const token = localStorage.getItem("token");
    const tipo = localStorage.getItem("tipoUsuario");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    if (tiposPermitidos.length && !tiposPermitidos.includes(tipo)) {
        alert("Acesso negado!");
        window.location.href = "index.html";
    }
}