const parser = new DOMParser();

// Functions used in multiple places

export function sanitize(input) {
    return input.replace('&', '&amp;').replace('/','&sol;').replace('<', '&lt;').replace('>', '&gt;').replace('(', '&lpar;').replace(')', '&rpar;').replace() // Prevents HTML formatting from showing up in unwanted places and also decreases the chance of XSS
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
    <div class="header">
        <a href="/index.html" class="headerbtns">Home</a>
        <a href="/pages/wallet.html" class="headerbtns">Wallet</a>
        <a href="/pages/lookup.html" class="headerbtns">Lookup</a>
        <a href="/pages/wiki.html" class="headerbtns">Wiki</a>

        <div id=accountarea class=headerbtns onclick="/pages/claw.html">
            <h1>Accounts</h1>
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