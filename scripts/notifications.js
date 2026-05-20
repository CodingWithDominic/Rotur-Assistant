import { sanitize, parseHTML, formatDate, openErrorPopup, openSuccessPopup } from "../index.js"

function desanitize(string) {
    return string.replaceAll('&sol;','/').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&lpar;', '(').replaceAll('&rpar;', ')').replaceAll("&equals;", "=").replaceAll(`&quot;`, `"`).replaceAll(`&#39;`, `'`).replaceAll('&amp;', '&') // Used for handling items since Rotur decided to use the direct item names as the IDs instead.
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function updatebuttonstates(tf) {
    document.querySelectorAll('.container button').forEach(btn => {
        btn.disabled = tf
    })
}

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
        `<h1>Notifications</h1>
        <p>Notifications that you may have received across different Rotur services.</p>
        <hr>
        <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>`
    ))
}
if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
        <h1>Notifications</h1>
        <p>Notifications that you may have received across different Rotur services.</p>
        <hr>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `))
}

function openDeleteUserPopup(user, source) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
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
    `))
}

function openDeleteSourcePopup(source) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Source</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to delete this source, along with removing all of the associated users with it?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldeletesource" data-source='${sanitize(source)}'>Delete</button>
        </div>
    `))
}
function openDeleteEndpointPopup(endpoint) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Endpoint</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to delete this endpoint?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finaldeleteendpoint" data-endpoint='${sanitize(endpoint)}'>Delete</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

let notifications_cache = ''
let senders_cache = ''
let endpoints_cache = ''

