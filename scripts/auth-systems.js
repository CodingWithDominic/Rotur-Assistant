const config = {
    elements: ['select', 'option'],
    attributes: ['value', 'selected']
}

const sanitizer = new Sanitizer(config)

let system_cache = []
async function getSystems() {
    const systems = await fetch(`https://api.rotur.dev/systems`).then(res => res.json())
    const systemsarray = Object.keys(systems)
    system_cache = systemsarray

    let systemoptions = ``

    for (let i=0; i<systemsarray.length; i++) {
        systemoptions += `<option value="${systemsarray[i]}" ${systemsarray[i] == "Rotur Assistant" ? "selected" : ""}>${systemsarray[i]}</option>`
    }
    systemoptions += `<option value="Random">Random System</option>`
    document.getElementById('authselectscreen').setHTML(systemoptions, {sanitizer: sanitizer})
}

getSystems()

document.getElementById('authselectscreen').addEventListener('change', async function(e) {
    const system = document.getElementById('authselectscreen').value
    document.getElementById('auth-iframe').src = `https://rotur.dev/auth?system=${system == "Random" ? (system_cache[Math.floor(Math.random() * system_cache.length)] ?? "Rotur Assistant") : system}`
})