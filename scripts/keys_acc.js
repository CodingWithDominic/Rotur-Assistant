import { sanitize, formatDate, parseHTML, openSuccessPopup, MiniError } from "../index.js"

let systemcache = ''
let tosrecentlyaccepted = false

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
            <button class="finaldelete" data-keyname='${sanitize(keyname)}'>Yes</button>
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
        <p id="deleteconfirmdialogue">Change your system to ${sanitize(system_name)}? This will give the owner of the system, <img src='https://avatars.rotur.dev/${owner}' width=16 height=16"> ${owner}, elevated permissions over your Rotur account, including the ability to ban or delete your Rotur account, or modify potentially sensitive keys. Do note that Mistium, being the owner of Rotur, has elevated permissions over all Rotur accounts, regardless of system. On top of that, each time you claim a daily credit, the system owner will get 0.25 credits. Only proceed with this action if you trust the system's owner.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalsystemconfirm" data-keyname='system'>Confirm</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
    if (tosrecentlyaccepted) {
        tosrecentlyaccepted = false
        window.location.reload()
    }
}

const read_only_keys = ["discord_id", "key", "created", "max_size", "last_login"] // Non-sys keys that are still read-only
const main_keys = ["bio", "pfp", "system", "pronouns", "private", "email", "username", "phone", "display_name", "banner", "banners", 'theme']
const exempt_main_keys = ["theme", "private"] // Main keys that will still be checked for a JSON-friendly value

let key_names = []

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

function getSystems(system) {
    const systems = systemcache
    const systemsarray = Object.keys(systems)
    const systemoptions = []
    for (let i=0; i<systemsarray.length; i++) {
        const systemhtml = document.createElement('option')
        systemhtml.value = systemsarray[i]
        systemhtml.selected = (systemsarray[i].toLowerCase() == system.toLowerCase())
        systemhtml.textContent = systemsarray[i]
        systemoptions.push(systemhtml)
    }
    return systemoptions;
}

