import { sanitize, formatDate, parseHTML, CreateEmptyPlaceholder, MiniError } from "../index.js"

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const controller = new AbortController()
const requestlimit = setTimeout(() => controller.abort(), 3000);

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
    const userlist_html = []
    const userlist = Object.keys(userdata)
    userlist.forEach(user => {
        const usercard = document.getElementById('keyusertemplate').content.cloneNode(true)
        usercard.querySelector('img').src = `https://avatars.rotur.dev/${user}`
        usercard.querySelector('img').alt = user
        usercard.querySelector('h2').textContent = `${user} ${user == creator ? "👑" : ""}`
        if ((user != creator) && (creator == activeacc.name)) {
            usercard.querySelector('.removeacc').dataset.name = user
            usercard.querySelector('.removeacc').dataset.nextbill = userdata[user].next_billing
            usercard.querySelector('.removeacc').dataset.refundprice = price
            usercard.querySelector('.removeacc').dataset.keyid = id
        } else {
            usercard.querySelector('.removeacc').remove()
        }
        usercard.querySelector('.purchasedate').textContent = `${type == "subscription" ? "Subscribed" : "Purchased"}: ${formatDate(userdata[user].time * 1000)}`
        userdata[user].next_billing ? usercard.querySelector('.nextbillingdate').textContent = `Next Billing: ${formatDate(userdata[user].next_billing)}` : usercard.querySelector('.nextbillingdate').remove()

        userlist_html.push(usercard)
    })
    return userlist_html;
}

