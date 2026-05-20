async function getSupporters() {
    const supporters = await fetch(`https://api.rotur.dev/supporters`).then(res => res.json())
    supporters.forEach(supporter => {
        const name = supporter.username
        const tier = supporter.subscription.toLowerCase()
        const li = document.createElement('li')
        const parser = new DOMParser();
        const prototype = parser.parseFromString(`<a href='../../pages/lookup.html?user=${name}'><img src='https://avatars.rotur.dev/${name}' alt=${name} width=32 height=32>${name}</a>`, 'text/html')
        const final = prototype.body.children
        li.replaceChildren(...final)
        document.getElementById(`tier_${tier}`).appendChild(li)
    })

    const final_list = document.getElementById('subscribersplaceholder').children

    document.getElementById('maxlabel').textContent += ` (${document.getElementById('tier_max').childElementCount})`
    document.getElementById('prolabel').textContent += ` (${document.getElementById('tier_pro').childElementCount})`
    document.getElementById('drivelabel').textContent += ` (${document.getElementById('tier_drive').childElementCount})`
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

getSupporters()