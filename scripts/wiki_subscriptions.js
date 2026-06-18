async function getSupporters() {
    const supporters = await fetch(`https://api.rotur.dev/supporters`).then(res => res.json()).catch(err => {
        document.getElementById('subscribersplaceholder').style.display = 'none';
        return;
    })
    if (supporters) {
        supporters.forEach(supporter => {
            const name = supporter.username
            const tier = supporter.subscription.toLowerCase()
            const li = document.createElement('li')
            const config = {
                elements: ['p', 'img', 'a'],
                attributes: ['src', 'alt', 'href', 'width', 'height']
            }
            const sanitizer = new Sanitizer(config)
            li.setHTML(`<a href='../../pages/lookup.html?user=${name}'><img src='https://avatars.rotur.dev/${name}' alt=${name} width=32 height=32>${name}</a>`, {sanitizer: sanitizer})
            document.getElementById(`tier_${tier}`).appendChild(li)
        })

        const final_list = document.getElementById('subscribersplaceholder').children

        document.getElementById('maxlabel').textContent += ` (${document.getElementById('tier_max').childElementCount})`
        document.getElementById('prolabel').textContent += ` (${document.getElementById('tier_pro').childElementCount})`
        document.getElementById('pluslabel').textContent += ` (${document.getElementById('tier_plus').childElementCount})`
        document.getElementById('litelabel').textContent += ` (${document.getElementById('tier_lite').childElementCount})`

        Array.from(final_list).forEach(child => {
            if (!child.hasChildNodes()) {
                const h4 = document.createElement('h4')
                h4.style = 'text-align: left;'
                h4.textContent = 'No-one is subscribed to this tier right now.'
                child.appendChild(h4)
            }
        })
    }
}

getSupporters()