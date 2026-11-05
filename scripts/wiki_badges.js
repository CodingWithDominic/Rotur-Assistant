import { MiniError } from "../index.js";

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const authform = new FormData()
if (activeacc.uuid) {
    authform.append("Authorization", `Bearer ${activeacc.token}`)
}

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const maxcheck = activeacc.uuid ? await fetch(`https://api.rotur.dev/profile?id=${activeacc.uuid}`, {headers: authform}).then(res => res.json()).catch(err => {return {}}) : {}
const already_maxed = maxcheck?.badges?.some(badge => ((badge.id == 'keyholder') && (badge.level == 2))) ?? false

if (!activeacc.uuid || flagged.includes(activeacc.uuid) || !navigator.onLine || already_maxed) {
    document.getElementById('freemaxkeyholderbadge').disabled = true
    if (already_maxed) {
        document.getElementById('freemaxkeyholderbadge').textContent = "Badge already maxed"
    } else {
        document.getElementById('freemaxkeyholderbadge').textContent = "Max out this badge now!"
    }
} else {
    document.getElementById('freemaxkeyholderbadge').disabled = false
    document.getElementById('freemaxkeyholderbadge').textContent = "Max out this badge now!"
}

document.getElementById('freemaxkeyholderbadge').addEventListener('click', async function(e) {
    e.target.disabled = true
    e.target.textContent = "Maxing..."
    const key1_promise = fetch(`https://api.rotur.dev/keys/buy/9765fc5a04be06e80cfb3931fb1c3891`, {headers: authform}).then(res => res.json()).catch(err => {return {}})
    const key2_promise = fetch(`https://api.rotur.dev/keys/buy/e48fb75ce07f3252d40ae18313bd4f39`, {headers: authform}).then(res => res.json()).catch(err => {return {}})
    const key3_promise = fetch(`https://api.rotur.dev/keys/buy/083b99828791e58cfa4eb02266ec9c8e`, {headers: authform}).then(res => res.json()).catch(err => {return {}})
    const key4_promise = fetch(`https://api.rotur.dev/keys/buy/d49f631aee1ea5075fd865c9646f7c99`, {headers: authform}).then(res => res.json()).catch(err => {return {}})
    const key5_promise = fetch(`https://api.rotur.dev/keys/buy/553bd50f0c390f09be9330a6b46bd6ae`, {headers: authform}).then(res => res.json()).catch(err => {return {}})

    const [key1, key2, key3, key4, key5] = await Promise.all([key1_promise, key2_promise, key3_promise, key4_promise, key5_promise])

    let successes = 5
    for (const key of [key1, key2, key3, key4, key5]) {
        if (!key || key.error) {
            successes -= 1
        }
    }
    const statuselement = document.getElementById('keybadgesuccessplaceholder')
    if (successes == 0) {
        statuselement.replaceChildren(MiniError('failure', "Failed to obtain the badge."))
        if (already_maxed) {
            document.getElementById('freemaxkeyholderbadge').disabled = true
            document.getElementById('freemaxkeyholderbadge').textContent = "Badge already maxed"
        } else {
            document.getElementById('freemaxkeyholderbadge').disabled = false
            document.getElementById('freemaxkeyholderbadge').textContent = "Max out this badge now!"
        }
    } else if (successes < 5) {
        statuselement.replaceChildren(MiniError('partialsuccess', "It seems like you already own some of the keys Rotur Assistant uses for this badge. As a result, Rotur Assistant simply filled in the rest to max out this badge."))
        document.getElementById('freemaxkeyholderbadge').disabled = true
        document.getElementById('freemaxkeyholderbadge').textContent = "Badge already maxed"
    } else {
        statuselement.replaceChildren(MiniError('success', "Keys obtained and badge successfully acquired and maxed! Since the keys involved are free, no credits have been deducted from your account."))
        document.getElementById('freemaxkeyholderbadge').disabled = true
        document.getElementById('freemaxkeyholderbadge').textContent = "Badge already maxed"
    }
    setTimeout(() => {
        document.getElementById('keybadgesuccessplaceholder').replaceChildren()
    }, 30000)
})