let transactionsopen = false
let statsopen = false
let transaction_cache = ''
let stats_cache1 = ''
let stats_cache2 = ''
let reloadinprogress = false;
let wait_time = 0;
let tosrecentlyaccepted = false

const accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
) ?? [];

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

let dailycreditsettings = await new Promise(resolve =>
    chrome.storage.local.get('dailycreditsettings', data => resolve(data.dailycreditsettings || []))
) ?? [];

if (dailycreditsettings.includes(activeacc.uuid)) {
    document.getElementById('dailycreditnotif').checked = true
}

let sum_cache = await new Promise(resolve =>
    chrome.storage.session.get('sum_cache', data => resolve(data.sum_cache || [0, 0]))
) ?? [0, 0];
let bal_cache = 0;
let suminprogress = false

import { sanitize, formatDate, parseHTML, openSuccessPopup } from "../index.js"

// Popup functions

function openPopup(senderdata, recipientdata, amt, note) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Transfer</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <h2>Transferring ${amt} credit${amt != 1 ? 's' : ''} to: ${recipientdata.username}</h2>
        <p>Your Balance: ${senderdata.currency} -> ${String(senderdata.currency - amt).length > 10 ? (senderdata.currency - amt).toFixed(2) : (senderdata.currency - amt)}</p>
        <p>${recipientdata.username}'s Balance: ${recipientdata.username == 'rotur' ? '1 -> 1' : `${recipientdata.currency} -> ${String(recipientdata.currency + amt).length > 10 ? (recipientdata.currency + amt).toFixed(2) : recipientdata.currency + amt}`}</p>
        ${(note != "" ? `<p class='transactionnote'>With note: ${sanitize(note.substring(0, 50))}</p>` : "")}
        ${recipientdata.username == 'rotur' ? `<p class='specialtransfercase'>Note: The "rotur" Rotur account has a special property where its balance remains at 1 no matter what transaction it does. This means that any credits sent to it are effectively voided.` : ``}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finaltransfer">Confirm & Send</button>
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

// Other functions

function scheduleAlarmFromPopup(id, label, triggerAt) {
    chrome.runtime.sendMessage({ type: "SCHEDULE_ALARM", id: id, label: label, triggerAt: triggerAt });
}

async function getWaitTime() {
    const waitdata = await fetch(`https://api.rotur.dev/claim_time?auth=${activeacc.token}`).then(res => res.json())
    if ((waitdata.wait_time ?? 0) > 0) {
        wait_time = waitdata.wait_time
        if (!document.getElementById('claimcountdown')) {
            const div = document.createElement('div')
            div.id = 'claimcountdown'
            document.getElementById('dailyclaim').insertAdjacentElement('afterend', div)
        }
        document.getElementById('claimcountdown').replaceChildren(...parseHTML(`<p id='claimcountdowntext'>Daily Credit will be ready in: ${calculateTime(wait_time)}</p>`))
        document.getElementById('dailyclaim').disabled = true
        let dailycountdown = setInterval(function() {
            document.getElementById('claimcountdowntext').textContent = "Daily Credit will be ready in: " + calculateTime(wait_time)
            wait_time -= 1
            if (wait_time < 0) {
                document.getElementById('dailyclaim').disabled = false
                document.getElementById('claimcountdown').remove()
                clearInterval(dailycountdown)
            }
        }, 1000)
    } else {
        document.getElementById('claimcountdown').remove()
    }
}

