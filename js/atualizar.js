document.getElementById("updateForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
        email: localStorage.getItem("userEmail"),
        cep: cep.value,
        rua: rua.value,
        bairro: bairro.value,
        numero: numero.value
    };

    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:8080/auth/atualizar", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(body)
    });

    if (res.ok) {
        alert("Atualizado!");
    } else {
        alert("Erro");
    }
});