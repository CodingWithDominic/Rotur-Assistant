import { sanitize, formatDate, MiniError, FixDecimal } from "../index.js" // This is basically re-used code from wallet.js, just I'm hardcoded as the recipient

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'hr', 'a'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'style']
}
const sanitizer = new Sanitizer(config)
const authform = new FormData()
if (!navigator.onLine) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Donation page</h1>
        <hr class="full-size">
        <h3>A communication error has occurred. Please check your internet connection.</h3>
    `, {sanitizer: sanitizer})
    throw new Error("No Internet connection")
}
if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Donation page</h1>
        <hr class="full-size">
        <h3>You are not signed in! Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to add an account first.</h3>
    `, {sanitizer: sanitizer})
} else {
    authform.append("Authorization", `Bearer ${activeacc.token}`)
}

if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Donation page</h1>
        <hr class="full-size">
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
        <p>Your Balance: ${senderdata.currency ?? 0} -> ${String((senderdata.currency ?? 0) - amt).length > 10 ? ((senderdata.currency ?? 0) - amt).toFixed(2) : ((senderdata.currency ?? 0) - amt)}</p>
        <p>Dominic's Balance: ${(recipientdata.currency ?? 0)} -> ${String((recipientdata.currency ?? 0) + amt).length > 10 ? ((recipientdata.currency ?? 0) + amt).toFixed(2) : (recipientdata.currency ?? 0) + amt}</p>
        ${(note != "" ? `<p class="transactionnote">With note: ${sanitize(note.substring(0, 50))}</p>` : "")}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finaltransfer">Confirm & Send</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openPopup2(senderdata, recipientdata, recipientdata2, amt, note) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Confirm Donation</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <h2>Donating ${amt} credit${amt != 1 ? 's' : ''} (${Math.round((amt / 2) / 0.02) * 0.02} credit${(Math.round((amt / 2) / 0.02) * 0.02) != 1 ? 's' : ''} each) to: Dominic and MiloDev123</h2>
        <p>Your Balance: ${senderdata.currency ?? 0} -> ${FixDecimal((senderdata.currency ?? 0) - amt)}</p>
        <p>Dominic's Balance: ${(recipientdata.currency ?? 0)} -> ${FixDecimal((recipientdata.currency ?? 0) + (amt / 2))}</p>
        <p>MiloDev123's Balance: ${(recipientdata2.currency ?? 0)} -> ${FixDecimal((recipientdata2.currency ?? 0) + (amt / 2))}</p>
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
        
        if (activeacc.name == 'Dominic' || ((activeacc.name.toLowerCase() == 'milodev123') && document.getElementById('splitdonation').checked)) {
            potentialerrormsg = "You cannot donate credits to yourself!"
        } else if (isNaN(transferamt)) {
            potentialerrormsg = "Enter a valid amount"
        }
        const activeaccdata = potentialerrormsg ? null : await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}&include_posts=no`, {headers: authform}).then(res => res.json())
        if (!potentialerrormsg) {
            if (transferamt <= 0) {
                potentialerrormsg = `Minimum amount must be 0.01`

            } else if (activeaccdata && (transferamt > activeaccdata.currency)) {
                potentialerrormsg = `Insufficient funds for transfer (Available funds: ${activeaccdata.currency})`
            }
        }
        const recipientdata = potentialerrormsg ? null : await fetch(`https://api.rotur.dev/profile?name=Dominic&include_posts=no`, {headers: authform}).then(res => res.json())
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
            if (document.getElementById('splitdonation').checked) {
                const recipientdata2 = potentialerrormsg ? null : await fetch(`https://api.rotur.dev/profile?name=MiloDev123&include_posts=no`, {headers: authform}).then(res => res.json())
                openPopup2(activeaccdata, recipientdata, recipientdata2, transferamt, note);
            } else {
                openPopup(activeaccdata, recipientdata, transferamt, note);
            }
        }
    }
    if (e.target.id == 'finaltransfer') {
        e.target.disabled = true
        e.target.textContent = 'Sending...'
        const milosplit = document.getElementById('splitdonation').checked
        const transferinput = parseFloat(document.getElementById('donateamount').value)
        const transfervalue = milosplit ? (Math.round((transferinput / 2) / 0.02) * 0.02) : transferinput;
        const donatenote = document.getElementById('transfernote').value
        const transferresult = await fetch(`https://api.rotur.dev/me/transfer`, {
            method: "POST",
            headers: authform,
            body: JSON.stringify({to: "Dominic", amount: transfervalue, note: (donatenote ? `${milosplit ? "[R/A]" : "[RA]"} ` + donatenote : (milosplit ? "Split donation on Rotur Assistant's Donation page" : "Donation through Rotur Assistant's Donation page"))})
        }).then(res => res.json())
        let transferresult2 = true
        if (milosplit && !transferresult.error) {
            transferresult2 = await fetch(`https://api.rotur.dev/me/transfer`, {
                method: "POST",
                headers: authform,
                body: JSON.stringify({to: "MiloDev123", amount: transfervalue, note: (donatenote ? '[R/A] ' + donatenote : "Split donation on Rotur Assistant's Donation page")})
            }).then(res => res.json())
        }
        closePopup()
        if (transferresult.error) {
            document.getElementById('transferstatusplaceholder').replaceChildren(MiniError('failure', transferresult.error))
        } else {
            if (milosplit && transferresult2.error) {
                document.getElementById('transferstatusplaceholder').replaceChildren(MiniError('partialsuccess', "While Dominic's cut was successfully sent, MiloDev123 failed to receive his cut."))
            } else {
                document.getElementById('transferstatusplaceholder').replaceChildren(MiniError('success', `Transfer of ${transferinput} credit${transferinput != 1 ? 's' : ''}${milosplit ? ` (${transfervalue} each)` : ''} to Dominic ${milosplit ? "and MiloDev123 " : ""}was successful! Thank you for your donation! :)`))
                document.getElementById('donateamount').value = ''
                document.getElementById('transfernote').value = ''
            }
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