async function getTransactionHistory(accdata) {
    transaction_cache = accdata
    const type_translator = {
                            in: "Received credits",
                            out: "Sent credits",
                            tax: "System Tax",
                            gift_claim: "You claimed a gift",
                            gift_claimed: "Your gift was claimed",
                            gift_create: "You created a gift",
                            key_sale: "Key sale",
                            key_buy: "You bought a Key",
                            escrow_in: "Devfund Completed",
                            escrow_out: "Devfund Contribution",
                            cosmetic_sale: "Someone bought your cosmetic",
                            cosmetic_purchase: "You bought a cosmetic",
                            cosmetic_platform: "Cosmetic sale on your platform"
                            }
    const transactiondata = accdata['sys.transactions'] ?? []
    let transactionhtml = ``
    let profit = 0
    if (transactiondata.length > 0) {
        profit = transactiondata[0].new_total - transactiondata[transactiondata.length - 1].new_total
    } else {
        profit = 0;
    }

    for (let i=0; i<transactiondata.length; i++) {
        let transaction_snippet = transactiondata[i]
        let finaldate = formatDate(transaction_snippet.time)
        let newtotal = transaction_snippet.new_total ?? 0
        let user_avatar = (transaction_snippet.user.length > 23 && transaction_snippet.user.includes('-')) ? `Spectator` : transaction_snippet.user
        let user_name = (transaction_snippet.user.length > 23 && transaction_snippet.user.includes('-')) ? `Unknown User` : transaction_snippet.user
        let type = type_translator[transaction_snippet.type] ?? `Misc. Transaction (${transaction_snippet.type})`
        transactionhtml += `
        <li>
            <div class='transactionentry'>
                <a href='../pages/lookup.html?user=${transaction_snippet.type == 'gift_create' ? accdata.username : user_avatar}'><img src='https://avatars.rotur.dev/${transaction_snippet.type == 'gift_create' ? accdata.username : user_avatar}' alt='${transaction_snippet.type == 'gift_create' ? accdata.username : user_avatar}'></a>
                <h1 ${type.length > 21 ? `style="font-size: 16px;"` : ''}>${type}</h1>
            </div>
            ${transaction_snippet.type != 'gift_create' ? `<p>User involved: <a href='../pages/lookup.html?user=${user_avatar}'>${user_name}</a></p>` : ``}
            <p>Amount involved: ${transaction_snippet.amount}</p>
            ${transaction_snippet.note && transaction_snippet.note != 'transfer' ? `<p>With Note: ${sanitize(transaction_snippet.note)}</p>` : ``}
            <p>New Total: ${String(newtotal).length > 10 ? newtotal.toFixed(2) : newtotal} ${i == (transactiondata.length - 1) ? '(Diff: 0)' : `(Diff: ${String(transaction_snippet.new_total - transactiondata[i+1].new_total).length > 10 ? (transaction_snippet.new_total - transactiondata[i+1].new_total).toFixed(2) : (transaction_snippet.new_total - transactiondata[i+1].new_total)})`}</p>
            <p>Date: ${finaldate}</p>
        </li>
        `
    }
    if (transactionhtml == '') {
        document.getElementById('transactionlist').replaceChildren(...parseHTML(`<li><h3 style='font-size: 16px;'>You don't have any transaction history yet.</h3></li>`))
        document.getElementById('transactionlist').style = 'border: none;'
        document.getElementById('averageprofit').style = 'display: none;'
        document.getElementById('transactionreload').style = 'display: none;'
    } else {
        document.getElementById('transactionlist').replaceChildren(...parseHTML(transactionhtml))
    }
    document.getElementById('averageprofit').innerText = `Recent average profit margin: ${String(profit).length > 10 ? profit.toFixed(2) : profit}`
    transactionsopen = true
    return;
}

function refreshCounters() {
    document.getElementById('balancedisplay').replaceChildren(...parseHTML(`
    <h2> Active Account Balance: ${bal_cache}</h2>
    ${accounts.length > 1 ? `<h2 id='totalsumofaccs'> Total Balance (Sum of all accounts): ${suminprogress ? `...` : sum_cache[0]}</h2>` : ``}
    `))
    chrome.storage.session.set({sum_cache: sum_cache})
}

