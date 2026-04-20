document.getElementById('header-placeholder').innerHTML = `
    <div class="header">
        <a href="/index.html" class="headerbtns">Home</a>
        <a href="/pages/wallet.html" class="headerbtns">Wallet</a>
        <a href="/pages/lookup.html" class="headerbtns">Lookup</a>
        <a href="/pages/wiki.html" class="headerbtns">Wiki</a>

        <div id=accountarea class=headerbtns>
            <h1>Accounts</h1>
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

checkSignin();

document.getElementById('accountarea').addEventListener("click", function() {
    window.location.href = '/pages/accounts.html'
});