function checkBlanks() {
    if (document.getElementById('mainkeys').childElementCount == 0) {
        document.getElementById('mainkeys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.textContent = 'No keys exist in this section yet.'
        document.getElementById('mainkeys').appendChild(hr)
        document.getElementById('mainkeys').appendChild(h2)
    } else {
        document.getElementById('mainkeys').style.border = '1px solid white'
    }
    if (document.getElementById('sys_keys').childElementCount == 0) {
        document.getElementById('sys_keys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.innerText = 'No keys exist in this section yet.'
        document.getElementById('sys_keys').appendChild(hr)
        document.getElementById('sys_keys').appendChild(h2)
    } else {
        document.getElementById('sys_keys').style.border = '1px solid white'
    }
    if (document.getElementById('readonlykeys').childElementCount == 0) {
        document.getElementById('readonlykeys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.innerText = 'No keys exist in this section yet.'
        document.getElementById('readonlykeys').appendChild(hr)
        document.getElementById('readonlykeys').appendChild(h2)
    } else {
        document.getElementById('readonlykeys').style.border = '1px solid white'
    }
    if (document.getElementById('otherkeys').childElementCount == 0) {
        document.getElementById('otherkeys').style.border = 'none'
        const hr = document.createElement('hr')
        const h2 = document.createElement('h2')
        h2.innerText = 'No keys exist in this section yet.'
        document.getElementById('otherkeys').appendChild(hr)
        document.getElementById('otherkeys').appendChild(h2)
    } else {
        document.getElementById('otherkeys').style.border = '1px solid white'
    }
}

function CreateKeyElement(key, value, system) {
    const keybody = document.getElementById('keybodytemplate').content.cloneNode(true)
    keybody.querySelector('li').id = `roturkey-${key.replaceAll(' ', '~')}`
    keybody.querySelector('h4').textContent = key
    keybody.querySelectorAll('[data-keyname]').forEach(btn => {
        btn.dataset.keyname = key
    })
    keybody.querySelectorAll('.keymodifierbox').forEach(field => {
        field.id = `modifier-${key.replaceAll(' ', '~')}`
    })
    if (key.startsWith('sys.') || read_only_keys.includes(key)) {
        keybody.querySelector('.keysave').remove()
        keybody.querySelector('.keydelete').remove()
        keybody.querySelector('input').disabled = true
    }
    keybody.querySelector('input').value = value
    if (key == "username" || key == "system") {
        keybody.querySelector('.keydelete').remove()
    }
    if (key != "key") {
        keybody.querySelector('.keyview').remove()
    } else {
        keybody.querySelector('input[type="text"]').type = 'password'
    }
    if (key == 'bio') {
        keybody.querySelector('input').remove()
        keybody.querySelector('select').remove()
        keybody.querySelector('textarea').value = value
    } else if (key == 'system') {
        keybody.querySelector('input').remove()
        keybody.querySelector('textarea').remove()
        keybody.querySelector('select').replaceChildren(...getSystems(system))
    } else {
        keybody.querySelector('select').remove()
        keybody.querySelector('textarea').remove()
    }
    return keybody
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
        return;
    })
    if ((accdata.error && (accdata.error == 'Invalid authentication credentials') && !accdata.username) || (accdata['sys.banned'])) { // Extra check in place in case someone decides to set a key named "error" to "Invalid authentication credentials"
        flagged.push(activeacc.uuid)
        chrome.storage.local.set({flagged: flagged})
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Account)</h1>
            <p>This page is for managing account keys. For the page that manages keys associated with purchases / subscriptions, see <a href="../pages/keymanager_eco.html">Key Manager (Purchases)</a></p>
            <hr>
            <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
        `))
        return;
    }
    if ((accdata['sys.email_verified'] === false)) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Account)</h1>
            <p>This page is for managing account keys. For the page that manages keys associated with purchases / subscriptions, see <a href="../pages/keymanager_eco.html">Key Manager (Purchases)</a></p>
            <hr>
            <div id='toscontainer'>
                <h4>Your E-mail is not verified. Until you verify your E-mail address, some actions may be limited. To verify your e-mail, head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> and reauthenticate.</h4>
            </div>
        `))        
    }
    if (!accdata['sys.tos_accepted']) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Key Manager (Account)</h1>
            <p>This page is for managing account keys. For the page that manages keys associated with purchases / subscriptions, see <a href="../pages/keymanager_eco.html">Key Manager (Purchases)</a></p>
            <hr>
            <div id='toscontainer'>
                <h4>The Rotur TOS was updated since your last visit. As a result, accounts can't access or perform certain actions until they accept the TOS again. Accept the new terms?</h4>
                <button id='accepttos'>Accept Terms</button>
                ${accounts.length > 1 ? `
                <label id='tosbulkaccept'>
                    <input type='checkbox' id='bulkacceptoption'>
                    Accept TOS on all added accounts
                </label>` : ``}
                <div id='tosiframeplaceholder'></div>
                <a href='https://rotur.dev/terms-of-service' target='_blank' rel='noopener noreferrer'>Rotur Terms of Service</a>
            </div>
        `))
        return;
    }

    key_names = Object.keys(accdata)
    systemcache = await fetch(`https://api.rotur.dev/systems`).then(res => res.json())
    document.getElementById('mainkeys').replaceChildren()
    document.getElementById('readonlykeys').replaceChildren()
    document.getElementById('sys_keys').replaceChildren()
    document.getElementById('otherkeys').replaceChildren()
    for (let i=0; i<key_names.length; i++) {
        let keyname = key_names[i]
        let keyvalue = accdata[keyname]
        if (typeof(keyvalue) == 'object') {
            keyvalue = JSON.stringify(keyvalue)
        }
        const key_element = CreateKeyElement(keyname, keyvalue, accdata.system)
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
    checkBlanks()
}

