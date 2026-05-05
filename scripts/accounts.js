import { parseHTML, reloadHeader } from "../index.js";

const whitelisted_urls = ['https://apps.rotur.dev', 'https://origin.mistium.com', 'https://originchats.mistium.com/app', 'https://rotur.dev/me',
                            'https://warptheme.mistium.com', 'https://notes.rotur.dev', 'https://devfund.rotur.dev', 'https://photos.rotur.dev',
                            'https://warpdrive.team', "https://rotur.dev/key-manager", "https://rotur.dev/inventory-manager", "https://graphite.flufi.uk",
                            "https://runnova.github.io/orion", "https://adthoughtsglobal.github.io/Orla", "https://antiviiris.github.io/originChats"]

const parser = new DOMParser();

// Popup code

function openAuthErrorPopup(uuid) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Issue Detected</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">An authentication issue has been detected with this account. This account may have either been banned, deleted, or simply had its token reset. Try logging in with this account again or use a different account.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Dismiss</button>
            <button id="reauth">Reauth</button>
            <button class="removeacc" data-id='${uuid}'>Remove</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function genURLs() {
    let urls_list = ``
    whitelisted_urls.forEach(url => {
        urls_list += `<li><a href='${url}' target="_blank" rel="noopener noreferrer">${url}</a></li>`
    })
    return urls_list;
} // Make my life easier

async function checkSwitcherEligibility() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const responsedata = tab.url

    const allowed_urls = whitelisted_urls.some(item => responsedata.includes(item))
    let errormsg = "If this extension is open while you're on a supported Rotur-affiliated site, then this will automatically log you into the selected Rotur account on that site."
    if (!allowed_urls) {
        document.getElementById('switchaccbtn').disabled = true
        if (responsedata.includes('rotur') || responsedata.includes('origin') || responsedata.includes('mistium')) {
            errormsg += `<br>While you are (likely) on a rotur-affiliated site, this feature may not be supported for that particular service yet.`
        } else {
            errormsg += `<br>You are not on a rotur-affiliated website. If you own a rotur-affiliated site and you want me to support your site, let me know on discord @dominic_the_gamer.`
        }
    }
        const errorhtml = parser.parseFromString(`
        <p class='switchertext'>${errormsg}</p>
        <p class='switchertext'>As of now, the following supported sites are:</p>
        <ul>
            ${genURLs()}
        </ul>`, 'text/html'); // Can't add support for gate.rotur.dev since it's auth loops infinitely. Maybe in the future
        const errorhtml2 = errorhtml.body.children
        document.getElementById('disabledcontext').replaceChildren(...errorhtml2)
}

async function buildlist() {
    const accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
    ) ?? [];

    const activeacc = await new Promise(resolve =>
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
    ) ?? [];

    const flagged_accs = await new Promise(resolve =>
        chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
    ) ?? [];

    let activeindex = accounts.findIndex(acc => acc.name === activeacc.name);
    if (activeindex == -1) {
        activeindex = 0
    }

    let acc_html = ``

    if (accounts.length == 0) {
        acc_html += `
        <h2 id='noaccsyet'>No saved accounts yet!</h2>
        <a href="/pages/auth.html" class="addaccbtn">+ Add account</a>
        `
        document.getElementById('switchaccbtn').disabled = true
    } else {
        acc_html += `<form>`

        for (let i=0; i < accounts.length; i++) {
            let name = accounts[i].name
            acc_html += `
            <label class='acclistentry'>
                <input type="radio" name="account" value="${i}" ${i == activeindex ? 'checked' : ''} />
                <img src="${'https://avatars.rotur.dev/' + name}" alt="${name}" class="acclistimage" />
                <span ${name.length > 18 ? 'style="font-size: 12px;"' : ''}'>${name}</span>
                <div class='accountpanel'>
                    <button class='viewprofile' title='View Profile' data-name='${name}'><img src='../images/misc_icons/usericon.png' width=24 height=24></button>
                    ${flagged_accs.includes(accounts[i].uuid) ? `<button class='accwarning' title='Issue Detected' data-name='${name}' data-id='${accounts[i].uuid}'><img src='../images/misc_icons/auth_warning.png' width=24 height=24></button>` : `<button class='editprofile' title='Edit Profile' data-name='${name}'><img src='../images/misc_icons/edit.png' width=24 height=24></button>`}
                    <button class='removeacc' title='Remove Account' data-name='${name}' data-id='${accounts[i].uuid}'>✕</button>
                </div>
            </label>`
        }
        acc_html += `
        </form>
        <a href="/pages/auth.html" class="addaccbtn">+ Add account</a>
        `
        document.getElementById('switchaccbtn').disabled = flagged_accs.includes(activeacc.uuid)
    }

    document.getElementById('account_list').replaceChildren(...parseHTML(acc_html))
    await checkSwitcherEligibility()
    if (accounts.length == 0) {
        document.getElementById('disabledcontext').replaceChildren(...parseHTML('<p>You need at least one account added in order to use this feature.</p>'))
    }
}