async function getEconomicData(activeaccdata) {
    const userbalance = activeaccdata['sys.currency'] ?? activeaccdata.currency
    const stats = (stats_cache1 ? stats_cache1 : await fetch('https://api.rotur.dev/stats/economy').then(res => res.json()))
    const accdata = (stats_cache2 ? stats_cache2 : activeaccdata)

    const cents = parseFloat(stats.currency_comparison.cents.split('¢')[0])
    const pence = parseFloat(stats.currency_comparison.pence.split('p')[0])

    document.getElementById('statslist').replaceChildren(...parseHTML(`
    <h2>General Stats</h2>
    <p>Each credit is worth about $${(cents / 100).toFixed(2)} or £${(pence / 100).toFixed(2)}.</p>
    <p>The average user has around ${stats.average.toFixed(2)} credits, which means that they have around $${(stats.average * (cents / 100)).toFixed(2)} or £${(stats.average * (pence / 100)).toFixed(2)} worth of credits.</p>
    <p>There are a total of ${stats.total.toFixed(2)} credits in circulation. This means the entire rotur economy is worth a grand total of $${(stats.total * (cents / 100)).toFixed(2)} or £${(stats.total * (pence / 100)).toFixed(2)}.</p>
    <p>The recent economical variance is ${stats.variance.toFixed(2)}.</p>
    <hr class="dotted_separator">
    <h2>Your Stats</h2>
    <p>You have $${(userbalance * (cents / 100)).toFixed(2)} or £${(userbalance * (pence / 100)).toFixed(2)} worth of credits.</p>
    <p>You have ${(userbalance / stats.average).toFixed(2)} times the average balance.</p>
    <p>You have ${((userbalance * 100) / stats.total).toFixed(2)}% of all the credits in circulation.</p>
    <hr class="dotted_separator">
    <h2>Calculator</h2>
    <div id='calcinput'>
        <input type='number' id='econcalc' placeholder='Amount' step=0.01>
        <button id='econcalcbtn'>Calculate</button>
    </div>
    <div id='calcresults'></div>
    `))
    stats_cache1 = stats
    stats_cache2 = accdata
}

// Everything else

