import { sanitize, formatDate, MiniError } from "../index.js" // This is basically re-used code from wallet.js, just I'm hardcoded as the recipient

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled']
}
const sanitizer = new Sanitizer(config)

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Donation page</h1>
        <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>
    `, {sanitizer: sanitizer})
}

if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Donation page</h1>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `, {sanitizer: sanitizer})
}

function openPopup(senderdata, recipientdata, amt, note) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Confirm Donation</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <h2>Donating ${amt} credit${amt != 1 ? 's' : ''} to: Dominic</h2>
        <p>Your Balance: ${senderdata.currency} -> ${String(senderdata.currency - amt).length > 10 ? (senderdata.currency - amt).toFixed(2) : (senderdata.currency - amt)}</p>
        <p>Dominic's Balance: ${recipientdata.currency} -> ${String(recipientdata.currency + amt).length > 10 ? (recipientdata.currency + amt).toFixed(2) : recipientdata.currency + amt}</p>
        ${(note != "" ? `<p class="transactionnote">With note: ${sanitize(note.substring(0, 50))}</p>` : "")}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finaltransfer">Confirm & Send</button>
        </div>
    `, {sanitizer: sanitizer})
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

document.addEventListener('click', async function(e) {
    if (e.target.id == 'sendcredits') {


        const transferamt = parseFloat(document.getElementById('donateamount').value)
        const note = document.getElementById('transfernote').value
        let potentialerrormsg = ""
        
        if (activeacc.name == 'Dominic') {
            potentialerrormsg = "You cannot donate credits to yourself!"
        } else if (isNaN(transferamt)) {
            potentialerrormsg = "Enter a valid amount"
        }
        const activeaccdata = potentialerrormsg ? null : await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=no`).then(res => res.json())
        if (!potentialerrormsg) {
            if (transferamt <= 0) {
                potentialerrormsg = `Minimum amount must be 0.01`

            } else if (activeaccdata && (transferamt > activeaccdata.currency)) {
                potentialerrormsg = `Insufficient funds for transfer (Available funds: ${activeaccdata.currency})`
            }
        }
        const recipientdata = potentialerrormsg ? null : await fetch(`https://api.rotur.dev/profile?name=Dominic&include_posts=no`).then(res => res.json())
        if (!potentialerrormsg && recipientdata && recipientdata['sys.banned']) {
            potentialerrormsg = 'This user was banned.'
        }
        if (potentialerrormsg) {
            document.getElementById('transferstatusplaceholder').replaceChildren(MiniError('failure', potentialerrormsg))
            setTimeout(function() {
                document.getElementById('transferstatusplaceholder').replaceChildren()
            }, 10000)
            return;
        } else {
            openPopup(activeaccdata, recipientdata, transferamt, note);
        }
    }
    if (e.target.id == 'finaltransfer') {
        const transfervalue = parseFloat(document.getElementById('donateamount').value);
        const donatenote = document.getElementById('transfernote').value
        const transferresult = await fetch(`https://api.rotur.dev/me/transfer?auth=${activeacc.token}`, {
            method: "POST",
            body: JSON.stringify({to: "Dominic", amount: transfervalue, note: (donatenote ? '(RA) ' + donatenote : "Donation through Rotur Assistant's Donation page")})
        }).then(res => res.json())
        closePopup()
        if (transferresult.error) {
            document.getElementById('transferstatusplaceholder').replaceChildren(MiniError('failure', transferresult.error))
        } else {
            document.getElementById('transferstatusplaceholder').replaceChildren(MiniError('success', `Transfer of ${transfervalue} credit${transfervalue != 1 ? 's' : ''} to Dominic was successful! Thank you for your donation! :)`))
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