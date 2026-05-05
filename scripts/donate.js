import { sanitize, formatDate, parseHTML } from "../index.js" // This is basically re-used code from wallet.js, just I'm hardcoded as the recipient

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
        <h1>Donation page</h1>
        <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>
    `))
}

if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
        <h1>Donation page</h1>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `))
}

function openPopup(senderdata, recipientdata, amt, note) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Donation</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <h2>Donating ${amt} credit${amt != 1 ? 's' : ''} to: Dominic</h2>
        <p>Your Balance: ${senderdata.currency} -> ${senderdata.currency - amt}</p>
        <p>Dominic's Balance: ${recipientdata.currency} -> ${String(recipientdata.currency + amt).length > 10 ? (recipientdata.currency + amt).toFixed(2) : recipientdata.currency + amt}</p>
        ${(note != "" ? `<p>With note: ${sanitize(note)}</p>` : "")}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finaltransfer">Confirm & Send</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

document.addEventListener('click', async function(e) {
    if (e.target.id == 'sendcredits') {
    const activeaccdata = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=no`).then(res => res.json())
    const recipientdata = await fetch(`https://api.rotur.dev/profile?name=Dominic&include_posts=no`).then(res => res.json())
    const transferamt = parseFloat(document.getElementById('donateamount').value)
    const note = document.getElementById('transfernote').value
    let potentialerrormsg = ""
    
    if (activeaccdata.username == 'Dominic') {
        potentialerrormsg = "You cannot donate credits to yourself!"
    } else if (isNaN(transferamt)) {
        potentialerrormsg = "Enter a valid amount"
    }else if (transferamt > activeaccdata.currency) {
        potentialerrormsg = `Insufficient funds for transfer (Available funds: ${activeaccdata.currency})`
    } else if (transferamt <= 0) {
        potentialerrormsg = `Minimum amount must be 0.01`
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
    const transfervalue = parseFloat(document.getElementById('donateamount').value);
    const donatenote = document.getElementById('transfernote').value
    const transferresult = await fetch(`https://api.rotur.dev/me/transfer?auth=${activeacc.token}`, {
        method: "POST",
        body: JSON.stringify({to: "Dominic", amount: transfervalue, note: (donatenote ? '(RA) ' + donatenote : "Donation via Rotur Assistant's Donate page")})
    }).then(res => res.json())
    closePopup()
    if (transferresult.error) {
        document.getElementById('transferstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>An unknown error occurred.</p>`))
    } else {
        document.getElementById('transferstatusplaceholder').replaceChildren(...parseHTML(`<p class='success'>Transfer of ${transfervalue} credit${transfervalue != 1 ? 's' : ''} to Dominic was successful! Thank you for your donation! :)</p>`))
        document.getElementById('donateamount').value = ''
        document.getElementById('transfernote').value = ''
        setTimeout(function() {
            document.getElementById('transferstatusplaceholder').replaceChildren()
        }, 10000)
    }
}
if (e.target.id == 'cancel' || e.target.id == 'popup-x') {
    closePopup();
    return;
}
})