const toggle = document.getElementById('themeToggle');

// Checa o status inicial salvo no localStorage
if (localStorage.getItem('theme') === 'dark') {
    toggle.checked = true;
}

toggle.addEventListener('change', function() {
    if (this.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
    
    // Avisa o dashboard pai para mudar a cor do menu lateral também!
    window.parent.postMessage('toggleTheme', '*');
});