async function getNotifications() {
    if (notifications_cache == '') {
        notifications_cache = await fetch(`https://api.rotur.dev/notify/log?auth=${activeacc.token}`).then(res => res.json())
        if ((notifications_cache.error && (notifications_cache.error == 'Invalid authentication key'))) {
            flagged.push(activeacc.uuid)
            chrome.storage.local.set({flagged: flagged})
            document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
                <h1>Notifications</h1>
                <p>Notifications that you may have received across different Rotur services.</p>
                <hr>
                <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
            `))
            return;
        }
        notifications_cache.log = notifications_cache.log.reverse() // API returns oldest to newest; I want newest to oldest
    }
    const notifs = notifications_cache.log
    let notifs_html = ``
    if (notifs.length == 0) {
        document.getElementById('notificationslist').replaceChildren(...parseHTML(`<li><h2>You don't have any notifications yet!</h2></li>`))
    } else {
        notifs.forEach(notif => {
            notifs_html += `<li>
                <a class='notiftitlebar' href="lookup.html?user=${notif.from}">
                    <img src="https://avatars.rotur.dev/${notif.from || "Spectator"}" width="32" height="32">
                    <h2>${notif.from || "Unknown User"}</h2>
                </a>
                <h3>${sanitize(notif.title ?? "Unknown Title")}</h3>
                <p>${sanitize(notif.body ?? "Unknown Content")}</p>
                <p class='fineprint'>Source: ${sanitize(notif.source ?? "Unknown Source")} &bull; ${formatDate(notif.at ?? 0)}</p>
            </li>`
        });
        document.getElementById('notificationslist').replaceChildren(...parseHTML(notifs_html))
        document.getElementById('notificationslist').style = 'border: 2px solid white;'
    }
    document.getElementById('notifsfeed').textContent = `Notifications (${notifs.length ?? 0})`
}

function appendSenders(data, src) {
    let sender_html = ``
    data.forEach(sender => {
        sender_html += `<li id='sender-${sender.username.replaceAll(' ', '#')}' class='senderlistentry'>
            <a href='lookup.html?user=${sender.username}'>
                <img src="https://avatars.rotur.dev/${sender.username}" width="32" height="32">
                <div class='sendertitle'>
                    <h4>${sender.username}</h4>
                    <p>Count: ${sender.count ?? 0}</p>
                </div>
            </a>
            <button class='removesender' title='Remove Sender' data-user='${sender.username}' data-src='${sanitize(src)}'>✕</button>
        </li>`
    })
    if (sender_html == '') {
        sender_html = `<li><h4>There are no permitted users under this source</h4></li>`
    }
    return sender_html
}

async function getSenders() {
    if (flagged.includes(activeacc.uuid)) {
        return;
    }
    senders_cache = await fetch(`https://api.rotur.dev/notify/allowed?auth=${activeacc.token}`).then(res => res.json())
    const sources = Object.keys(senders_cache)
    if (sources.length == 0) {
        document.getElementById('notifsourcemanager').replaceChildren(...parseHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`))
    } else {
        let source_html = ``
        sources.forEach(source => {
            source_html += `<li id="sourcebody-${sanitize(source).replaceAll(' ', '^')}" class='sourcedatabody'>
                <h2>${sanitize(source)}</h2>
                <hr class='dotted_separator'>
                <button class='removesource' title="Delete Source" data-source='${sanitize(source)}'><img src='../images/misc_icons/delete.png' width=24 height=24></button>
                <ul class='sourcelist'>
                    ${appendSenders(senders_cache[source].senders, source)}
                </ul>
            </li>`
        })
        document.getElementById('notifsourcemanager').replaceChildren(...parseHTML(source_html))
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
        document.getElementById('notifendpointmanager').replaceChildren(...parseHTML(`<li id='noendpoints'><h3>You don't have any notification endpoints</h3></li>`))
    } else {
        let endpoint_html = ``
        endpoints_cache.forEach(endpoint => {
            endpoint_html += `<li id="endpoint-${sanitize(endpoint.device_id)}" class='endpointdatabody'>
                <h2>${sanitize(endpoint.source)}</h2>
                <hr class='dotted_separator'>
                <button class='removeendpoint' title="Delete Endpoint" data-endpoint='${endpoint.device_id}'><img src='../images/misc_icons/delete.png' width=24 height=24></button>
                <ul class='endpointlist'>
                    <li>ID: ${sanitize(endpoint.device_id ?? "Unknown")}</li>
                    <li>Endpoint URL: ${sanitize(endpoint.endpoint ?? "Unknown")}</li>
                    <li>P256 Key: ${sanitize(endpoint.p256dh ?? "Unknown")}</li>
                    <li>Auth Key: ${sanitize(endpoint.auth ?? "Unknown")}</li>
                    <li>Created: ${formatDate(endpoint.created_at ?? "Unknown")}</li>
                </ul>
            </li>`
        })
        document.getElementById('notifendpointmanager').replaceChildren(...parseHTML(endpoint_html))
        document.getElementById('notifendpointmanager').style = 'border: 2px solid white;'
    }
}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    await getNotifications()
    getSenders()
    getEndpoints()
}

document.addEventListener('click', async function(e) {
    if (e.target.id == 'notifsourcefinalcreate') {
        const target = e.target
        target.disabled = true
        target.textContent = 'Adding…'
        const source = document.getElementById('notifsourcecreatesource').value
        const name = document.getElementById('notifsourcecreatename').value
        const createsuccess = await fetch(`https://api.rotur.dev/notify/allowed/${name}?auth=${activeacc.token}`, {method: 'POST', body: JSON.stringify({"source":source})}).then(res => res.json())
        if (createsuccess.error) {
            document.getElementById('notifsourcestatus').replaceChildren(...parseHTML(`<p class='failure'>${createsuccess.error}</p>`))
        } else {
            document.getElementById('notifsourcestatus').replaceChildren(...parseHTML(`<p class='success'>Notification source added successfully!</p>`))
            if (senders_cache[source]) {
                senders_cache[source].senders.push({"username": name, "count": 0})
                document.getElementById('notifsourcemanager').querySelector(`[id="sourcebody-${source.replaceAll(' ', '^')}"]`).querySelector(`[class='sourcelist']`).appendChild(...parseHTML(`<li id='sender-${name.replaceAll(' ', '#')}' class='senderlistentry'>
                    <a href='lookup.html?user=${name}'>
                        <img src="https://avatars.rotur.dev/${name}" width="32" height="32">
                        <div class='sendertitle'>
                            <h4>${name}</h4>
                            <p>Count: 0</p>
                        </div>
                    </a>
                    <button class='removesender' title='Remove Sender' data-user='${name}' data-src='${sanitize(source)}'>✕</button>
                </li>`))
            } else {
                senders_cache[source] = {"senders": [{"username": name, "count": 0}]}
                document.getElementById('nosources')?.remove()
                document.getElementById('notifsourcemanager').style = 'border: 2px solid white;'
                document.getElementById('notifsourcemanager').appendChild(...parseHTML(`<li id="sourcebody-${sanitize(source).replaceAll(' ', '^')}" class='sourcedatabody'>
                    <h2>${sanitize(source)}</h2>
                    <hr class='dotted_separator'>
                    <button class='removesource' title="Delete Source" data-source='${sanitize(source)}'><img src='../images/misc_icons/delete.png' width=24 height=24></button>
                    <ul class='sourcelist'>
                        <li id='sender-${name.replaceAll(' ', '#')}' class='senderlistentry'>
                            <a href='lookup.html?user=${name}'>
                                <img src="https://avatars.rotur.dev/${name}" width="32" height="32">
                                <div class='sendertitle'>
                                    <h4>${name}</h4>
                                    <p>Count: 0</p>
                                </div>
                            </a>
                            <button class='removesender' title='Remove Sender' data-user='${name}' data-src='${sanitize(source)}'>✕</button>
                        </li>
                    </ul>
                </li>`))
                document.getElementById('notifsourcecreatename').value = ''
            }
        }
        target.disabled = false
        target.textContent = '+ Add Source'
        setTimeout(function() {
            document.getElementById('notifsourcestatus').replaceChildren()
        }, 10000)
        return;
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
            document.getElementById('notifendpointstatus').replaceChildren(...parseHTML(`<p class='failure'>${createsuccess.error}</p>`))
        } else {
            if (createsuccess.updated) {
                document.getElementById('notifendpointstatus').replaceChildren(...parseHTML(`<p class='success'>Endpoint added successfully!</p>`))
                const device_index = endpoints_cache.findIndex(item => item.device_id == createsuccess.device_id)
                endpoints_cache[device_index] = {
                    "device_id": createsuccess.device_id,
                    "endpoint": url,
                    "p256dh": p256_key,
                    "auth": authkey,
                    "source": source,
                    "created_at": Date.now()
                }
                document.getElementById(`endpoint-${createsuccess.device_id}`).replaceChildren(...parseHTML(`
                    <h2>${sanitize(source)}</h2>
                    <hr class='dotted_separator'>
                    <button class='removeendpoint' title="Delete Endpoint" data-endpoint='${createsuccess.device_id}'><img src='../images/misc_icons/delete.png' width=24 height=24></button>
                    <ul class='endpointlist'>
                        <li>ID: ${sanitize(createsuccess.device_id)}</li>
                        <li>Endpoint URL: ${sanitize(url)}</li>
                        <li>P256 Key: ${sanitize(p256_key)}</li>
                        <li>Auth Key: ${sanitize(authkey)}</li>
                        <li>Created: ${formatDate(Date.now())}</li>
                    </ul>
                    `))  
            } else { 
                document.getElementById('notifendpointstatus').replaceChildren(...parseHTML(`<p class='success'>Endpoint added successfully!</p>`))
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
                document.getElementById('notifendpointmanager').appendChild(...parseHTML(`<li id="endpoint-${sanitize(createsuccess.device_id)}" class='endpointdatabody'>
                    <h2>${sanitize(source)}</h2>
                    <hr class='dotted_separator'>
                    <button class='removeendpoint' title="Delete Endpoint" data-endpoint='${createsuccess.device_id}'><img src='../images/misc_icons/delete.png' width=24 height=24></button>
                    <ul class='endpointlist'>
                        <li>ID: ${sanitize(createsuccess.device_id)}</li>
                        <li>Endpoint URL: ${sanitize(url)}</li>
                        <li>P256 Key: ${sanitize(p256_key)}</li>
                        <li>Auth Key: ${sanitize(authkey)}</li>
                        <li>Created: ${formatDate(Date.now())}</li>
                    </ul>
                </li>`))
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
                document.getElementById('notifendpointmanager').replaceChildren(...parseHTML(`<li id='noendpoints'><h3>You don't have any notification endpoints</h3></li>`))
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
                            document.getElementById('notifsourcemanager').replaceChildren(...parseHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`))
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
                        document.getElementById('notifsourcemanager').replaceChildren(...parseHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`))
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
                        document.getElementById('notifsourcemanager').replaceChildren(...parseHTML(`<li id='nosources'><h3>You don't have any notification sources</h3></li>`))
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
        document.getElementById('notificationslist').style.display = (e.target.id == 'notifsfeed') ? 'block' : 'none'
        document.getElementById('notificationsettings').style.display = (e.target.id == 'notifsettings') ? 'block' : 'none'
        document.getElementById('notificationendpoints').style.display = (e.target.id == 'notifendpoints') ? 'block' : 'none'
        return;        
    }
})