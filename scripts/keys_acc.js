import { sanitize, formatDate, parseHTML } from "../index.js"

let systemcache = ''

function openErrorPopup(error) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Error</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${error}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `))
}

function openSuccessPopup(msg) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Success</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${msg}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `))
}

function openPopup(keyname) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Key</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Really delete the key "${keyname}"?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finaldelete" data-keyname='${keyname}'>Yes</button>
        </div>
    `))
}

function openSystemPopup(system_name, owner) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm New System</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Change your system to ${system_name}? This will give the owner of the system, <img src='https://avatars.rotur.dev/${owner}' width=16 height=16> ${owner}, elevated permissions over your Rotur account, including the ability to ban or delete your Rotur account. Do note that Mistium, being the owner of Rotur, has elevated permissions over all Rotur accounts, regardless of system. On top of that, each time you claim a daily credit, the system owner will get 0.25 credits. Only proceed with this action if you trust the system's owner.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalsystemconfirm" data-keyname='system'>Confirm</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

const read_only_keys = ["discord_id", "key", "created", "max_size", "last_login"] // Non-sys keys that are still read-only
const main_keys = ["bio", "pfp", "system", "pronouns", "private", "email", "username", "phone", "display_name", "banner", "banners"]

let key_names = []

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

async function getSystems(system) {
    const systems = await fetch(`https://api.rotur.dev/systems`).then(res => res.json())
    const systemsarray = Object.keys(systems)

    let systemoptions = `<option value="${system}">${system}</option>`

    for (let i=0; i<systemsarray.length; i++) {
        if (systemsarray[i].toLowerCase() != system.toLowerCase()) {
            systemoptions += `<option value="${systemsarray[i]}">${systemsarray[i]}</option>`
        }
    }
    systemcache = systems
    return systemoptions;
}

