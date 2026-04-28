document.getElementById('header-placeholder').innerHTML = `
    <div class="header" style='position: relative;'>
        <a href="/index.html" class="headerbtns">Home</a>
        <button class="headerbtns" data-headermenu='utilityflyout'>Utility</button>
        <button class="headerbtns" data-headermenu='socialflyout'>Social</button>
        <button class="headerbtns" data-headermenu='otherflyout'>Other</button>
        <div id=accountandarrow>
            <div id=accountarea class=headerbtns>
                <h1>Accounts</h1>
            </div>
            <button id='accpanelflyout' class="headerbtns" data-headermenu='accountflyout'>▼</button>
        </div>
        <div id='utilityflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='wallet'>Wallet</li>
                <li data-ref='lookup'>Lookup</li>
                <li data-ref='keymanager_acc'>Key Manager (Acc)</li>
                <li data-ref='keymanager_eco'>Key Manager (Eco)</li>
                <li data-ref='items'>Item Manager</li>
                <li data-ref='gifts'>Gift Manager</li>
            </ul>
        </div>
        <div id='socialflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='claw'>Claw</li>
                <li data-ref='rmail'>Rmail</li>
            </ul>
        </div>
        <div id='otherflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='wiki'>Wiki</li>
                <li data-ref='donate'>Donate</li>
            </ul>
        </div>
        <div id='accountflyout' class='headerflyout' style="display: none;">
            <ul id='accountflyoutlist'>
            <li>Getting accounts...</li>
            </ul>
        </div>
    </div>
    `;

async function checkSignin() {
    const activeacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
        ) ?? [];
        const p = document.createElement('p')
        p.id = "headeractiveacc"
        p.textContent = activeacc.name ? `Active: ${activeacc.name}` : 'Not signed in'
        document.getElementById('accountarea').appendChild(p)
}

async function appendaccounts() {
    const list = document.getElementById('accountflyoutlist')
    const accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
    console.log(accounts)
    list.replaceChildren()

    if (accounts.length == 0) {
        const li = document.createElement('li')
        li.dataset.ref = '/pages/accounts.html'
        li.textContent = 'Not signed in'
        list.appendChild(li)
    } else {
        accounts.forEach(acc => {
            const li = document.createElement('li')
            li.dataset.accref = acc.name
            li.textContent = acc.name
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
        this.location.reload()
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

document.getElementById('accountarea').addEventListener("click", function() {
    window.location.href = '/pages/accounts.html'
});