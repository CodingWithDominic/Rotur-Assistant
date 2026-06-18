import { sanitize, formatDate, openErrorPopup, openSuccessPopup, MiniError } from "../index.js"

function desanitize(string) {
    return string.replaceAll('&sol;','/').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&lpar;', '(').replaceAll('&rpar;', ')').replaceAll("&equals;", "=").replaceAll(`&quot;`, `"`).replaceAll(`&#39;`, `'`).replaceAll('&amp;', '&') // Used for handling items since Rotur decided to use the direct item names as the IDs instead.
}

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'input', 'hr', 'a', 'label'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'type', 'placeholder', 'step']
}
const sanitizer = new Sanitizer(config)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function updatebuttonstates(tf) {
    document.querySelectorAll('.container button').forEach(btn => {
        btn.disabled = tf
    })
}

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const legacynotifs = await new Promise(resolve =>
    chrome.storage.local.get('legacynotifs', data => resolve(data.legacynotifs || false))
) ?? false;

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const type_lookup = {
    reply: 'Someone replied to your claw post',
    follow: 'You gained a new follower!',
    item_purchased: 'You bought an item',
    item_sold: 'Someone bought your item!',
    notification: 'Non-legacy Notification',
    item_received: 'Someone gave you an item',
    repost: "Someone reposted your claw post!"
}

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].setHTML(
        `<h1>Notifications</h1>
        <p>Notifications that you may have received across different Rotur services.</p>
        <hr>
        <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>`,
        {sanitizer: sanitizer}
    )
}
if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Notifications</h1>
        <p>Notifications that you may have received across different Rotur services.</p>
        <hr>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `, {sanitizer: sanitizer})
}

document.getElementById('legacynotifs').checked = legacynotifs

function openDeleteUserPopup(user, source) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Remove User</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to remove ${user} from the source ${source}?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldeleteuser" data-user='${user}' data-source='${sanitize(source)}'>Remove</button>
        </div>
        <label class='globalremoveoption'>
            <input type='checkbox' id='globalremoveuser'>
            Remove ${user} from all sources
        </label>
    `, {sanitizer: sanitizer})
}

function openDeleteSourcePopup(source) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Delete Source</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to delete this source, along with removing all of the associated users with it?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldeletesource" data-source='${sanitize(source)}'>Delete</button>
        </div>
    `, {sanitizer: sanitizer})
}
function openDeleteEndpointPopup(endpoint) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Delete Endpoint</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to delete this endpoint?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldeleteendpoint" data-endpoint='${sanitize(endpoint)}'>Delete</button>
        </div>
    `, {sanitizer: sanitizer})
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

let notifications_cache = ''
let senders_cache = ''
let endpoints_cache = ''

function appendSenders(data, src) {
    const sender_html = []
    let idx = 0
    data.forEach(sender => {
        sender_html.push(CreateSenderElement(data[idx], src))
        idx += 1
    })
    if (sender_html == '') {
        const li = document.createElement('li')
        const h4 = document.createElement('h4')
        h4.textContent = "There are no permitted users under this source"
        li.appendChild(h4)
        sender_html.push(li)
    }
    return sender_html
}

function CreateSenderElement(data, src, nameoverride) {
    const username = (((data && data.username) ? data.username : nameoverride) ?? "Spectator")
    const sender = document.getElementById('notifusertemplate').content.cloneNode(true)
    sender.querySelector('li').id = `sender-${username.replaceAll(' ', '#')}`
    sender.querySelector('a').href = `lookup.html?user=${username}`
    sender.querySelector('img').src = `https://avatars.rotur.dev/${username}`
    sender.querySelector('img').alt = username
    sender.querySelector('h4').textContent = username
    sender.querySelector('p').textContent = `Notification Count: ${(data ? data.count : 0) ?? 0}`
    sender.querySelector('button').dataset.user = username
    sender.querySelector('button').dataset.src = src
    return sender;
}