renderKeys();

document.addEventListener('click', async function(e) {
    if (e.target.id == 'accepttos') {
        const target = e.target
        target.disabled = true
        await chrome.storage.session.setAccessLevel({ 
            accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' 
        });
        if (document.getElementById('bulkacceptoption')?.checked) {
            target.textContent = "Accepting... (This may take a while)"
            await chrome.storage.session.set({acceptinprogress: true})
        
            for (let i=0; i<accounts.length; i++) {
                if (flagged.includes(accounts[i].uuid)) {
                    continue;
                }
                if (document.getElementById('tosiframe')) {
                    document.getElementById('tosiframe').src = `https://rotur.dev/terms-of-service?token=${accounts[i].token}`
                } else {
                    document.getElementById('tosiframeplaceholder').replaceChildren(...parseHTML(`
                        <iframe id='tosiframe' src="https://rotur.dev/terms-of-service?token=${accounts[i].token}"></iframe>
                    `))
                }
                document.getElementById('tosiframe').style.display = 'none'
                const accept_process = new Promise((resolve) => {
                    chrome.runtime.onMessage.addListener(function listener(message) {
                        if (message.status == 'accepted') {
                            resolve(message)
                            chrome.runtime.onMessage.removeListener(listener)
                        }
                    })
                })
                await accept_process
            }
            chrome.storage.session.remove('acceptinprogress')
            document.getElementById('tosiframeplaceholder').replaceChildren()
            openSuccessPopup(`TOS successfully accepted on all accounts! The page will reload shortly.`)
            tosrecentlyaccepted = true
            target.remove()
            document.getElementById('tosbulkaccept')?.remove()
            setTimeout(function() {
                this.location.reload()
            }, 5000)
        } else {
            target.textContent = "Accepting..."
            await chrome.storage.session.set({acceptinprogress: true})
            document.getElementById('tosiframeplaceholder').replaceChildren(...parseHTML(`
                <iframe id='tosiframe' src="https://rotur.dev/terms-of-service?token=${activeacc.token}"></iframe>
            `))
            document.getElementById('tosiframe').style.display = 'none'
            chrome.runtime.onMessage.addListener(function listener(message) {
                if (message.status == 'accepted') {
                    chrome.storage.session.remove('acceptinprogress')
                    document.getElementById('tosiframeplaceholder').replaceChildren()
                    openSuccessPopup(`TOS successfully accepted! The page will reload shortly.`)
                    tosrecentlyaccepted = true
                    target.remove()
                    document.getElementById('tosbulkaccept')?.remove()
                    setTimeout(function() {
                        this.location.reload()
                    }, 5000)
                    chrome.runtime.onMessage.removeListener(listener)
                }
            })
        }
        return;
    }
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
        const keyvalue = (() => {
            const val = document.getElementById('createkeyvalue').value
            try {
                return (main_keys.includes(keyname) && !exempt_main_keys.includes(keyname)) ? val : JSON.parse(val)
            } catch {
                return val
            }
        })();
        if (keyname == '') {
            error_element.replaceChildren(MiniError('failure', `You can't create a key with a blank name.`))
        } else if (key_names.includes(keyname)) {
            error_element.replaceChildren(MiniError('failure', `This key already exists. Try modifying it instead if you can.`))
        } else if (read_only_keys.includes(keyname.toLowerCase())) {
            error_element.replaceChildren(MiniError('failure', `This is a reserved key.`))
        } else if (keyname.toLowerCase().startsWith('sys.')) {
            error_element.replaceChildren(MiniError('failure', `Key name can't begin with "sys."`))
        } else if (keyname.toLowerCase() == "banner" || keyname.toLowerCase() == "banners") {
            error_element.replaceChildren(MiniError('failure', `Setting this key would normally cost you 10 credits. Try changing your banner through the account manager's profile editor instead.`))
        } else if (keyname.toLowerCase() == "password") {
            error_element.replaceChildren(MiniError('failure', `To prevent issues with future logins, try changing your password through the profile editor instead.`))
        } else {
            const keycreate = await fetch(`https://api.rotur.dev/users`,
                {method: 'PATCH', body: JSON.stringify({auth: activeacc.token, key: keyname, value: keyvalue})}).then(res => res.json())
            if (keycreate.error) {
                error_element.replaceChildren(MiniError('failure', keycreate.error))
                return;
            } else {
                document.getElementById('createkeyname').value = ''
                document.getElementById('createkeyvalue').value = ''
                error_element.replaceChildren(MiniError('success', `Key ${keyname} with value ${String((typeof keyvalue == "object") ? JSON.stringify(keyvalue) : keyvalue)} was created successfully!`))
                document.getElementById('otherkeys').appendChild(CreateKeyElement(keyname, keyvalue, "Rotur Assistant"))
                return;
            }
        }
        setTimeout(function() { error_element.replaceChildren() }, 10000)
        return;
    }

    if (["keynamecopy", "keyvaluecopy", "keysave", "keydelete", "finaldelete", "finalsystemconfirm"].includes(e.target.className)) {
        const keyname = e.target.dataset.keyname
        const keyvalue = (() => {
            const val = document.getElementById(`modifier-${keyname.replaceAll(' ', '~')}`).value
            if ((keyname == 'system') && (val == 'PassNet') && (e.target.className == 'finalsystemconfirm')) {
                return 'passNet'
            }
            else {
                try {
                    return (main_keys.includes(keyname) && !exempt_main_keys.includes(keyname)) ? val : JSON.parse(val)
                } catch {
                    return val
                }
            }
        })();
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
                error_element.replaceChildren(MiniError('success', `Copied key name to clipboard!`))
            } catch (err) {
                console.error('Failed to copy: ', err);
                error_element.replaceChildren(MiniError('failure', `Failed to copy key name`))
            }
            setTimeout(function() { error_element.replaceChildren() }, 10000)
            return;
        }
        if (e.target.className == 'keyvaluecopy') {
            try {
                await navigator.clipboard.writeText((typeof keyvalue == "object") ? JSON.stringify(keyvalue, null, '\t') : keyvalue);
                error_element.replaceChildren(MiniError('success', `Copied key value to clipboard!`))
            } catch (err) {
                console.error('Failed to copy: ', err);
                error_element.replaceChildren(MiniError('failure', `Failed to copy key value`))
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
                error_element.replaceChildren(MiniError('failure', `Setting this key would normally cost you 10 credits. Try changing your banner through the account manager's profile editor instead.`))
            } else if (keyname == 'password') {
                error_element.replaceChildren(MiniError('failure', `o prevent issues with future logins, try changing your password through the profile editor instead.`))
            } else {
                const keyupdate = await fetch(`https://api.rotur.dev/users`,
                    {method: 'PATCH', body: JSON.stringify({auth: activeacc.token, key: keyname, value: keyvalue})}).then(res => res.json())
                if (keyupdate.error) {
                    error_element.replaceChildren(MiniError('failure', keyupdate.error))
                } else {
                    error_element.replaceChildren(MiniError('success', `Key ${keyname} updated successfully!`))
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
            closePopup()
            const keydelete = await fetch(`https://api.rotur.dev/me/delete?auth=${activeacc.token}`,
                {method: 'DELETE', body: JSON.stringify({auth: activeacc.token, key: deleted_key})})
            if (keydelete.error) {
                error_element.replaceChildren(MiniError('failure', keydelete.error))
            } else {
                error_element.replaceChildren(MiniError('success', `Key ${deleted_key} deleted successfully!`))
                document.getElementById(`roturkey-${deleted_key.replaceAll(' ', '~')}`).remove()
                checkBlanks()
            }
            setTimeout(function() { error_element.replaceChildren() }, 10000)
            return;
        }
    }
})