function calculateTime(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}m ${secs}s`
}

async function walletpage() {
    if (accounts.length == 0) {
        document.getElementById('wallet-container').replaceChildren(...parseHTML(`
        <h1>Your Wallet</h1>
        <h2>You are not signed in! Please head over to the account manager to add an account first.</h2>
        `))
        return;
    }
    if (accounts.length < 2) {
        document.getElementById('totalsumofaccs').style.display = 'none'
    }
    if (flagged.includes(activeacc.uuid)) {
        document.getElementById('wallet-container').replaceChildren(...parseHTML(`
            <h1>Your Wallet</h1>
            <h2>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h2>
        `))
        return;
    }
    const activeaccdata = await fetch(`https://api.rotur.dev/get_user?auth=${activeacc.token}`).then(res => res.json()).catch(err => {
        document.getElementById('wallet-container').replaceChildren(...parseHTML(`
            <h1>Your Wallet</h1>
            <h2>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h2>
        `))
        return;
    })
    if ((activeaccdata.error && (activeaccdata.error == 'Invalid authentication credentials') && !activeaccdata.username) || (activeaccdata['sys.banned'])) {
        flagged.push(activeacc.uuid)
        chrome.storage.local.set({flagged: flagged})
        document.getElementById('wallet-container').replaceChildren(...parseHTML(`
            <h1>Your Wallet</h1>
            <h2>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h2>
        `))
        return;
    }
    if (activeaccdata['sys.email_verified'] == false) {
        document.getElementById('wallet-container').replaceChildren(...parseHTML(`
            <h1>Your Wallet</h1>
            <div id='toscontainer'>
                <h4>Your E-mail is not verified. Until you verify your E-mail address, some actions may be limited. To verify your e-mail, head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> and reauthenticate.</h4>
            </div>
        `))
        return;
    }
    if (!activeaccdata['sys.tos_accepted']) {
        document.getElementById('wallet-container').replaceChildren(...parseHTML(`
            <h1>Your Wallet</h1>
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
    bal_cache = activeaccdata['sys.currency']
    document.getElementById('balancedisplay').replaceChildren(...parseHTML(`
    <h2>Active Account Balance: ${bal_cache}</h2>
    ${accounts.length > 1 ? `<h2 id='totalsumofaccs'>Total Balance (Sum of all accounts): ...</h2>` : ``}
    `))
    if (activeaccdata['sys.currency'] == undefined) {
        document.getElementById('wallet-container').replaceChildren(...parseHTML(`
        <h1>Your Wallet</h1>
        <h2>If you see this, you were probably rate-limited by the Rotur API. Please wait a bit, then try again.</h2>
        `))
        return;
    }

    async function sumBalances() {
        if (!activeaccdata['sys.tos_accepted'] || (activeaccdata['sys.email_verified'] === false)) {
            return;
        }
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        sum_cache = [0, 0]
        sum_cache[0] = 0
        suminprogress = true
        let accdata = {}
        for (let i=0; i<accounts.length; i++) {
            accdata = await fetch(`https://api.rotur.dev/get_user?auth=${accounts[i].token}`).then(res => res.json())
            if ((accdata.error && (accdata.error == "Invalid authentication credentials") && !accdata.username) || (accdata['sys.banned'])) {
                flagged.push(accounts[i].uuid)
                chrome.storage.local.set({flagged: flagged})
            }
            sum_cache[0] += accdata['sys.currency'] ?? 0
        }
        if (flagged.includes(activeacc.uuid)) {
            document.getElementById('wallet-container').replaceChildren(...parseHTML(`
                <h1>Your Wallet</h1>
                <h2>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h2>
            `))
            return;
        }
        if (String(sum_cache[0]).length > 10) {
            sum_cache[0] = sum_cache[0].toFixed(2)
        }
        if (isNaN(sum_cache[0] ?? NaN)) {
            sum_cache[0] = '???'
            document.getElementById('claimstatusplaceholder').replaceChildren(...parseHTML(`
                <p class='failure'>An error occurred while finding the total sum. This is likely due to being rate-limited by the Rotur API mid-calculation.</p>
            `))
            setTimeout(function() {
            document.getElementById('claimstatusplaceholder').replaceChildren()
            }, (10000))
        } else {
            sum_cache[1] = Date.now()
            chrome.storage.session.set({sum_cache: sum_cache})
        }
        if (accounts.length > 1) {
            document.getElementById('totalsumofaccs').innerText = `Total Balance (Sum of all accounts): ${sum_cache[0]}`
        }
        suminprogress = false;
    }
    if (accounts.length > 1) {
        if (sum_cache && (Date.now() - sum_cache[1] < 600000)) {
            document.getElementById('totalsumofaccs').innerText = `Total Balance (Sum of all accounts): ${sum_cache[0]}` // Refresh sum cache after 10 minutes after passed
        } else {
            sumBalances()
        }
    }

    const systemdata = await fetch(`https://api.rotur.dev/systems`).then(res => res.json())
    const accsystem = activeaccdata.system
    const systemowner = systemdata[accsystem].owner.name

    document.getElementById('balancedisplay').replaceChildren(...parseHTML(`
    <h2> Active Account Balance: ${activeaccdata['sys.currency']}</h2>
    ${accounts.length == 1 ? `` : `<h2 id='totalsumofaccs'> Total Balance (Sum of all accounts): ${suminprogress ? `...` : sum_cache[0] ?? `...`}</h2>`}
    `))
    if (systemowner.toLowerCase() != activeacc.name.toLowerCase()) {
        document.getElementById('claimfineprint').replaceChildren(...parseHTML(`
        <p>*By claiming the daily credit, <a href='../pages/lookup.html?user=${systemowner}'><img src='https://avatars.rotur.dev/${systemowner}' alt='${systemowner}'> ${systemowner}</a> will also get 0.25 credits since your account is under the ${accsystem} system. You can change your system in the account settings.</p>
        `))
    }
    getEconomicData(activeaccdata)
    getTransactionHistory(activeaccdata)
    getWaitTime()
}