async function RenderKeys() {
	const keys = await fetch(`https://api.rotur.dev/keys/mine?auth=${activeacc.token}`, {signal: controller.signal}).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Economy)</h1>
            <p id="keyfineprint">This page is for managing keys that are purchaseable (either one-time or recursively). For the page that manages keys associated with your account, see <a href="../pages/keymanager_acc.html">Key Manager (Account)</a></p>
            <hr>
            <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>
        `))
        return;
    })
    clearTimeout(requestlimit)
    if (keys && keys.error) {
        if (keys.error.includes('Invalid')) {
            flagged.push(activeacc.uuid)
            chrome.storage.local.set({flagged: flagged})
            document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
                <h1>Key Manager (Economy)</h1>
                <p id="keyfineprint">This page is for managing keys that are purchaseable (either one-time or recursively). For the page that manages keys associated with your account, see <a href="../pages/keymanager_acc.html">Key Manager (Account)</a></p>
                <hr>
                <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
            `))
            return;
        } else {
            document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
                <h1>Key Manager (Economy)</h1>
                <p id="keyfineprint">This page is for managing keys that are purchaseable (either one-time or recursively). For the page that manages keys associated with your account, see <a href="../pages/keymanager_acc.html">Key Manager (Account)</a></p>
                <hr>
                <h3>The sub-token you have granted for your current account does not allow you to view this page. To resolve this issue, please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> and reauthenticate.</h3>
            `))
        }
    }
    if (!keys) {
        return;
    }

    const my_keys_html = []
    const owned_keys_html = []

    let my_keys = []
    let owned_keys = []

    keys.forEach(key => {
        if (key.creator == activeacc.name) {
            my_keys.push(key)
            const mykey = document.getElementById('mykeytemplate').content.cloneNode(true)
            mykey.querySelector('.mykeyentry').id = `key-${key.key}`
            mykey.querySelectorAll('[data-keyid]').forEach(keyobj => {
                keyobj.dataset.keyid = key.key
            })
            mykey.querySelector('.ecokeynameheader').textContent = key.name
            mykey.querySelector('.ecokeynameupdate').value = key.name
            mykey.querySelector('.keyidlabel').textContent = `ID: ${key.key}`
            mykey.querySelector('.keytypelabel').textContent = `Type: ${key.type}`
            key.type == 'subscription' ? mykey.querySelector('.keybillinglabel').textContent = `Bills every: ${key.subscription.frequency} ${key.subscription.period + (key.subscription.frequency != 1 ? 's' : '')}` : mykey.querySelector('.keybillinglabel').remove()
            mykey.querySelector('.ecokeypriceupdate').value = (key.price ?? 0)
            mykey.querySelector('.ecokeywebhook').value = (key.webhook ?? '')
            mykey.querySelector('[id*="saveprice-"]').id = `saveprice-${key.key}`
            mykey.querySelector('[id*="savehook-"]').id = `savehook-${key.key}`
            mykey.querySelector('[id*="savename-"]').id = `savename-${key.key}`
            mykey.querySelector('.ecokeyuserlistcount').textContent = `Users (${Object.keys(key.users).length})`
            mykey.querySelector('.ecokeynewuser').id = `adduser-${key.key}`
            mykey.querySelector('.ecokeyuserlist').replaceChildren(...renderUsers(key.users, key.type, key.creator, key.key, key.price))
            mykey.querySelector('.ecokeyrevoke').id = `revoke-${key.key}`
            mykey.querySelector('.ecokeydelete').id = `delete-${key.key}`

            my_keys_html.push(mykey)
        } else {
            const config = {
                elements: ['p', 'img'],
                attributes: ['src', 'alt', 'width', 'height']
            }
            const sanitizer = new Sanitizer(config)
            owned_keys.push(key)
            const boughtkey = document.getElementById('boughtkeytemplate').content.cloneNode(true)

            boughtkey.querySelector('.ownedkeyentry').id = `key-${key.key}`
            boughtkey.querySelectorAll('[data-keyid]').forEach(keyobj => {
                keyobj.dataset.keyid = key.key
            })
            boughtkey.querySelector('.ecokeyownerlabel').setHTML(`Owner: <img src="https://avatars.rotur.dev/${key.creator}" alt="${key.creator}" width=24 height=24> ${key.creator}`, {sanitizer: sanitizer})
            boughtkey.querySelector('.ecokeynameheader').textContent = key.name
            boughtkey.querySelector('.keyidlabel').textContent = `ID: ${key.key}`
            boughtkey.querySelector('.keytypelabel').textContent = `Type: ${key.type}`
            key.type == 'subscription' ? boughtkey.querySelector('.keybillinglabel').textContent = `Bills every: ${key.subscription.frequency} ${key.subscription.period + (key.subscription.frequency != 1 ? 's' : '')}` : boughtkey.querySelector('.keybillinglabel').remove()
            if (key.webhook) {
                boughtkey.querySelector('.ecokeywebhookurl').textContent = `Webhook URL: ${key.webhook}`
                boughtkey.querySelector('.ecokeycopy').id = `copyhook-${key.key}`
                boughtkey.querySelector('.ecokeycopy').dataset.webhool = key.webhook
            } else {
                boughtkey.querySelector('.ecokeywebhookdisplay').remove()
            }
            boughtkey.querySelector('.ecokeyuserlistcount').textContent = `Users (${Object.keys(key.users).length})`
            boughtkey.querySelector('.ecokeyuserlist').replaceChildren(...renderUsers(key.users, key.type, key.creator, key.key, key.price))
            boughtkey.querySelector('.ecokeysubcancel').id = `cancel-${key.key}`
            boughtkey.querySelector('.ecokeysubcancel').dataset.owner = key.creator
            owned_keys_html.push(boughtkey)
        }
    })
    document.getElementById('ownedkeys').replaceChildren(...my_keys_html)
    document.getElementById('boughtkeys').replaceChildren(...owned_keys_html)
    if (my_keys.length == 0) {
        document.getElementById('ownedkeys').replaceChildren(CreateEmptyPlaceholder("You haven't created any keys yet!"))
        document.getElementById('ownedkeys').style = "border: none;"
    } else {
        document.getElementById('ownedkeys').style = "border: 2px solid white;"
    }
    if (owned_keys.length == 0) {
        document.getElementById('boughtkeys').replaceChildren(CreateEmptyPlaceholder("You haven't purchased any keys yet!"))
        document.getElementById('boughtkeys').style = "border: none;"
    } else {
        document.getElementById('boughtkeys').style = "border: 2px solid white;"
    }
}

async function refreshUsers(keyid) {
	let keys = await fetch(`https://api.rotur.dev/keys/mine?auth=${activeacc.token}`).then(res => res.json())
    keys = keys.filter(item => item.key == keyid)
    const key = keys[0]
    const userlist = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyuserlist"]')
    const userlistcount = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyuserlistcount"]')
    userlist.replaceChildren(...renderUsers(key.users, key.type, key.creator, key.key, key.price))
    userlistcount.innerText = `Users (${Object.keys(key.users).length})`
}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    RenderKeys()
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
    document.getElementById('keylookup').addEventListener('submit', async function(e) {
        document.getElementById('ecokeylookupstatusplaceholder').replaceChildren()
        e.preventDefault()
        const keyid = document.getElementById('keysearchbar').value
        if (keyid == '') {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(MiniError('failure', 'Enter a valid Key ID'))
        }
        const keydata = await fetch(`https://api.rotur.dev/keys/get/${keyid}`).then(res => res.json())

        if (keydata.error) {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(MiniError('failure', keydata.error))
        } else {
            const userinfo = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=0`).then(res => res.json())
            const usercurrency = userinfo.currency
            document.getElementById('ecokeylookupplaceholder').style = 'border: 2px solid white;'
            const h2 = document.createElement('h2')
            const ecokeylookupdiv = document.createElement('div')
            const p1 = document.createElement('p')
            const p2 = document.createElement('p')
            const buybtn = document.createElement('button')

            h2.textContent = keydata.name
            ecokeylookupdiv.id = "ecokeylookupinfo"
            buybtn.id = 'ecokeybuy'
            buybtn.dataset.name = keydata.name
            buybtn.dataset.keyid = keydata.key
            buybtn.dataset.currency = usercurrency
            buybtn.dataset.price = keydata.price
            p1.textContent = `Type: ${keydata.type}`
            p2.textContent = `Price: ${keydata.price} RC`
            buybtn.textContent = "Buy Key"
            ecokeylookupdiv.replaceChildren(...[p1, p2])
            document.getElementById('ecokeylookupplaceholder').replaceChildren(...[h2, ecokeylookupdiv, buybtn])
        }
    })
}


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
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('failure', savesuccess.error))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('success', `Key price updated successfully!`))
            }
            return;
        }
        if (e.target.id.includes('savehook')) {
            const newhook = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeywebhook"]').value
            const savesuccess = await fetch(`https://api.rotur.dev/keys/update/${keyid}?auth=${activeacc.token}&key=webhook&data=${encodeURIComponent(newhook)}`).then(res => res.json())
            if (savesuccess.error) {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('failure', savesuccess.error))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('success', `Key webhook updated successfully!`))
            }  
            return;          
        }
        if (e.target.id.includes('savename')) {
            const newname = document.getElementById(`key-${keyid}`).querySelector('[class="ecokeynameupdate"]').value
            const savesuccess = await fetch(`https://api.rotur.dev/keys/name/${keyid}?auth=${activeacc.token}&name=${newname}`).then(res => res.json())
            if (savesuccess.error) {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('failure', savesuccess.error))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('success', `Key name updated successfully!`))
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeynameheader"]').textContent = newname
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
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('success', `Copied URL to clipboard!`))
        } catch (err) {
            console.error('Failed to copy: ', err);
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('failure', `Failed to copy webhook URL`))
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
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(MiniError('failure', addsuccess.error))
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(MiniError('success', `Successfully added ${user} to ${keyname}`))
                refreshUsers(keyid)
            }
        } else {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(MiniError('failure', `Please enter a valid username`))
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
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(MiniError('failure', createsuccess.error))
        } else {
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(MiniError('success', `Key ${newkeyname} was created successfully!`))
            RenderKeys()
        }
        return;
    }
    // Popup confirmations
    if (e.target.className == "finaldelete") {
        closePopup()
        const deletesuccess = await fetch(`https://api.rotur.dev/keys/delete/${keyid}?auth=${activeacc.token}`).then(res => res.json())
        if (deletesuccess.error) {
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(MiniError('failure', deletesuccess.error))
        } else {
            document.getElementById(`createkeystatusplaceholdereco`).replaceChildren(MiniError('success', `Key ${keyname} was deleted successfully`))
            RenderKeys()
        }
        return;
    }
    if (e.target.className == "finalcancel") {
        closePopup()
        const cancelsuccess = await fetch(`https://api.rotur.dev/keys/cancel/${keyid}?auth=${activeacc.token}`).then(res => res.json())
        if (cancelsuccess.error) {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('failure', cancelsuccess.error))
        } else {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('success', `Your subscription to ${keyname} will be cancelled on the next billing date. You won't be charged on that date. For now until the next billing date, you can continue to enjoy any benefits this key provides.`))         
        }
        return;
    }
    if (e.target.className == "finalrevoke") {
        const revokesuccess = await fetch(`https://api.rotur.dev/keys/revoke/${keyid}?auth=${activeacc.token}`).then(res => res.json())
        closePopup()
        if (revokesuccess.error) {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('failure', revokesuccess.error))
        } else {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeystatus"]').replaceChildren(MiniError('success', 'Key successfully revoked from all users.'))
            refreshUsers(keyid)
        }
        return;
    }
    if (e.target.className == "finalremoval") {
        const user = e.target.dataset.user
        const DoRefund = document.getElementById('ecokeyrefund') ? document.getElementById('ecokeyrefund').checked : false
        const refundamt = (parseFloat(e.target.dataset.refundamt) * 0.9).toFixed(2)
        closePopup()
        const removesuccess = await fetch(`https://api.rotur.dev/keys/admin_remove/${keyid}?auth=${activeacc.token}&username=${user}`).then(res => res.json())
        if (removesuccess.error) {
            document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(MiniError('failure', removesuccess.error))
        } else {
            if (DoRefund && refundamt > 0) {
                const refundsuccess = await fetch(`https://api.rotur.dev/me/transfer?auth=${activeacc.token}`, {
                                            method: "POST",
                                            body: JSON.stringify({to: user, amount: refundamt, note: `(RA) Refund for your removal from ${keyname}`})
                                        }).then(res => res.json())
                if (refundsuccess.error) {
                    document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(MiniError('partialsuccess', `While ${user} was successfully removed from ${keyname}, the refund could not be processed. You may have to manually refund them instead.`))
                } else {
                    document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(MiniError('success', `Successfully removed ${user} from ${keyname}, refunding them ${refundamt} RC in the process.`))
                }
            } else {
                document.getElementById(`key-${keyid}`).querySelector('[class="ecokeyadduserstatus"]').replaceChildren(MiniError('success', `Successfully removed ${user} from ${keyname}.`))
            }
            refreshUsers(keyid)
        }
        return;
    }
    // Lookup
    if (e.target.id == 'ecokeybuy') {
        if (parseFloat(e.target.dataset.price) > parseFloat(e.target.dataset.usercurrency)) {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(MiniError('failure', `You have insufficient funds to buy this key (${e.target.dataset.usercurrency})`))
        } else {
            const alreadyownskey = await fetch(`https://api.rotur.dev/keys/check/${activeacc.name}?key=${e.target.dataset.keyid}`).then(res => res.json())
            if (alreadyownskey.owned) {
                document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(MiniError('failure', 'You already own this key!'))
            } else {
                openConfirmBuyPopup(e.target.dataset.keyid, e.target.dataset.name, e.target.dataset.price, e.target.dataset.currency)
            }
        }
        return;
    }

    if (e.target.className == 'finalbuy') {
        const buysuccess = await fetch(`https://api.rotur.dev/keys/buy/${keyid}?auth=${activeacc.token}`)
        if (buysuccess.error) {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(MiniError('failure', buysuccess.error))
        } else {
            document.getElementById('ecokeylookupstatusplaceholder').replaceChildren(MiniError('success', 'Purchase Successful!'))
        }
        return;
    }
})