function CreateSourceElement(data) {
    const source = document.getElementById('notifsourcetemplate').content.cloneNode(true)
    source.querySelector('li').id = `sourcebody-${data.replaceAll(' ', '^')}`
    source.querySelector('h2').textContent = data
    source.querySelector('button').dataset.source = data
    source.querySelector('.sourcelist').replaceChildren(...appendSenders(senders_cache[data].senders, data))
    return source;
}

function CreateEndpointElement(data) {
    const endpoint = document.getElementById('notifendpointtemplate').content.cloneNode(true)
    endpoint.querySelector('li').id = `endpoint-${data.device_id}`
    endpoint.querySelector('h2').textContent = data.source
    endpoint.querySelector('.removeendpoint').dataset.endpoint = data.device_id
    const endpointdata = endpoint.querySelector('.endpointlist')
    const li1 = document.createElement('li')
    const li2 = document.createElement('li')
    const li3 = document.createElement('li')
    const li4 = document.createElement('li')
    const li5 = document.createElement('li')
    li1.textContent = `ID: ${data.device_id ?? "Unknown"}`
    li2.textContent = `Endpoint URL: ${data.endpoint ?? "Unknown"}`
    li3.textContent = `P256 Key: ${data.p256dh ?? "Unknown"}`
    li4.textContent = `Auth Key: ${data.auth ?? "Unknown"}`
    li5.textContent = `Created: ${formatDate(data.created_at ?? 0)}`
    endpointdata.replaceChildren(...[li1, li2, li3, li4, li5])
    return endpoint;
}

// End of rewrite

function appendBasedOnType(notif) {
    const ul = []
    const li1 = document.createElement('li')
    const li2 = document.createElement('li')
    const li3 = document.createElement('li')
    switch (notif.type) {
        case 'item_sold': {
            li1.textContent = `Name: ${notif.item_name}`
            li2.textContent = `Buyer: ${notif.buyer}`
            li3.textContent = `Sold for: ${notif.price} RC`
            ul.push(li1)
            ul.push(li2)
            ul.push(li3)
            break
        }
        case 'item_purchased': {
            li1.textContent = `Item Name: ${notif.item_name}`
            li2.textContent = `Bought for: ${notif.price} RC`
            ul.push(li1)
            ul.push(li2)
            break
        }
        case 'item_received': {
            li1.textContent = `Item Name: ${notif.item_name}`
            li2.textContent = `From: ${notif.from}`
            ul.push(li1)
            ul.push(li2)
            break
        }
        case 'reply': {
            li1.textContent = `Content: ${notif.content}`
            li2.textContent = `Reply ID: ${notif.reply_id}`
            li3.textContent =
            ul.push(li1)
            ul.push(li2)
            break
        }
        default: {
            return []
        }
    }
    return ul
}