buildlist()

async function switchAccount(idx) {
    let accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
    ) ?? [];

    const flagged_accs = await new Promise(resolve =>
        chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
    ) ?? [];

    let activeacc = {}
    if (accounts.length != 0) {
        activeacc = accounts[idx]
    }

    chrome.storage.local.set({activeacc: activeacc})
    if (flagged_accs.includes(activeacc.uuid)) {
        document.getElementById('switchaccbtn').disabled = true
    } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const responsedata = tab.url
        if (whitelisted_urls.some(item => responsedata.includes(item))) {
            document.getElementById('switchaccbtn').disabled = false
        }
    }
    reloadHeader()
}

document.addEventListener('change', async function(e) {
    if (e.target.name === 'account') {
        switchAccount(parseInt(e.target.value))
    }
    });

document.addEventListener('click', async function(e) {
    if (e.target.className == 'closebtn') {
        closePopup()
        return;
    }
    if (e.target.className == "viewprofile") {
        e.preventDefault();
        this.location.href = `../pages/lookup.html?user=${e.target.dataset.name}`
        return;
    }
    if (e.target.className == "editprofile") {
        e.preventDefault();
        this.location.href = `../pages/account.html?user=${e.target.dataset.name}`
        return;
    }
    if (e.target.id == 'reauth') {
        this.location.href = "auth.html"
        return;
    }
    if (e.target.className == "removeacc") {
        e.preventDefault();
        closePopup()

        const IDToRemove = e.target.dataset.id;

        let accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        );
        let activeacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};

        accounts = accounts.filter(acc => acc.uuid !== IDToRemove);

        await new Promise(resolve =>
        chrome.storage.local.set({userdata: accounts}, resolve)
        );

        if (activeacc.uuid == IDToRemove) {
            await switchAccount(0)
            let accountbuttons = document.getElementsByName('account')
            if (accounts.length > 0) {
                accountbuttons[0].checked = true
            }
        }
        buildlist();
        return;
    }
    if (e.target.className == 'accwarning') {
        e.preventDefault();
        openAuthErrorPopup(e.target.dataset.id)
    }
    if (e.target.id == 'switchaccbtn') {
        let activeacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
        ) ?? [];
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0].url.includes('https://warptheme.mistium.com/')) {
                chrome.cookies.remove({url: 'https://warptheme.mistium.com', name: 'auth_token'}) // WarpTheme gets VIP treatment since I had to modify manifest.json to allow permissions to modify cookies
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: "switchacc", data: activeacc.token, datauser: activeacc.name });
        });
        return;
    }
    if (e.target.id == 'switchaccinfo') {
        if (e.target.innerText == '?') {
            e.target.innerText = '✕'
            document.getElementById('disabledcontext').style.display = 'block'
        } else {
            e.target.innerText = '?'
            document.getElementById('disabledcontext').style.display = 'none'
        }
        return;
    }
    if (e.target.id == "uploadsync") {
        const syncstatus = document.getElementById('syncstatusplaceholder')
        const syncacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};
        const syncdata = await new Promise(resolve =>
            chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
        if (syncdata.length == 0) {
            syncstatus.replaceChildren(...parseHTML(`<p class='failure'>You need at least one account added in order to sync.</p>`))
        } else if (syncdata.length < 21) {
            chrome.storage.sync.set({userdata: syncdata})
            chrome.storage.sync.set({activeacc: syncacc})
            syncstatus.replaceChildren(...parseHTML(`<p class='success'>Synced successfully!</p>`))
            buildlist()
            reloadHeader()
        } else {
            syncstatus.replaceChildren(...parseHTML(`<p class='failure'>Due to google limitations, you can only sync if you have 20 or less accounts added.</p>`))
        }
        setTimeout(() => {
            syncstatus.replaceChildren()
        }, 10000);
        return;
    }
    if (e.target.id == "downloadsync") {
        const syncstatus = document.getElementById('syncstatusplaceholder')
        const syncacc = await new Promise(resolve =>
            chrome.storage.sync.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};
        const syncdata = await new Promise(resolve =>
            chrome.storage.sync.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
        if (syncdata.length == 0) {
            syncstatus.replaceChildren(...parseHTML(`<p class='failure'>There is nothing stored in sync.</p>`))
        } else {
            chrome.storage.local.set({userdata: syncdata})
            chrome.storage.local.set({activeacc: syncacc})
            syncstatus.replaceChildren(...parseHTML(`<p class='success'>Successfuly retrieved data from sync!</p>`))
            buildlist()
            reloadHeader()
        }
        setTimeout(() => {
            syncstatus.replaceChildren()
        }, 10000);
        return;
    }
    if (e.target.id == "clearsync") {
        const syncstatus = document.getElementById('syncstatusplaceholder')
        chrome.storage.sync.clear()
        syncstatus.replaceChildren(...parseHTML(`<p class='success'>Sync cleared out successfully!</p>`))
        setTimeout(() => {
            syncstatus.replaceChildren()
        }, 10000);
        return;
    }
});