walletpage()

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
    if (e.target.id == 'dailycreditnotif') {
        dailycreditsettings = dailycreditsettings.filter(item => item != activeacc.uuid)
        if (e.target.checked) {
            dailycreditsettings.push(activeacc.uuid)
            const alarms = await new Promise(resolve =>
                chrome.storage.local.get('alarms', data => resolve(data.alarms || []))
            ) ?? [];
            if (!alarms[activeacc.uuid] || alarms[activeacc.uuid].triggerAt < Date.now()) {
                const waitdata = await fetch(`https://api.rotur.dev/claim_time?auth=${activeacc.token}`).then(res => res.json())
                if (waitdata.wait_time > 0) {
                    scheduleAlarmFromPopup(activeacc.uuid, activeacc.name, Date.now() + (waitdata.wait_time * 1000))
                }
            }
        }
        chrome.storage.local.set({dailycreditsettings: dailycreditsettings})
    }
    if (e.target.className == 'tab') {
        Array.from(document.getElementsByClassName('tab')).forEach(tab => {
            tab.style = 'border-bottom: none;'
        })
        e.target.style = e.target.id == 'dangertab' ? 'border-bottom: 2px solid #ff776e;' : 'border-bottom: 2px solid white;'
        document.getElementById('transferwindow').style.display = (e.target.id == 'transfertab') ? 'flex' : 'none'
        document.getElementById('transactionpanel').style.display = (e.target.id == 'historytab') ? 'block' : 'none'
        document.getElementById('statspanel').style.display = (e.target.id == 'statstab') ? 'flex' : 'none'
//        document.getElementById('dangerzone').style.display = (e.target.id == 'dangertab') ? 'block' : 'none'
        return;
    }
    if (e.target.id == 'cancel' || e.target.id == 'popup-x') {
        closePopup();
        return;
    }

    if (e.target.id == 'transactionreload') {
        document.getElementById('transactionreload').textContent = '…'
        document.getElementById('transactionreload').disabled = true
        transaction_cache = await fetch(`https://api.rotur.dev/get_user?auth=${activeacc.token}`).then(res => res.json())
        getTransactionHistory(transaction_cache)
        reloadinprogress = true
        transactionsopen = false
        document.getElementById('transactionreload').textContent = '⟳'
        document.getElementById('transactionreload').disabled = false
    }

    if (e.target.id == 'statsreload') {
        document.getElementById('statsreload').textContent = '…'
        document.getElementById('statsreload').disabled = true
        stats_cache1 = await fetch('https://api.rotur.dev/stats/economy').then(res => res.json())
        stats_cache2 = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=no`).then(res => res.json())
        getEconomicData(stats_cache2)
        reloadinprogress = true
        statsopen = false
        document.getElementById('statsreload').textContent = '⟳'
        document.getElementById('statsreload').disabled = false
    }

    if (e.target.id == 'econcalcbtn') {
        const num = parseFloat(document.getElementById('econcalc').value)
        const stats = stats_cache1
        const accdata = stats_cache2
        const cents = parseFloat(stats.currency_comparison.cents.split('¢')[0])
        const pence = parseFloat(stats.currency_comparison.pence.split('p')[0])
        if (!isNaN(num)) {
            document.getElementById('calcresults').replaceChildren(...parseHTML(`
                <p>${num} RC is approximately equal to $${(num * (cents / 100)).toFixed(2)} or £${(num * (pence / 100)).toFixed(2)}.</p>
                <p>${num} RC is ${(num / stats.average).toFixed(2)} times the average balance.</p>
                <p>${num} RC is ${((num * 100) / stats.total).toFixed(2)}% of all the credits in circulation.</p>
            `))
        }
    }

    if (e.target.id == 'dailyclaim') {
        const claimbtn = e.target
        claimbtn.disabled = true
        claimbtn.textContent = 'Claiming...'
        const activeaccdata = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=no`).then(res => res.json())
        const multiplier = (activeaccdata.subscription == "Pro" || activeaccdata.subscription == "Max") ? 3 : ((activeaccdata.subscription == "Drive") ? 2 : 1)
        document.getElementById('claimstatusplaceholder').replaceChildren()
        if (activeaccdata.currency <= 1000) {
            var dailysuccess = await fetch(`https://api.rotur.dev/claim_daily?auth=${activeacc.token}`).then(res => res.json())
        } else {
            var dailysuccess = "Balance too high"
        }
        if (dailysuccess == "Balance too high") {
            document.getElementById('claimstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>While this would've otherwise been a successful claim, your balance is too high (Balance > 1000), meaning you wouldn't have received anything. Try spending some of your credits or transferring them to an alt first. To not trigger the 24 hour cooldown, this action has been automatically aborted.</p>`))
            claimbtn.disabled = false
        } else if (dailysuccess.error) {
            document.getElementById('claimstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>Daily claim failed. Please wait ${calculateTime(dailysuccess.wait_time)}.</p>`))
            claimbtn.disabled = false
        } else {
            if (activeaccdata.currency > 500) {
                document.getElementById('claimstatusplaceholder').replaceChildren(...parseHTML(`<p class='partialsuccess'>While the daily claim was successful, you only received half the credits as normal, since your balance is greater than 500.</p>`))
                bal_cache += 0.5 * multiplier
                sum_cache[0] += 0.5 * multiplier
            } else {
                document.getElementById('claimstatusplaceholder').replaceChildren(...parseHTML(`<p class='success'>Daily claim successful!</p>`))
                bal_cache += multiplier
                sum_cache[0] += multiplier
            }
            scheduleAlarmFromPopup(activeacc.uuid, activeacc.name, Date.now() + 86400000)
            refreshCounters()
            getWaitTime()
        }
        claimbtn.textContent = 'Claim Daily Credit'

        setTimeout(function() {
            document.getElementById('claimstatusplaceholder').replaceChildren()
        }, (dailysuccess == "Balance too high" ? 20000 : 10000))
    }
    if (e.target.id == 'sendcredits') {
        const activeaccdata = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=no`).then(res => res.json())
        const recipientdata = await fetch(`https://api.rotur.dev/profile?name=${document.getElementById('transferuser').value}&include_posts=no`).then(res => res.json())
        const transferamt = parseFloat(document.getElementById('amount').value)
        const note = document.getElementById('transfernote').value
        let potentialerrormsg = ""

        if (document.getElementById('transferuser').value == "") {
            potentialerrormsg = "Enter a user to send credits to."
        } else if (isNaN(transferamt)) {
            potentialerrormsg = "Enter a valid amount"
        }else if (transferamt > activeaccdata.currency) {
            potentialerrormsg = `Insufficient funds for transfer (Available funds: ${activeaccdata.currency})`
        } else if (transferamt <= 0) {
            potentialerrormsg = `Minimum amount must be 0.01`
        } else if (recipientdata.error) {
            potentialerrormsg = `This user does not exist`
        } else if (recipientdata.username == activeacc.name) {
            potentialerrormsg = `You cannot send credits to yourself.`
        } else if (recipientdata['sys.banned']) {
            potentialerrormsg = 'This user was banned.'
        }

        if (potentialerrormsg) {
            document.getElementById('transferstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>${potentialerrormsg}</p>`))
            setTimeout(function() {
                document.getElementById('transferstatusplaceholder').replaceChildren()
            }, 10000)
            return;
        }
        openPopup(activeaccdata, recipientdata, transferamt, note);
    }

    if (e.target.id == 'finaltransfer') {
        const transferuser = document.getElementById('transferuser').value
        const transfervalue = parseFloat(document.getElementById('amount').value);
        const transferresult = await fetch(`https://api.rotur.dev/me/transfer?auth=${activeacc.token}`, {
            method: "POST",
            body: JSON.stringify({to: transferuser, amount: transfervalue, note: document.getElementById('transfernote').value})
        })
        closePopup()
        if (transferresult.error) {
            document.getElementById('transferstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>An unknown error occurred.</p>`))
        } else {
            bal_cache -= transfervalue;
            if (accounts.findIndex(item => item.name.toLowerCase() == transferuser.toLowerCase()) == -1) {
                sum_cache[0] -= transfervalue
                chrome.storage.session.set({sum_cache: sum_cache})
            }
            refreshCounters()
            document.getElementById('transferstatusplaceholder').replaceChildren(...parseHTML(`<p class='success'>Transfer of ${transfervalue} credit${transfervalue != 1 ? 's' : ''} to ${document.getElementById('transferuser').value} was successful!</p>`))
            document.getElementById('transferuser').value = ''
            document.getElementById('amount').value = ''
            document.getElementById('transfernote').value = ''
            setTimeout(function() {
                document.getElementById('transferstatusplaceholder').replaceChildren()
            }, 10000)
        }
    }

    if (e.target.id == 'bulkclaimbtn') {
        e.target.disabled = true;
        e.target.textContent = 'Claiming...'
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms)); // To reduce the risk of credits quietly not getting claimed (but still triggering the 24-hour cooldown) due to rate limits

        document.getElementById('bulkclaimstatusplaceholder').replaceChildren()
        let success_count = 0
        const pool = document.getElementById('pooldailycredits').checked

        for (let j=0; j<accounts.length; j++) {
            const dailysuccess = await fetch(`https://api.rotur.dev/claim_daily?auth=${accounts[j].token}`).then(res => res.json())
            if (!dailysuccess.error) {
                success_count += 1
                if (pool && (activeacc.name != accounts[j].name)) {
                    await delay(500)
                    const accdata = await fetch(`https://api.rotur.dev/get_user?auth=${accounts[j].token}`).then(res => res.json())
                    const recent_transaction = accdata['sys.transactions'][0]
                    const poolamt = recent_transaction.amount
                    const compare_time = Date.now()
                    if ((accdata['sys.currency'] > 1000) || !((recent_transaction.type == 'in') && (Math.abs(compare_time - recent_transaction.time) < 10000) && (recent_transaction.user == 'rotur'))) {
                        success_count -= 1; // Proofing (failsafe) in case someone with an account over 1K credits tries to use this feature or the API fails to claim one of the account's daily credits
                    } else {
                        await fetch(`https://api.rotur.dev/me/transfer?auth=${accounts[j].token}`, {
                            method: "POST",
                            body: JSON.stringify({to: activeacc.name, amount: poolamt, note: "transfer"})
                        })
                    }
                }
            }
            await delay(2000)
        }
        await delay(10)
        e.target.disabled = false;
        e.target.textContent = 'Bulk-Claim'

        if (success_count == 0) {
            document.getElementById('bulkclaimstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>All daily claims failed. (0/${accounts.length})</p>`))
        } else if (success_count == accounts.length) {
            document.getElementById('bulkclaimstatusplaceholder').replaceChildren(...parseHTML(`<p class='success'>Daily claims successful! (${success_count}/${accounts.length})</p>`))
            walletpage()
        } else {
            document.getElementById('bulkclaimstatusplaceholder').replaceChildren(...parseHTML(`<p class='partialsuccess'>Daily claims partially successful. (${success_count}/${accounts.length})</p>`))
            walletpage()
        }
        setTimeout(function() {
            document.getElementById('bulkclaimstatusplaceholder').replaceChildren()
        }, 15000)
    }
})