async function getNotifications() {
    const legacy = document.getElementById('legacynotifs').checked
    if (notifications_cache == '') {
        notifications_cache = await fetch(`https://api.rotur.dev/${legacy ? `notifications` : `notify/log`}?auth=${activeacc.token}&after=9999`).then(res => res.json())
        if ((notifications_cache.error && (notifications_cache.error == 'Invalid authentication key'))) {
            flagged.push(activeacc.uuid)
            chrome.storage.local.set({flagged: flagged})
            document.getElementsByClassName('container')[0].setHTML(`
                <h1>Notifications</h1>
                <p>Notifications that you may have received across different Rotur services.</p>
                <hr>
                <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
            `, {sanitizer: sanitizer})
            return;
        }
        if (!legacy) {
            notifications_cache.log = notifications_cache.log.reverse() // API returns oldest to newest; I want newest to oldest
        }
    }
    const notifs = legacy ? notifications_cache : notifications_cache.log
    const notifs_html = []
    if (notifs.length == 0) {
        const li = document.createElement('li')
        const h2 = document.createElement('h2')
        h2.textContent = `You don't have any notifications yet!`
        li.appendChild(h2)
        document.getElementById('notificationslist').replaceChildren(li)
    } else {
        if (legacy) {
            notifs.forEach(notif => {
                const type = type_lookup[notif.type] ?? `Misc. Notification (${notif.type})`
                const id = notif.id ?? 'Unknown ID'
                const timestamp = formatDate(notif.timestamp ?? 0)
                if (notif.type == 'notification') {
                    const notifcard = document.getElementById('legacynotiftemplate2').content.cloneNode(true)
                    notifcard.querySelector('.notiftypetitle').textContent = type
                    notifcard.querySelector('.notiftitlebar').href = `lookup.html?user=${notif.from || "Spectator"}`
                    notifcard.querySelector('.notifsourceusertext').textContent = `From: ${notif.from || "Unknown User"}`
                    notifcard.querySelector('.notifsourcefineprint').textContent = (notif.source ?? "Unknown Source")
                    notifcard.querySelector('img').src = `https://avatars.rotur.dev/${notif.from || "Spectator"}`
                    notifcard.querySelector('img').alt = (notif.from || "Spectator")
                    notifcard.querySelector('h3').textContent = (notif.title ?? "Unknown Title")
                    notifcard.querySelector('.fineprint').innerText = `${timestamp} • ID: ${id}`
                    notifs_html.push(notifcard)
                } else {
                    const notifcard = document.getElementById('legacynotiftemplate').content.cloneNode(true)
                    notifcard.querySelector('h2').textContent = type
                    notifcard.querySelector('.legacynotifdetails').replaceChildren(...appendBasedOnType(notif))
                    notifcard.querySelector('.fineprint').textContent = `ID: ${id} • Received: ${timestamp}`
                    notifs_html.push(notifcard)
                }
            });
        } else {
            notifs.forEach(notif => {
                const notifcard = document.getElementById('notiftemplate').content.cloneNode(true)
                notifcard.querySelector('.notiftitlebar').href = `lookup.html?user=${notif.from || "Spectator"}`
                notifcard.querySelector('.notifsourceusertext').textContent = `From: ${notif.from || "Unknown User"}`
                notifcard.querySelector('.notifsourcefineprint').textContent = (notif.source ?? "Unknown Source")
                notifcard.querySelector('img').src = `https://avatars.rotur.dev/${notif.from || "Spectator"}`
                notifcard.querySelector('img').alt = (notif.from || "Spectator")
                notifcard.querySelector('h3').textContent = (notif.title ?? "Unknown Title")
                notifcard.querySelector('.notifbody').innerText = (notif.body ?? "Unknown Content")
                notifcard.querySelector('.fineprint').textContent = `${formatDate(notif.at ?? 0)}`
                notifs_html.push(notifcard)
            });
        }

        document.getElementById('notificationslist').replaceChildren(...notifs_html)
        document.getElementById('notificationslist').style = 'border: 2px solid white;'
    }
    document.getElementById('notifsfeed').textContent = `Notifications (${notifs.length ?? 0})`
}

async function getSenders() {
    if (flagged.includes(activeacc.uuid)) {
        return;
    }
    senders_cache = await fetch(`https://api.rotur.dev/notify/allowed?auth=${activeacc.token}`).then(res => res.json())
    const sources = Object.keys(senders_cache)
    if (sources.length == 0) {
        document.getElementById('notifsourcemanager').setHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`, {sanitizer: sanitizer})
    } else {
        const source_html = []
        sources.forEach(source => {
            source_html.push(CreateSourceElement(source))
        })
        document.getElementById('notifsourcemanager').replaceChildren(...source_html)
        document.getElementById('notifsourcemanager').style = 'border: 2px solid white;'
    }
}

async function getEndpoints() {
    if (flagged.includes(activeacc.uuid)) {
        return;
    }
    endpoints_cache = await fetch(`https://api.rotur.dev/notify/endpoints?auth=${activeacc.token}`).then(res => res.json())
    endpoints_cache = endpoints_cache.endpoints
    if (endpoints_cache.length == 0) {
        document.getElementById('notifendpointmanager').setHTML(`<li id='noendpoints'><h3>You don't have any notification endpoints</h3></li>`, {sanitizer: sanitizer})
    } else {
        const endpoint_html = []
        endpoints_cache.forEach(endpoint => {
            endpoint_html.push(CreateEndpointElement(endpoint))
        })
        document.getElementById('notifendpointmanager').replaceChildren(...endpoint_html)
        document.getElementById('notifendpointmanager').style = 'border: 2px solid white;'
    }
}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    await getNotifications()
    getSenders()
    getEndpoints()
}

