const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

document.getElementById("userName").innerText =
    localStorage.getItem("userEmail");

function listarUsuarios() {

    const lista = document.getElementById("listaUsuarios");

    //simulação (depois backend)
    lista.innerHTML = `
        <li>cliente@email.com</li>
        <li>funcionario@email.com</li>
        <li>empresa@email.com</li>
    `;
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}