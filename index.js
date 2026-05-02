const parser = new DOMParser();

// Functions used in multiple places

export function sanitize(input) {
    return input.replace('&', '&amp;').replace('/','&sol;').replace('<', '&lt;').replace('>', '&gt;').replace('(', '&lpar;').replace(')', '&rpar;') // Prevents HTML formatting from showing up in unwanted places and also decreases the chance of XSS
}

export function formatDate(input) {
    let date = new Date(input)
    date = date.toString().split(' ')
    let finaldate = date[0] + ', ' + date[1] + ' ' + date[2] + ', ' + date[3] + ' at ' + date[4]
    return finaldate;
}

export function parseHTML(string) {
    const prototype = parser.parseFromString(string, 'text/html')
    const final = prototype.body.children
    return final;
} // To satisfy Mozilla's security requirements (it didn't like variables inside innerHTML arguments)

export async function reloadHeader() {
    document.getElementById('header-placeholder').replaceChildren(...parseHTML(`
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
            <li>Test</li>
            </ul>
        </div>
    </div>
    `))

    const activeacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
        ) ?? [];
        const p = document.createElement('p')
        p.textContent = activeacc.name ? `Active: ${activeacc.name}` : 'Not signed in'
        document.getElementById('accountarea').appendChild(p)
}

document.addEventListener('click', function(e) {
    if (e.target.className == 'appgridbtn') {
        window.location.href = `/pages/${e.target.id}.html`
    }
})

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'Enter'];
let cursor = 0;

document.addEventListener('keydown', (e) => {

    if (e.key === konamiCode[cursor]) {
        cursor++;

        if (cursor === konamiCode.length) {
            window.location.href = "pages/vip_lounge.html"
            cursor = 0;
        }
    } else {
        cursor = 0;
    }
});