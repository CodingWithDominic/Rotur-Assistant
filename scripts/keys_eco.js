import { sanitize, formatDate, parseHTML } from "../index.js"

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
        `<h1>Key Manager (Economy)</h1>
        <p id="keyfineprint">This page is for managing keys that are purchaseable (either one-time or recursively). For the page that manages keys associated with your account, see <a href="../pages/keymanager_acc.html">Key Manager (Account)</a></p>
        <hr>
        <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>`
    ))
}
if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
        <h1>Key Manager (Economy)</h1>
        <p id="keyfineprint">This page is for managing keys that are purchaseable (either one-time or recursively). For the page that manages keys associated with your account, see <a href="../pages/keymanager_acc.html">Key Manager (Account)</a></p>
        <hr>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `))
}

function openConfirmDeletePopup(keyid) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Key</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Really delete this key?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finaldelete" data-keyid='${keyid}'>Yes</button>
        </div>
    `)) 
}

function openConfirmBuyPopup(keyid, keyname, price, usercurrency) {
    let diff = (parseFloat(usercurrency) - parseFloat(price))
    if (String(diff).length > 10) {
        diff = diff.toFixed(2)
    }
    let finalbuyerincome = price * 0.9
    if (String(finalbuyerincome).length > 10) {
        finalbuyerincome = finalbuyerincome.toFixed(2)
    }
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Purchase</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Confirm purchase of the key &quot;${keyname}&quot;?</p>
        <p>Your Balance: ${usercurrency} -> ${diff}</p>
        <p>The owner of this key will receive +${finalbuyerincome} RC (after taxes)</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalbuy" data-keyid='${keyid}'>Confirm & Buy</button>
        </div>
    `))
}

function openConfirmCancelPopup(keyid, owner) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Cancel Subscription</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Cancel your subscription to this key? If you want a refund, you may have to contact ${owner}, the owner of this key.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalcancel" data-keyid='${keyid}'>Yes</button>
        </div>
    `))
}

function openConfirmRevokePopup(keyid) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Revoke Key</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Revoke all access to this key?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalrevoke" data-keyid='${keyid}'>Yes</button>
        </div>
    `))
}

function openConfirmRemoveUserPopup(user, keyid, nextbilling, amt) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Remove Access</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Remove ${user}'s access to this key?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalremoval" data-user="${user}" data-keyid='${keyid}' data-refundamt='${amt}'>Remove</button>
        </div>
        ${nextbilling && nextbilling != "undefined" ? `<label class='refundcheckbox'><input type='checkbox' id='ecokeyrefund'> Refund this user's last purchase (excluding tax)</label>` : ''}
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function renderUsers(userdata, type, creator, id, price) {
    let userlist_html = ``
    const userlist = Object.keys(userdata)
    userlist.forEach(user => {
        userlist_html += `<li class="ecokeyuser">
        <div class='ecokeyuserheader'>
            <img src="https://avatars.rotur.dev/${user}" alt="${user}" width=32 height=32>
            <h2>${user} ${user == creator ? "👑" : ""}</h2>
            ${(user != creator) && (creator == activeacc.name) ? `<button class='removeacc' data-name="${user}" title="Remove user from key" data-nextbill="${userdata[user].next_billing}" data-refundprice="${price}" data-keyid="${id}">✕</button>` : ''}
        </div>
        <p>${type == "subscription" ? "Subscribed" : "Purchased"}: ${formatDate(userdata[user].time * 1000)}</p>
        ${type == "subscription" && (user != creator) && userdata[user].next_billing ? `<p>Next Billing: ${formatDate(userdata[user].next_billing)}</p>` : ""}
        </li>
        `
    })
    return userlist_html;
}

