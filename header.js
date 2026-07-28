document.getElementById('header-placeholder').innerHTML = `
    <nav class="header" style='position: relative;'>
        <div id="raheaderlogo">
            <a href="/index.html" id="raheaderlogoimg">
                <h2 id="ra_headertitle"><img src='/images/icon32.png' alt="Rotur Assistant Logo"> Rotur Assistant <img src='/images/icon32.png' alt="Rotur Assistant Logo"></h2>
            </a>
        </div>
        <div id="headerbuttonrow">
            <a href="/index.html" class="headerbtns">Home</a>
            <button class="headerbtns" data-headermenu='utilityflyout'>Utility</button>
            <button class="headerbtns" data-headermenu='socialflyout'>Social</button>
            <button class="headerbtns" data-headermenu='otherflyout'>Other</button>
            <div id=accountarea class=headerbtns title="Right-click to quickly switch accounts">
                <h1>Accounts</h1>
            </div>
        </div>
        <div id='utilityflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='wallet'>Wallet</li>
                <li data-ref='keymanager_acc'>Key Manager (Acc)</li>
                <li data-ref='keymanager_eco'>Key Manager (Eco)</li>
                <li data-ref='items'>Item Manager</li>
                <li data-ref='gifts'>Gift Manager</li>
                <li data-ref='icn'>ICN Editor</li>
            </ul>
        </div>
        <div id='socialflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='lookup'>Lookup</li>
                <li data-ref='claw'>Claw</li>
                <li data-ref='rmail'>Rmail</li>
                <li data-ref='cosmetics'>Cosmetics</li>
                <li data-ref='notifications'>Notifications</li>
                <li data-ref='rpc'>Rotur RPC</li>
            </ul>
        </div>
        <div id='otherflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='settings'>Settings</li>
                <li data-ref='wiki'>Wiki</li>
                <li data-ref='services'>Rotur Services</li>
                <li data-ref='about'>About</li>
                <li data-ref='patch_notes'>Patch Notes</li>
                <li data-ref='disclaimer'>Privacy Disclaimer</li>
                <li data-ref='credits'>Credits</li>
                <li data-ref='donate'>Donate</li>
            </ul>
        </div>
        <div id='accountflyout' class='headerflyout' style="display: none;">
            <ul id='accountflyoutlist'>
            <li>Getting accounts...</li>
            </ul>
        </div>
    </nav>`; // It's easier if I do this since if I need to modify the header, I can just modify this rather than having to modify it in every single HTML file.
    
if (document.body.clientWidth > 950) {
    document.getElementById('raheaderlogo').style.display = 'block'
    document.getElementById('headerbuttonrow').style.maxWidth = '800px'
} else {
    document.getElementById('raheaderlogo').style.display = 'none'
    document.getElementById('headerbuttonrow').style.maxWidth = '9999px'
}
window.addEventListener('resize', () => {
    if (document.body.clientWidth > 950) {
        document.getElementById('raheaderlogo').style.display = 'block'
        document.getElementById('headerbuttonrow').style.maxWidth = '800px'
    } else {
        document.getElementById('raheaderlogo').style.display = 'none'
        document.getElementById('headerbuttonrow').style.maxWidth = '9999px'
    }
});
async function checkSignin() {
    const activeacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};
        const p = document.createElement('p')
        p.id = "headeractiveacc"
        p.textContent = activeacc.name ? `Active: ${activeacc.name}` : 'Not signed in'
        if (activeacc.name?.length > 14) {
            p.title = activeacc.name // In case the username is too long to show properly
        }
        document.getElementById('accountarea').appendChild(p)
}

async function checkanchor() {
    const settings = await new Promise(resolve =>
    chrome.storage.local.get('settings', data => resolve(data.settings || "00000000"))
    ) ?? "00000000";
    if (settings[2] == '1' && !location.href.includes('/auth.html')) {
        document.getElementsByClassName('container')[0].style = ('margin-top: 40px;' + (settings[3] == '1' ? ' padding-bottom: 105px;' : ''))
        document.getElementById('header-placeholder').style = 'position: fixed; z-index: 4500'
    }
    if (settings[3] == '1' && !location.href.includes('/auth.html')) {
        document.getElementsByClassName('container')[0].style = ('padding-bottom: 105px;' + (settings[2] == '1' ? ' margin-top: 40px;' : ''))
        document.getElementById('footer-placeholder').style = 'position: fixed; bottom: 0; z-index: 4400;'
    }
}

checkanchor()

async function appendaccounts() {
    const list = document.getElementById('accountflyoutlist')
    const accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
    list.replaceChildren()

    if (accounts.length == 0) {
        const li = document.createElement('li')
        li.dataset.ref = 'accounts'
        li.textContent = 'Not signed in'
        list.appendChild(li)
    } else {
        accounts.forEach(acc => {
            const li = document.createElement('li')
            li.dataset.accref = acc.name
            li.textContent = acc.name
            if (acc.name.length > 16) {
                li.title = acc.name // In case the username is too long to show properly
            }
            list.appendChild(li)
        })
    }
}

function openflyout(menu) {
    const menuitems = document.getElementsByClassName('headerflyout')
    Array.from(menuitems).forEach(menuitem => {
        menuitem.style.display = 'none'
    })
    if (document.getElementById(menu)) {
        document.getElementById(menu).style.display = 'flex'
    }
    if (menu == 'accountflyout') {
        appendaccounts()
    }
}

checkSignin();

document.addEventListener('click', async function(e) {
    if (e.target.dataset.ref) {
        this.location.href = `/pages/${e.target.dataset.ref}.html`
    }
    if (e.target.dataset.accref) {
        const accounts = await new Promise(resolve =>
            chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
            ) ?? [];
        chrome.storage.local.set({activeacc: accounts[accounts.findIndex(acc => acc.name == e.target.dataset.accref)]})
        if (this.location.href.includes(`/pages/account.html`)) {
            this.location.href = `/pages/account.html?user=${e.target.dataset.accref}`
        } else {
            this.location.reload()
        }
    }
    if (e.target.className == 'headerbtns') {
        if (document.getElementById(e.target.dataset.headermenu)?.style.display != 'none') {
            openflyout(null)
        } else {
            openflyout(e.target.dataset.headermenu)
        }
    } else if (e.target.className != "headerflyout") {
        openflyout(null)
    }
})

document.getElementById('accountarea').addEventListener("click", function(e) {
    window.location.href = '/pages/accounts.html'
});

document.getElementById('accountarea').addEventListener("contextmenu", (event) => {
    event.preventDefault()
    openflyout('accountflyout')
});

async function updatePFPs() {
    const settings = await new Promise(resolve =>
            chrome.storage.local.get('settings', data => resolve(data.settings?.padEnd(16, "0") || "0000000000000000"))
        ) ?? "0000000000000000";
    if (settings[5] == '1') {
        document.body.classList.toggle('make-circular');
    }
    if (settings[7] == '1') {
        document.body.classList.toggle('remove-borders');
    }
}

updatePFPs()