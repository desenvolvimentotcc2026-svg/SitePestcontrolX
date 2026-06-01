document.getElementById('formForgotPassword').addEventListener('submit', async function(event) {
    event.preventDefault();

    const emailInput = document.getElementById('email').value.trim();
    const btnSolicitar = document.getElementById('btnSolicitar');

    if (!emailInput) {
        alert('Por favor, insira um e-mail válido.');
        return;
    }

    btnSolicitar.innerText = 'Enviando...';
    btnSolicitar.disabled = true;

    try {

        const API_URL = 'https://appdedetizacao.onrender.com/api/auth/forgot-password';

        const response = await fetch(`${API_URL}?email=${encodeURIComponent(emailInput)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Token gerado com sucesso! Verifique seu console ou banco (Simulação de envio).');
            // Redireciona para a tela onde ele vai digitar o token e a nova senha
            window.location.href = 'token.html';
        } else {
            const erroTexto = await response.text();
            alert('Erro ao solicitar token: ' + (erroTexto || 'E-mail não encontrado.'));
            btnSolicitar.innerText = 'Solicitar Token';
            btnSolicitar.disabled = false;
        }

    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor. Verifique se o backend está ativo.');
        btnSolicitar.innerText = 'Solicitar Token';
        btnSolicitar.disabled = false;
    }
});