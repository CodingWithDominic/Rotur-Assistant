function wikireplace(arg1) {
    let newhtml = document.getElementById('devfundstats').innerHTML
    newhtml = newhtml.replace('....', arg1)
    document.getElementById('devfundstats').setHTML(newhtml)
}

async function stats() {
    const stats = await fetch("https://devfund.rotur.dev/api/stats").then(res => res.json()).catch(err => {
        wikireplace('????.??')
        return;
    })
    if (stats) {
        wikireplace(stats.in_escrow)
    }
}
stats()