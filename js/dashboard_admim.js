document.addEventListener("DOMContentLoaded", () => {
    // Verificação de segurança mockada
    const token = localStorage.getItem("adminToken");
    // Se quiser testar o redirect, descomente abaixo:
    // if (!token) window.location.href = "login.html";

    listarEmpresas();
});

function listarEmpresas() {
    const tbody = document.getElementById("listaEmpresas");
    
    // Mock Data representando o banco de dados do TCC
    const empresas = [
        { id: "TEN-001", nome: "BugTech Soluções Ambientais", plano: "Pro", status: "Ativo" },
        { id: "TEN-002", nome: "MataPragas Express", plano: "Basic", status: "Ativo" },
        { id: "TEN-003", nome: "Controle Total Dedetizadora", plano: "Pro", status: "Pendente" }
    ];

    tbody.innerHTML = "";
    
    empresas.forEach(emp => {
        let statusClass = emp.status === 'Ativo' ? 'bg-green' : 'bg-yellow';
        
        tbody.innerHTML += `
            <tr>
                <td>${emp.id}</td>
                <td><strong>${emp.nome}</strong></td>
                <td>${emp.plano}</td>
                <td><span class="badge ${statusClass}">${emp.status}</span></td>
                <td>
                    <button class="btn-action" title="Detalhes"><i class="fa-solid fa-eye"></i></button>
                    ${emp.status === 'Pendente' 
                        ? `<button class="btn-action" style="background:#3b82f6;" title="Aprovar"><i class="fa-solid fa-check"></i></button>` 
                        : `<button class="btn-action btn-danger" title="Suspender Conta"><i class="fa-solid fa-ban"></i></button>`
                    }
                </td>
            </tr>
        `;
    });
}

function logoutAdmin() {
    localStorage.removeItem("adminToken");
    window.location.href = "index.html"; // Volta pro site principal
}