async function renderKeys() {
   if (!activeacc.uuid) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Account)</h1>
            <p>This page is for managing account keys. For the page that manages keys associated with purchases / subscriptions, see <a href="../pages/keymanager_eco.html">Key Manager (Purchases)</a></p>
            <hr>
            <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>
        `))
        return;
    }
    if (flagged.includes(activeacc.uuid)) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Account)</h1>
            <p>This page is for managing account keys. For the page that manages keys associated with purchases / subscriptions, see <a href="../pages/keymanager_eco.html">Key Manager (Purchases)</a></p>
            <hr>
            <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
        `))
        return;
    }

    const accdata = await fetch(`https://api.rotur.dev/get_user?auth=${activeacc.token}`).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Account)</h1>
            <p>This page is for managing account keys. For the page that manages keys associated with purchases / subscriptions, see <a href="../pages/keymanager_eco.html">Key Manager (Purchases)</a></p>
            <hr>
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `))
        return 0;
    })

    if ((accdata.error && (accdata.error == 'Invalid authentication credentials') && !accdata.username) || (accdata['sys.banned'])) { // Extra check in place in case someone decides to set a key named "error" to "Invalid authentication credentials"
        flagged.push(activeacc.uuid)
        chrome.storage.local.set({flagged: flagged})
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Account)</h1>
            <p>This page is for managing account keys. For the page that manages keys associated with purchases / subscriptions, see <a href="../pages/keymanager_eco.html">Key Manager (Purchases)</a></p>
            <hr>
            <h2>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h2>
        `))
        return;
    }

    key_names = Object.keys(accdata)

    document.getElementById('readonlykeys').replaceChildren()
    document.getElementById('mainkeys').replaceChildren()
    document.getElementById('sys_keys').replaceChildren()
    document.getElementById('otherkeys').replaceChildren()

    for (let i=0; i<key_names.length; i++) {
        let keyname = key_names[i]
        let keyvalue = accdata[keyname]
        let isReadOnly = (read_only_keys.includes(keyname) || keyname.startsWith('sys.'))
        if (typeof(keyvalue) == 'object') {
            keyvalue = JSON.stringify(keyvalue)
        }
        let key_element = document.createElement('li')
        key_element.className = 'keyelement'
        key_element.id = keyname
        key_element.replaceChildren(...parseHTML(`
        <ul class='keylistitem'>
            <li class='keylistname'>
                ${sanitize(keyname)}
                <div class="keyactionbar">
                    <button data-keyname="${keyname}" class="keynamecopy" title="Copy key name"><img src="../images/misc_icons/copy.png" width='16' height='16'> Name</button>
                    <button data-keyname="${keyname}" class="keyvaluecopy" title="Copy key value"><img src="../images/misc_icons/copy.png" width='16' height='16'> Value</button>
                    <button data-keyname="${keyname}" class="keysave" title="Save new key value" ${isReadOnly ? 'style="display: none;"' : ''}><img src='../images/misc_icons/save.png' width='20' height='20'></button>
                    <button data-keyname="${keyname}" class="keydelete" title="Delete key" ${isReadOnly || ["system", "username"].includes(keyname) ? 'style="display: none;"' : ''}><img src='../images/misc_icons/delete.png' width='20' height='20'></button>
                    ${keyname == 'key' ? `<button data-keyname="${keyname}" title="Toggle key visibility" data-visible="false" class="keyview"><img src='../images/misc_icons/invisible.png' width='20' height='20'></button>` : ''}
                </div>
            </li>
            <li class='keylistvalue'>
            ${keyname == "system" ? `
                <select name="system" id='modifier-${keyname}' class='keymodifierbox'>
                    ${await getSystems(accdata.system)}
                </select>` : `
            ${keyname == "bio" ? `
                <textarea id='modifier-${keyname}' class='keymodifierbox' placeholder='Edit Key Value...'>${sanitize(String(keyvalue))}</textarea>               
                ` : `
                <input type=${keyname == 'key' ? 'password' : 'text'} id='modifier-${keyname}' class='keymodifierbox' value='${sanitize(String(keyvalue))}' placeholder='Edit Key Value...' ${isReadOnly ? 'disabled' : ''}></input>`}`}
            </li>
        </ul>`))

        if (read_only_keys.includes(keyname)) {
            document.getElementById('readonlykeys').appendChild(key_element)
        } else if (main_keys.includes(keyname)) {
            document.getElementById('mainkeys').appendChild(key_element)
        } else if (keyname.startsWith('sys.')) {
            document.getElementById('sys_keys').appendChild(key_element)
        } else {
            document.getElementById('otherkeys').appendChild(key_element)
        }
    }
    if (!document.getElementById('mainkeys').hasChildNodes) {
        document.getElementById('mainkeys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.innerText = 'No keys exist in this section yet.'
        document.getElementById('mainkeys').appendChild(hr)
        document.getElementById('mainkeys').appendChild(h2)
    }
    if (!document.getElementById('sys_keys').hasChildNodes) {
        document.getElementById('sys_keys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.innerText = 'No keys exist in this section yet.'
        document.getElementById('sys_keys').appendChild(hr)
        document.getElementById('sys_keys').appendChild(h2)
    }
    if (!document.getElementById('readonlykeys').hasChildNodes) {
        document.getElementById('readonlykeys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.innerText = 'No keys exist in this section yet.'
        document.getElementById('readonlykeys').appendChild(hr)
        document.getElementById('readonlykeys').appendChild(h2)
    }
    if (!document.getElementById('otherkeys').hasChildNodes) {
        document.getElementById('otherkeys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.innerText = 'No keys exist in this section yet.'
        document.getElementById('otherkeys').appendChild(hr)
        document.getElementById('otherkeys').appendChild(h2)
    }
}

renderKeys();

document.addEventListener('click', async function(e) {
    if (e.target.className == 'tab') {
        Array.from(document.getElementsByClassName('tab')).forEach(tab => {
            tab.style = 'border-bottom: none;'
        })
        e.target.style = 'border-bottom: 2px solid white;'
        document.getElementById('keys_main').style.display = (e.target.id == 'maintab') ? 'block' : 'none'
        document.getElementById('keys_sys').style.display = (e.target.id == 'systab') ? 'block' : 'none'
        document.getElementById('keys_readonly').style.display = (e.target.id == 'readonlytab') ? 'block' : 'none'
        document.getElementById('keys_other').style.display = (e.target.id == 'othertab') ? 'block' : 'none'
        document.getElementById('keys_create').style.display = (e.target.id == 'createtab') ? 'block' : 'none'
        return;
    }
    if (e.target.className == 'closebtn') {
        closePopup()
        return;
    }
    if (e.target.className == 'keyview') {
        e.target.replaceChildren(...parseHTML(`<img src='../images/misc_icons/${(e.target.dataset.visible == "true" ? 'in' : '')}visible.png' width='20' height='20'>`))
        document.getElementById('modifier-key').type = (e.target.dataset.visible == "true" ? 'password' : 'text')
        e.target.dataset.visible = (e.target.dataset.visible == "true" ? "false" : "true")
        return;
    }

    if (e.target.id == 'createkeybtn') {
        const error_element = document.getElementById('createkeystatusplaceholder')
        const keyname = document.getElementById('createkeyname').value
        const keyvalue = document.getElementById('createkeyvalue').value
        if (keyname == '') {
            error_element.replaceChildren(...parseHTML(`<p class='failure'>You can't create a key with a blank name.</p>`))
        } else if (key_names.includes(keyname)) {
            error_element.replaceChildren(...parseHTML(`<p class='failure'>This key already exists. Try modifying it instead if you can.</p>`))
        } else if (read_only_keys.includes(keyname)) {
            error_element.replaceChildren(...parseHTML(`<p class='failure'>This is a reserved key.</p>`))
        } else if (keyname.startsWith('sys.')) {
            error_element.replaceChildren(...parseHTML(`<p class='failure'>Key name can't begin with "sys."</p>`))
        } else if (keyname == "banner" || keyname == "banners") {
            error_element.replaceChildren(...parseHTML(`<p class='failure'>Setting this key would normally cost you 10 credits. Try changing your banner through the account manager's profile editor instead.</p>`))
        } else {
            const keycreate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeacc.token, key: keyname, value: keyvalue})}).then(res => res.json())
            if (keycreate.error) {
                error_element.replaceChildren(...parseHTML(`<p class='failure'>${keycreate.error}</p>`))
                return;
            } else {
                document.getElementById('createkeyname').value = ''
                document.getElementById('createkeyvalue').value = ''
                error_element.replaceChildren(...parseHTML(`<p class='success'>Key ${sanitize(keyname)} with value ${sanitize(keyvalue)} was created successfully!</p>`))
                renderKeys()
                return;
            }
        }
        setTimeout(function() { error_element.replaceChildren() }, 10000)
        return;
    }

    if (["keynamecopy", "keyvaluecopy", "keysave", "keydelete", "finaldelete", "finalsystemconfirm"].includes(e.target.className)) {
        const keyname = e.target.dataset.keyname
        const keyvalue = document.getElementById(`modifier-${keyname}`).value
        let error_element = ''
        if (main_keys.includes(keyname)) {
            error_element = document.getElementById('mainerrorplaceholder')
        } else if (read_only_keys.includes(keyname)) {
            error_element = document.getElementById('readonlyerrorplaceholder')
        } else if (keyname.startsWith('sys.')) {
            error_element = document.getElementById('syserrorplaceholder')
        } else {
            error_element = document.getElementById('othererrorplaceholder')
        }
        if (e.target.className == 'keynamecopy') {
            try {
                await navigator.clipboard.writeText(keyname);
                error_element.replaceChildren(...parseHTML(`<p class='success'>Copied key name to clipboard!</p>`))
            } catch (err) {
                console.error('Failed to copy: ', err);
                error_element.replaceChildren(...parseHTML(`<p class='failure'>Failed to copy key name</p>`))
            }
            setTimeout(function() { error_element.replaceChildren() }, 10000)
            return;
        }
        if (e.target.className == 'keyvaluecopy') {
            try {
                await navigator.clipboard.writeText(keyvalue);
                error_element.replaceChildren(...parseHTML(`<p class='success'>Copied key value to clipboard!</p>`))
            } catch (err) {
                console.error('Failed to copy: ', err);
                error_element.replaceChildren(...parseHTML(`<p class='failure'>Failed to copy key value</p>`))
            }  
            setTimeout(function() { error_element.replaceChildren() }, 10000)
            return;     
        }
        if (e.target.className == 'keysave' || e.target.className == 'finalsystemconfirm') {
            if (e.target.className == 'finalsystemconfirm') {
                closePopup();
            }
            if (keyname == 'system' && e.target.className == 'keysave') {
                openSystemPopup(keyvalue, systemcache[keyvalue].owner.name)
            } else if (keyname == 'banner' || keyname == 'banners') {
                error_element.replaceChildren(...parseHTML(`<p class='failure'>Setting this key would normally cost you 10 credits. Try changing your banner through the account manager's profile editor instead.</p>`))
            } else {
                const keyupdate = await fetch(`https://api.rotur.dev/users`,
                    {method: 'PATCH', body: JSON.stringify({auth: activeacc.token, key: keyname, value: keyvalue})}).then(res => res.json())
                if (keyupdate.error) {
                    error_element.replaceChildren(...parseHTML(`<p class='failure'>${keyupdate.error}</p>`))
                } else {
                    error_element.replaceChildren(...parseHTML(`<p class='success'>Key ${keyname} updated successfully!</p>`))
                    if (keyname == 'username') {
                        const old_name = activeacc.name
                        activeacc.name = keyvalue
                        chrome.storage.local.set({ activeacc: activeacc });
                        const exist_index = accounts.findIndex(user => user.uuid === activeacc.uuid);
                        accounts[exist_index].name = keyvalue
                        chrome.storage.local.set({ userdata: accounts });
                        document.getElementById('headeractiveacc').textContent = "Active: " + keyvalue
                        if (keyvalue.length < 15) {
                            document.getElementById('headeractiveacc').title = ''
                            document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).title = ''
                        } else {
                            document.getElementById('headeractiveacc').title = keyvalue
                            document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).title = keyvalue
                        }
                        document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).textContent = keyvalue
                        document.getElementById('accountflyoutlist').querySelector(`[data-accref="${old_name}"]`).dataset.accref = keyvalue
                    }
                }
            }
            setTimeout(function() { error_element.replaceChildren() }, 10000)
            return;
        }
        if (e.target.className == 'keydelete') {
            openPopup(keyname)
            return;
        }
    
        if (e.target.className == 'finaldelete') {
            const deleted_key = e.target.dataset.keyname
            const keydelete = await fetch(`https://api.rotur.dev/me/delete`,
                {method: 'DELETE', body: JSON.stringify({auth: activeacc.token, key: deleted_key})})
            closePopup()
            if (keydelete.error) {
                error_element.replaceChildren(...parseHTML(`<p class='failure'>${keydelete.error}</p>`))
            } else {
                error_element.replaceChildren(...parseHTML(`<p class='success'>Key ${deleted_key} deleted successfully!</p>`))
                renderKeys()
            }
            setTimeout(function() { error_element.replaceChildren() }, 10000)
            return;
        }
    }
})