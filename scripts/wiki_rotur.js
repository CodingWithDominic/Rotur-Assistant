async function stats() {
    const stats = await fetch(`https://api.rotur.dev/stats/users`).then(res => res.json())
    document.getElementById('paragraph1').innerText = `Rotur is an ecosystem, created by Mistium (aliases: Mist, Sophie). It is home to various services (see list of services). It is also home to a relatively small community, consisting of about 100-200 users. Similar to services like Microsoft and Google, all you need is one unified account to use all Rotur services. Some services may offer additional benefits for people who pay for a Rotur subscription. As of now, there are a total of ${stats.total_users} Rotur users. ${stats.active_users} of them are active, while ${stats.banned_users} of them were banned.`
}
stats()