async function RenderKeys() {
	const keys = await fetch(`https://api.rotur.dev/keys/mine?auth=${activeacc.token}`).then(res => res.json()).catch(err => {
        document.getElementById('container').replaceChildren(...parseHTML(`
            <h1>Key Manager (Economy)</h1>
            <p id="keyfineprint">This page is for managing keys that are purchaseable (either one-time or recursively). For the page that manages keys associated with your account, see <a href="../pages/keymanager_acc.html">Key Manager (Account)</a></p>
            <hr>
            <h2>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h2>
        `))
        return;
    })
    if (keys.error) {
        flagged.push(activeacc.uuid)
        chrome.storage.local.set({flagged: flagged})
        document.getElementById('container').replaceChildren(...parseHTML(`
            <h1>Key Manager (Economy)</h1>
            <p id="keyfineprint">This page is for managing keys that are purchaseable (either one-time or recursively). For the page that manages keys associated with your account, see <a href="../pages/keymanager_acc.html">Key Manager (Account)</a></p>
            <hr>
            <h2>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h2>
        `))
        return;
    }

    let my_keys_html = ``
    let owned_keys_html = ``

    let my_keys = []
    let owned_keys = []

    keys.forEach(key => {
        if (key.creator == activeacc.name) {
            my_keys.push(key)
            my_keys_html += `<li class="mykeyentry" id="key-${key.key}">
            <details>
                <summary class='ecokeynameheader'>${sanitize(key.name)}</summary>
                <div class='ecokeydetails'>
                    <label class='editecokeyname'>Name: <input type='text' placeholder='Key Name' class='ecokeynameupdate' value="${sanitize(key.name ?? "Unknown Key")}"> <button class="ecokeysave" title="Save Name" id="savename-${key.key}" data-keyid='${key.key}'><image src='../images/misc_icons/save.png' width=24 height=24 alt='Save'></button></label>
                    <p>ID: ${key.key}</p>
                    <p>Type: ${key.type}</p>
                    ${key.type == 'subscription' ? `<p>Bills every: ${key.subscription.frequency} ${key.subscription.period + (key.subscription.frequency != 1 ? 's' : '')}</p>` : ``}
                    <form class='editpriceandhook'>
                        <label>Price: <input type='text' placeholder='Price' class='ecokeypriceupdate' value=${key.price ?? 0}> RC <button type="button" class="ecokeysave" title="Save Price" id="saveprice-${key.key}" data-keyid='${key.key}'><image src='../images/misc_icons/save.png' width=24 height=24 alt='Save'></button></label>
                        <label>Webhook: <input type='text' placeholder='Webhook URL' class='ecokeywebhook' value=${sanitize(key.webhook ?? '')}> <button type="button" class="ecokeysave" title="Save Webhook" id="savehook-${key.key}" data-keyid='${key.key}'><image src='../images/misc_icons/save.png' width=24 height=24 alt='Save'></button></label>
                    </form>
                    <div class='ecokeycontrolpanel'>
                        <button type="button" class="ecokeyrevoke" id="revoke-${key.key}" data-keyid='${key.key}'>Revoke Key</button>
                        <button type="button" class="ecokeydelete" id="delete-${key.key}" data-keyid='${key.key}'>Delete Key</button>
                    </div>
                    <div class='ecokeystatus'></div>
                </div>
                <hr class="dotted_separator">
                <details class="ecokeyusersowner">
                    <summary class='ecokeyuserlistcount'>Users (${Object.keys(key.users).length})</summary>
                    <ul class=ecokeyuserlist>${renderUsers(key.users, key.type, key.creator, key.key, key.price)}</ul>
                    <div class='addusertoecokey'>
                        <input type="text" class="ecokeynewuser" id="adduser-${key.key}" placeholder="Username">
                        <button class="ecokeynewuserconfirm" data-keyid='${key.key}'>Add User</button>
                    </div>
                    <div class='ecokeyadduserstatus'></div>
                </details>
            </details>
            </li>`
        } else {
            owned_keys.push(key)
            owned_keys_html += `<li class="ownedkeyentry" id="key-${key.key}">
            <details>
                <summary class='ecokeynameheader'>${sanitize(key.name)}</summary>
                <div class='ecokeydetails'>
                    <p class="ecokeyownerlabel">Owner: <img src="https://avatars.rotur.dev/${key.creator}" alt="${key.creator}" width=24 height=24> ${key.creator}</p>
                    <p>ID: ${key.key}</p>
                    <p>Type: ${key.type}</p>
                    <p>Price: ${key.price} RC</p>
                    ${key.type == 'subscription' ? `<p>Bills every: ${key.subscription.frequency} ${key.subscription.period + (key.subscription.frequency != 1 ? 's' : '')}</p>` : ``}
                    ${key.webhook ? `<div class='ecokeywebhookdisplay'>
                        <span class='ecokeywebhookurl'>Webhook URL: ${sanitize(key.webhook)}</span>
                        <button type="button" class="ecokeycopy" id="copyhook-${key.key}" data-keyid='${key.key}' data-webhook='${key.webhook}'><image src='../images/misc_icons/copy.png' width=24 height=24 alt='Copy'></button>
                        </div>` 
                        : ``}
                    ${key.type == 'subscription' ? `
                    <div class='ecokeycontrolpanel'>
                        <button class="ecokeysubcancel" id="cancel-${key.key}" data-keyid='${key.key}' data-owner='${key.creator}'>Cancel Subscription</button>
                    </div>
                    <div class='ecokeystatus'></div>
                        ` : ``}
                </div>
                <hr class="dotted_separator">
                <details class="ecokeyusersowner">
                    <summary class='ecokeyuserlistcount'>Users (${Object.keys(key.users).length})</summary>
                    <ul class=ecokeyuserlist>${renderUsers(key.users, key.type, key.creator, key.key)}</ul>
                </details>
            </details>
            </li>`
        }
    })
    document.getElementById('ownedkeys').replaceChildren(...parseHTML(my_keys_html))
    document.getElementById('boughtkeys').replaceChildren(...parseHTML(owned_keys_html))
    if (my_keys.length == 0) {
        document.getElementById('ownedkeys').replaceChildren(...parseHTML(`<li><h2>You haven't created any keys yet!</h2></li>`))
        document.getElementById('ownedkeys').style = "border: none;"
    }
    if (owned_keys.length == 0) {
        document.getElementById('boughtkeys').replaceChildren(...parseHTML(`<li><h2>You haven't purchased any keys yet!</h2></li>`))
        document.getElementById('boughtkeys').style = "border: none;"
    }
}

