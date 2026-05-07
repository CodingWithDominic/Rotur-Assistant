// Themes are handled here since unlike index.js, header.js is called everywhere

const themedata = {
    oceanblue: ["#0F0052", "#004DB1", "#00002B", "#0012B4", "#4F46E5", "#4338CA", "#03009C"],
    forestgreen: ["#0A3100", "#00b83d", "#271e00", "#058a00", "#7c5500", "rgb(187, 106, 0)", "#006b17"],
    orange: ["#6d4100", "#7c280f", "#cf3000", "#741b00", "#FF4C4B", "#df2727", "#df795a"],
    blurple: ["#200044", "#35008b", "#28004e", "#4500b4", "#4918cf", "#4a00d4", "#2f009c"],
    discord: ["#323339", "#7D7E87", "#323339", "#2C2D32", "#5865F2", "#4452BB", "#393A41"],
    midnight: ["#000000", "#4d4d4d", "#242425", "#2e2e2e", "#5a5a5a", "#494949", "#3b3b3b"],
    blackout: ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"]
}
const themevarnames = ["--bg-color", "--scrollbar-bar", "--scrollbar-bg", "--headerandfooter", "--button", "--buttonhover", "--popupbg"]

document.getElementById('header-placeholder').innerHTML = `
    <div class="header" style='position: relative;'>
        <a href="/index.html" class="headerbtns">Home</a>
        <button class="headerbtns" data-headermenu='utilityflyout'>Utility</button>
        <button class="headerbtns" data-headermenu='socialflyout'>Social</button>
        <button class="headerbtns" data-headermenu='otherflyout'>Other</button>
        <div id=accountarea class=headerbtns title="Right-click to quickly switch accounts">
            <h1>Accounts</h1>
        </div>
        <div id='utilityflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='wallet'>Wallet</li>
                <li data-ref='keymanager_acc'>Key Manager (Acc)</li>
                <li data-ref='keymanager_eco'>Key Manager (Eco)</li>
                <li data-ref='items'>Item Manager</li>
                <li data-ref='gifts'>Gift Manager</li>
            </ul>
        </div>
        <div id='socialflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='lookup'>Lookup</li>
                <li data-ref='claw'>Claw</li>
                <li data-ref='rmail'>Rmail</li>
            </ul>
        </div>
        <div id='otherflyout' class='headerflyout' style="display: none;">
            <ul>
                <li data-ref='wiki'>Wiki</li>
                <li data-ref='themes'>Themes</li>
                <li data-ref='services'>Rotur Services</li>
                <li data-ref='about'>About</li>
                <li data-ref='credits'>Credits</li>
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
        if (activeacc.name?.length > 14) {
            p.title = activeacc.name // In case the username is too long to show properly
        }
        document.getElementById('accountarea').appendChild(p)
}

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

document.getElementById('accountarea').addEventListener("click", function(e) {
    window.location.href = '/pages/accounts.html'
});

document.getElementById('accountarea').addEventListener("contextmenu", (event) => {
    event.preventDefault()
    openflyout('accountflyout')
});

async function updateTheme() {
    const theme = await new Promise(resolve =>
    chrome.storage.local.get('theme', data => resolve(data.theme || "oceanblue"))
    ) ?? "oceanblue";
    const newtheme = themedata[theme]
    const cssvars = document.documentElement.style
    for (let i=0; i<themevarnames.length; i++) {
        cssvars.setProperty(themevarnames[i], newtheme[i])
    }
}

updateTheme()