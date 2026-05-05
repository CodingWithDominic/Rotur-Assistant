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

    Array.from(final_list).forEach(child => {
        if (!child.hasChildNodes()) {
            const p = document.createElement('p')
            p.innerText = 'No-one is subscribed to this tier right now.'
            child.appendChild(p)
        }
    })
}

getSupporters()