function wikireplace(arg1, arg2, arg3) {
    let newhtml = document.getElementById('paragraph1').innerHTML
    newhtml = newhtml.replace('....', arg1).replace('....', arg2).replace('....', arg3)
    document.getElementById('paragraph1').setHTML(newhtml)
}

async function stats() {
    const stats = await fetch(`https://api.rotur.dev/stats/users`).then(res => res.json()).catch(err => {
        wikireplace('????', '????', '????')
        return;
    })
    if (stats) {
        wikireplace(stats.total_users, stats.active_users, stats.banned_users)
    }
}
stats()