async function refreshUsers(keyid) {
	let keys = await fetch(`https://api.rotur.dev/keys/mine?auth=${activeacc.token}`).then(res => res.json())
    keys = keys.filter(item => item.key == keyid)
    const key = keys[0]
    const userlist = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyuserlist"]')
    const userlistcount = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyuserlistcount"]')
    userlist.replaceChildren(...parseHTML(renderUsers(key.users, key.type, key.creator, key.key, key.price)))
    userlistcount.innerText = `Users (${Object.keys(key.users).length})`
}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    RenderKeys()
}

document.getElementById('ecokeytypes').addEventListener('change', async function(e) {
    if (e.target.value == 'onetime') {
        document.getElementById('ecokeyperiod').disabled = true;
        document.getElementById('ecokeyfrequency').disabled = true;
    }
    if (e.target.value == 'subscription') {
        document.getElementById('ecokeyperiod').disabled = false;
        document.getElementById('ecokeyfrequency').disabled = false;
    }
})

document.addEventListener('click', async function(e) {
    if (e.target.className == 'tab') {
        Array.from(document.getElementsByClassName('tab')).forEach(tab => {
            tab.style = 'border-bottom: none;'
        })
        e.target.style = 'border-bottom: 2px solid white;'
        document.getElementById('createdkeyspanel').style.display = (e.target.id == 'createdtab') ? 'block' : 'none'
        document.getElementById('boughtkeyspanel').style.display = (e.target.id == 'boughttab') ? 'block' : 'none'
        document.getElementById('createkeypanel').style.display = (e.target.id == 'createtab') ? 'flex' : 'none'
        document.getElementById('lookupkeysection').style.display = (e.target.id == 'lookuptab') ? 'block' : 'none'
        return;
    }
    if (e.target.className == 'closebtn') {
        closePopup()
        return;
    }
    const keyid = e.target.dataset.keyid
    const keyname = keyid ? (document.getElementById(`key-${keyid}`) ? document.getElementById(`key-${keyid}`).querySelector('[class="ecokeynameheader"]').innerHTML : null ) : null
    if (e.target.className == "ecokeysave") {
        if (e.target.id.includes('saveprice')) {
            const newprice = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeypriceupdate"]').value
            const savesuccess = await fetch(`https://api.rotur.dev/keys/update/${keyid}?auth=${activeacc.token}&key=price&data=${isNaN(newprice) ? 0 : newprice}`).then(res => res.json())
            if (savesuccess.error) {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='failure'>${savesuccess.error}</p>`))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='success'>Key price updated successfully!</p>`))
            }
            return;
        }
        if (e.target.id.includes('savehook')) {
            const newhook = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeywebhook"]').value
            const savesuccess = await fetch(`https://api.rotur.dev/keys/update/${keyid}?auth=${activeacc.token}&key=webhook&data=${encodeURIComponent(newhook)}`).then(res => res.json())
            if (savesuccess.error) {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='failure'>${savesuccess.error}</p>`))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='success'>Key webhook updated successfully!</p>`))
            }  
            return;          
        }
        if (e.target.id.includes('savename')) {
            const newname = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeynameupdate"]').value
            const savesuccess = await fetch(`https://api.rotur.dev/keys/name/${keyid}?auth=${activeacc.token}&name=${newname}`).then(res => res.json())
            if (savesuccess.error) {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='failure'>${savesuccess.error}</p>`))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='success'>Key name updated successfully!</p>`))
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeynameheader"]').replaceChildren(...parseHTML(newname))
            }
            return;
        }
        return;
    }
    if (e.target.className == "ecokeyrevoke") {
        openConfirmRevokePopup(keyid)
        return;
    }
    if (e.target.className == "removeacc") {
        openConfirmRemoveUserPopup(e.target.dataset.name, keyid, e.target.dataset.nextbill, e.target.dataset.refundprice)
    }
    if (e.target.className == "ecokeycopy") {
        try {
            await navigator.clipboard.writeText(e.target.dataset.webhook);
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='success'>Copied URL to clipboard!</p>`))
        } catch (err) {
            console.error('Failed to copy: ', err);
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='failure'>Failed to copy webhook URL</p>`))
        }
        return;
    }
    if (e.target.className == "ecokeydelete") {
        openConfirmDeletePopup(keyid)
        return;
    }
    if (e.target.className == "ecokeynewuserconfirm") {
        const user = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeynewuser"]').value
        if (user != '') {
            const addsuccess = await fetch(`https://api.rotur.dev/keys/admin_add/${keyid}?auth=${activeacc.token}&username=${user}`)
            if (addsuccess.error) {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(...parseHTML(`<p class='failure'>${addsuccess.error}</p>`))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(...parseHTML(`<p class='success'>Successfully added ${user} to ${keyname}</p>`))
                refreshUsers(keyid)
            }
        } else {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(...parseHTML(`<p class='failure'>Please enter a valid username</p>` ))           
        }
        return;
    }
    if (e.target.className == "ecokeysubcancel") {
        openConfirmCancelPopup(keyid, e.target.dataset.owner)
        return;
    }
    if (e.target.id == "ecokeycreate") {
        const newkeyname = document.getElementById('ecokeyname').value
        let newprice = parseFloat(document.getElementById('ecokeyprice').value)
        const isSubscription = document.getElementById('suboption').checked
        const subperiod = document.getElementById('ecokeyperiod').value
        const subfrequency = document.getElementById('ecokeyfrequency').value
        if (isNaN(newprice)) {
            newprice = 0;
        }
        const createsuccess = await fetch(`https://api.rotur.dev/keys/create?auth=${activeacc.token}&name=${newkeyname}&subscription=${isSubscription}${isSubscription ? `&period=${subfrequency}&frequency=${subperiod}` : ``}`).then(res => res.json())
        if (createsuccess.error) {
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(...parseHTML(`<p class='failure'>${createsuccess.error}</p>`))
        } else {
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(...parseHTML(`<p class='success'>Key ${newkeyname} was created successfully!</p>`))
            RenderKeys()
        }
        return;
    }
    // Popup confirmations
    if (e.target.className == "finaldelete") {
        closePopup()
        const deletesuccess = await fetch(`https://api.rotur.dev/keys/delete/${keyid}?auth=${activeacc.token}`).then(res => res.json())
        if (deletesuccess.error) {
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(...parseHTML(`<p class='failure'>${deletesuccess.error}</p>`))
        } else {
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(...parseHTML(`<p class='success'>Key ${keyname} was deleted successfully</p>`))
            RenderKeys()
        }
        return;
    }
    if (e.target.className == "finalcancel") {
        closePopup()
        const cancelsuccess = await fetch(`https://api.rotur.dev/keys/cancel/${keyid}?auth=${activeacc.token}`).then(res => res.json())
        if (cancelsuccess.error) {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='failure'>${cancelsuccess.error}</p>`))
        } else {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='success'>Your subscription to ${keyname} will be cancelled on the next billing date. You won't be charged on that date. For now until the next billing date, you can continue to enjoy any benefits this key provides.</p>`))         
        }
        return;
    }
    if (e.target.className == "finalrevoke") {
        const revokesuccess = await fetch(`https://api.rotur.dev/keys/revoke/${keyid}?auth=${activeacc.token}`).then(res => res.json())
        closePopup()
        if (revokesuccess.error) {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='failure'>${revokesuccess.error}</p>`))
        } else {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(...parseHTML(`<p class='success'>Key successfully revoked from all users.</p>`))
            refreshUsers(keyid)
        }
        return;
    }
    if (e.target.className == "finalremoval") {
        const user = e.target.dataset.user
        const DoRefund = document.getElementById('ecokeyrefund') ? document.getElementById('ecokeyrefund').checked : false
        const refundamt = (parseFloat(e.target.dataset.refundamt) * 0.9).toFixed(2)
        closePopup()
        const removesuccess = await fetch(`https://api.rotur.dev/keys/admin_remove/${keyid}?auth=${activeacc.token}&username=${user}`)
        if (removesuccess.error) {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(...parseHTML(`<p class='failure'>${removesuccess.error}</p>`))
        } else {
            if (DoRefund && refundamt > 0) {
                const refundsuccess = await fetch(`https://api.rotur.dev/me/transfer?auth=${activeacc.token}`, {
                                            method: "POST",
                                            body: JSON.stringify({to: user, amount: refundamt, note: `(RA) Refund for your removal from ${keyname}`})
                                        }).then(res => res.json())
                if (refundsuccess.error) {
                    document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(...parseHTML(`<p class='partialsuccess'>While ${user} was successfully removed from ${keyname}, the refund could not be processed. You may have to manually refund them instead.</p>`))
                } else {
                    document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(...parseHTML(`<p class='success'>Successfully removed ${user} from ${keyname}, refunding them ${refundamt} RC in the process.</p>`))
                }
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(...parseHTML(`<p class='success'>Successfully removed ${user} from ${keyname}.</p>`))
            }
            refreshUsers(keyid)
        }
        return;
    }
    // Lookup
    if (e.target.id == 'ecokeybuy') {
        if (parseFloat(e.target.dataset.price) > parseFloat(e.target.dataset.usercurrency)) {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>You have insufficient funds to buy this key (${e.target.dataset.usercurrency})</p>`))
        } else {
            const alreadyownskey = await fetch(`https://api.rotur.dev/keys/check/${activeacc.name}?key=${e.target.dataset.keyid}`).then(res => res.json())
            if (alreadyownskey.owned) {
                document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>You already own this key!</p>`))
            } else {
                openConfirmBuyPopup(e.target.dataset.keyid, e.target.dataset.name, e.target.dataset.price, e.target.dataset.currency)
            }
        }
        return;
    }

    if (e.target.className == 'finalbuy') {
        const buysuccess = await fetch(`https://api.rotur.dev/keys/buy/${keyid}?auth=${activeacc.token}`)
        if (buysuccess.error) {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>${buysuccess.error}</p>`))
        } else {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(...parseHTML(`<p class='success'>Purchase Successful!</p>`))
        }
        return;
    }
})

document.getElementById('keylookup').addEventListener('submit', async function(e) {
    document.getElementById('ecokeylookupstatusplaceholder').replaceChildren()
    e.preventDefault()
    const keyid = document.getElementById('keysearchbar').value
    if (keyid == '') {
        document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>Enter a valid Key ID</p>`))
    }
    const keydata = await fetch(`https://api.rotur.dev/keys/get/${keyid}`).then(res => res.json())

    if (keydata.error) {
        document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>${keydata.error}</p>`))
    } else {
        const userinfo = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=0`).then(res => res.json())
        const usercurrency = userinfo.currency
        document.getElementById('ecokeylookupplaceholder').style = 'border: 2px solid white;'
        document.getElementById('ecokeylookupplaceholder').replaceChildren(...parseHTML(`
        <h2>${keydata.name}</h2>
        <div id='ecokeylookupinfo'>
            <p>Price: ${keydata.price} RC</p>
            <p>Type: ${keydata.type}</p>
        </div>
        <button id='ecokeybuy' data-name='${keydata.name}' data-keyid="${keydata.key}" data-currency='${usercurrency}' data-price='${keydata.price}'>Buy Key</button>
        `))
    }
})