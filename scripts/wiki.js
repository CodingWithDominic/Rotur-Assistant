document.addEventListener('click', function(e) {
    if (e.target.className == 'appgridbtn') {
        window.location.href = `../pages/wiki_pages/${e.target.id}.html`
    }
})