document.addEventListener('click', async function(e) {
    if (e.target.id == 'legacynotifs') {
        chrome.storage.local.set({legacynotifs: e.target.checked})
        notifications_cache = ''
        getNotifications()
        return;
    }
    if (e.target.id == 'notifsourcefinalcreate') {
        const target = e.target
        target.disabled = true
        target.textContent = 'Adding…'
        const source = document.getElementById('notifsourcecreatesource').value
        const name = document.getElementById('notifsourcecreatename').value
        const createsuccess = await fetch(`https://api.rotur.dev/notify/allowed/${name}?auth=${activeacc.token}`, {method: 'POST', body: JSON.stringify({"source":source})}).then(res => res.json())
        if (createsuccess.error) {
            document.getElementById('notifsourcestatus').replaceChildren(MiniError('failure', createsuccess.error))
        } else {
            document.getElementById('notifsourcestatus').replaceChildren(MiniError('success', "Notification Source added successfully!"))
            if (senders_cache[source]) {
                senders_cache[source].senders.push({"username": name, "count": 0})
                document.getElementById('notifsourcemanager').querySelector(`[id="sourcebody-${source.replaceAll(' ', '^')}"]`).querySelector(`[class='sourcelist']`).appendChild(CreateSenderElement(null, source, name))
            } else {
                senders_cache[source] = {"senders": [{"username": name, "count": 0}]}
                document.getElementById('nosources')?.remove()
                document.getElementById('notifsourcemanager').style = 'border: 2px solid white;'
                document.getElementById('notifsourcemanager').appendChild(CreateSourceElement(source))
            }
            document.getElementById('notifsourcecreatename').value = ''
        }
        target.disabled = false
        target.textContent = '+ Add Source'
        setTimeout(function() {
            document.getElementById('notifsourcestatus').replaceChildren()
        }, 10000)
        return;
    }
    if (e.target.id == 'notifsreload') {
        const target = e.target
        target.disabled = true;
        target.textContent = '...'
        notifications_cache = ''
        await getNotifications()
        target.disabled = false;
        target.textContent = '⟳'
    }
    if (e.target.id == 'notifendpointfinalcreate') {
        const target = e.target
        target.disabled = true
        target.textContent = 'Adding…'
        const source = document.getElementById('notifendpointcreatesource').value
        const url = document.getElementById('notifendpointcreateendpoint').value
        const authkey = document.getElementById('notifendpointcreateauth').value
        const p256_key = document.getElementById('notifendpointcreatep256dh').value
        const fingerprint = document.getElementById('notifendpointcreatefingerprint').value
        const createsuccess = await fetch(`https://api.rotur.dev/notify/register?auth=${activeacc.token}`, {method: 'POST', body: JSON.stringify({
            "endpoint": url,
            "p256dh": p256_key,
            "auth": authkey,
            "source": source,
            "fingerprint": fingerprint
        })}).then(res => res.json())
        if (createsuccess.error) {
            document.getElementById('notifendpointstatus').replaceChildren(MiniError('success', createsuccess.error))
        } else {
            if (createsuccess.updated) {
                document.getElementById('notifendpointstatus').replaceChildren(MiniError('success', "Endpoint added successfully!"))
                const device_index = endpoints_cache.findIndex(item => item.device_id == createsuccess.device_id)
                endpoints_cache[device_index] = {
                    "device_id": createsuccess.device_id,
                    "endpoint": url,
                    "p256dh": p256_key,
                    "auth": authkey,
                    "source": source,
                    "created_at": Date.now()
                }
                document.getElementById(`endpoint-${createsuccess.device_id}`).replaceChildren(CreateEndpointElement(endpoints_cache[device_index]))  
            } else { 
                document.getElementById('notifendpointstatus').replaceChildren(MiniError('success', "Endpoint added successfully!"))
                endpoints_cache.push({
                    "device_id": createsuccess.device_id,
                    "endpoint": url,
                    "p256dh": p256_key,
                    "auth": authkey,
                    "source": source,
                    "created_at": Date.now()
                })
                document.getElementById('noendpoints')?.remove()
                document.getElementById('notifendpointmanager').style = 'border: 2px solid white;'
                document.getElementById('notifendpointmanager').appendChild(CreateEndpointElement(endpoints_cache[endpoints_cache.length - 1]))
            }
            document.getElementById('notifendpointcreatesource').value = ''
            document.getElementById('notifendpointcreateendpoint').value = ''
            document.getElementById('notifendpointcreateauth').value = ''
            document.getElementById('notifendpointcreatep256dh').value = ''
            document.getElementById('notifendpointcreatefingerprint').value = ''
        }
        target.disabled = false
        target.textContent = '+ Add Endpoint'
        setTimeout(function() {
            document.getElementById('notifendpointstatus').replaceChildren()
        }, 10000)
        return;
    }
    if (e.target.className == 'closebtn') {
        closePopup()
        return;
    }
    if (e.target.className == 'removesender') {
        openDeleteUserPopup(e.target.dataset.user, e.target.dataset.src)
        return;
    }
    if (e.target.className == 'removesource') {
        openDeleteSourcePopup(e.target.dataset.source)
        return;
    }
    if (e.target.className == 'removeendpoint') {
        openDeleteEndpointPopup(e.target.dataset.endpoint)
        return;
    }
    if (e.target.className == 'finaldeleteendpoint') {
        closePopup()
        const endpoint = e.target.dataset.endpoint
        const deletesuccess = await fetch(`https://api.rotur.dev/notify/device/${endpoint}?auth=${activeacc.token}`, {method: 'DELETE'}).then(res => res.json())
        if (deletesuccess.error) {
            openErrorPopup(deletesuccess.error)
        } else {
            openSuccessPopup(`Endpoint successfully deleted.`)
            endpoints_cache = endpoints_cache.filter(item => item.device_id != endpoint)
            document.getElementById(`endpoint-${endpoint}`).remove()
            if (document.getElementById('notifendpointmanager').childElementCount == 0) {
                document.getElementById('notifendpointmanager').setHTML(`<li id='noendpoints'><h3>You don't have any notification endpoints</h3></li>`, {sanitizer: sanitizer})
                document.getElementById('notifendpointmanager').style = 'border: none;'
            }
        }
    }
    if (e.target.className == 'finaldeleteuser') {
        closePopup()
        const user = e.target.dataset.user
        const orig_source = e.target.dataset.source
        if (document.getElementById('globalremoveuser').checked) {
            const all_sources = Object.keys(senders_cache).filter(key => {
                return senders_cache[key].senders.some(s => s.username == user);
            });
            let deleteerror = false
            updatebuttonstates(true)
            for (let i=0; i<all_sources.length; i++) {
                const source = all_sources[i]
                const deletesuccess = await fetch(`https://api.rotur.dev/notify/allowed/${user}?source=${encodeURIComponent(desanitize(source))}&auth=${activeacc.token}`, {method: 'DELETE'}).then(res => res.json())
                if (deletesuccess.error) {
                    deleteerror = true;
                } else {
                    senders_cache[source].senders = senders_cache[source].senders.filter(item => item.username != user)
                    document.getElementById(`sourcebody-${source.replaceAll(' ', '^')}`).querySelector(`[id="sender-${user.replaceAll(' ', '#')}"]`).remove()
                    if (document.getElementById(`sourcebody-${source.replaceAll(' ', '^')}`).querySelector(`[class='sourcelist']`).childElementCount == 0) {
                        document.getElementById(`sourcebody-${source.replaceAll(' ', '^')}`).remove()
                        if (document.getElementById('notifsourcemanager').childElementCount == 0) {
                            document.getElementById('notifsourcemanager').setHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`, {sanitizer: sanitizer})
                            document.getElementById('notifsourcemanager').style = 'border: none;'
                        }
                        delete senders_cache[source]
                    }
                }
            }
            if (deleteerror) {
                openErrorPopup('There was an error with removal from one of the sources')
            } else {
                openSuccessPopup(`Successfully removed ${user} from all added sources`)
            }
            updatebuttonstates(false)
        } else {
            const deletesuccess = await fetch(`https://api.rotur.dev/notify/allowed/${user}?source=${encodeURIComponent(desanitize(orig_source))}&auth=${activeacc.token}`, {method: 'DELETE'}).then(res => res.json())
            if (deletesuccess.error) {
                openErrorPopup(deletesuccess.error)
            } else {
                openSuccessPopup(`Successfully removed ${user} as a sender from the source ${orig_source}.`)
                senders_cache[orig_source].senders = senders_cache[orig_source].senders.filter(item => item.username != user)
                document.getElementById(`sourcebody-${orig_source.replaceAll(' ', '^')}`).querySelector(`[id="sender-${user.replaceAll(' ', '#')}"]`).remove()
                if (document.getElementById(`sourcebody-${orig_source.replaceAll(' ', '^')}`).querySelector(`[class='sourcelist']`).childElementCount == 0) {
                    document.getElementById(`sourcebody-${orig_source.replaceAll(' ', '^')}`).remove()
                    if (document.getElementById('notifsourcemanager').childElementCount == 0) {
                        document.getElementById('notifsourcemanager').setHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`, {sanitizer: sanitizer})
                        document.getElementById('notifsourcemanager').style = 'border: none;'
                    }
                    delete senders_cache[orig_source]
                }
            }
        }
    }
    if (e.target.className == 'finaldeletesource') {
        closePopup()
        const source = e.target.dataset.source
        const sendersArray = senders_cache[source].senders
        let deleteerror = false
        updatebuttonstates(true)
        for (let j=0; j<sendersArray.length; j++) {
            const sender = sendersArray[j]
            const deletesuccess = await fetch(`https://api.rotur.dev/notify/allowed/${sender.username}?source=${encodeURIComponent(desanitize(source))}&auth=${activeacc.token}`, {method: 'DELETE'}).then(res => res.json())
            if (deletesuccess.error) {
                deleteerror = true;
            } else {
                senders_cache[source].senders = senders_cache[source].senders.filter(item => item.username != sender.username)
                document.getElementById(`sourcebody-${source.replaceAll(' ', '^')}`).querySelector(`[id="sender-${sender.username.replaceAll(' ', '#')}"]`).remove()
                if (document.getElementById(`sourcebody-${source.replaceAll(' ', '^')}`).querySelector(`[class='sourcelist']`).childElementCount == 0) {
                    document.getElementById(`sourcebody-${source.replaceAll(' ', '^')}`).remove()
                    if (document.getElementById('notifsourcemanager').childElementCount == 0) {
                        document.getElementById('notifsourcemanager').setHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`, {sanitizer: sanitizer})
                        document.getElementById('notifsourcemanager').style = 'border: none;'
                    }
                    delete senders_cache[source]
                }
            }
        }
        if (deleteerror) {
            openErrorPopup('There was an error with removing this source altogether.')
        } else {
            openSuccessPopup(`Successfully removed the source ${source}, alongside all of its users.`)
        }
        updatebuttonstates(false)
    }
    if (e.target.className == 'tab') {
        Array.from(document.getElementsByClassName('tab')).forEach(tab => {
            tab.style = 'border-bottom: none;'
        })
        e.target.style = 'border-bottom: 2px solid white;'
        document.getElementById('notificationslog').style.display = (e.target.id == 'notifsfeed') ? 'block' : 'none'
        document.getElementById('notificationsettings').style.display = (e.target.id == 'notifsettings') ? 'block' : 'none'
        document.getElementById('notificationendpoints').style.display = (e.target.id == 'notifendpoints') ? 'block' : 'none'
        return;        
    }
})