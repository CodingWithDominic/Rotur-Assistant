import { sanitize, formatDate, parseHTML } from "../index.js"

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
        `<h1>Rmail</h1>
        <h3>You are not signed in! Please sign in using the account manager to access this page.</h3>`
    ))
} else if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
        `<h1>Rmail</h1>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>`
    ))
} else {

    const clientid = `ast-RtrAstUsr_${Date.now()}`

    // Functions

    function openDeletePopup(idx) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
            <div id="popup-header">
                <h1>Delete Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="deleteconfirmdialogue">Really delete this rmail? While it will be gone from your feed, it won't be gone from the other person's feed.</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">No</button>
                <button class="finaldelete" data-payloadidx='${idx}'>Yes</button>
            </div>
        `))
    }

    function openErrorPopup(error) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
            <div id="popup-header">
                <h1>Error</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="deleteconfirmdialogue">${error}</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">OK</button>
            </div>
        `))
    }

    function openSuccessPopup(msg) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
            <div id="popup-header">
                <h1>Success</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="deleteconfirmdialogue">${msg}</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">OK</button>
            </div>
        `))
    }

    function closePopup() {
        document.getElementById('overlay').style.display = 'none';
    }

    function filterRmails(data){
        let sent_html = ``
        let received_html = ``
        let current_html = ``
        let idx = 1;
        let duplicates = []
        data.forEach(rmail => {
            current_html = `<li class='rmailpreview' data-payloadidx='${idx}'>
                <div class='rmailauthorheader'>
                    <img src='https://avatars.rotur.dev/${rmail.from ?? "Spectator"}' width=40 height=40 alt='${rmail.from ?? "Spectator"}'>
                    <h2>${(rmail.from || "Unknown User").replace(/^./, char => char.toUpperCase())}</h2>
                    <div class='rmailtorecipient'>
                        <p>To: </p>
                        <img src='https://avatars.rotur.dev/${rmail.recipient ?? "Spectator"}' width=24 height=24 alt='${rmail.recipient ?? "Spectator"}'>
                        <p>${(rmail.recipient || "Unknown User").replace(/^./, char => char.toUpperCase())}</p>
                    </div>
                </div>
                <div class='rmailpreviewbody'>
                    <h3>${sanitize(rmail.title)}</h3>
                </div>
                <div class='rmailactionbuttons'>
                    <button class='rmailreply' title="Reply to Rmail" data-payloadidx='${idx}' data-rmailtitle='${rmail.title}' data-rmailauthor='${rmail.from.replace(/^./, char => char.toUpperCase())}'>&larrhk;</button>
                    <button class='rmaildelete' title="Delete Rmail from feed" data-payloadidx='${idx}'><img src='../images/misc_icons/delete.png' width=24 height=24></button>
                </div>
                <p class='rmailpreviewtimestamp'>${formatDate(rmail.timestamp)}</p>
            </li>`
            if (rmail.recipient.toLowerCase() == activeacc.name.toLowerCase()) {
                if (rmail.recipient == rmail.from && duplicates.includes(rmail.timestamp)) {
                    sent_html += current_html // If you send an rmail to yourself, you get 2 instances of that rmail next time you load your feed. To handle this, the 2 get split across each tab (1 each)
                } else {
                    received_html += current_html
                }
            } else {
                sent_html += current_html
            }
            duplicates.push(rmail.timestamp)
            idx += 1
        })
        if (sent_html == ``) {
            document.getElementById('sentrmailslist').replaceChildren(...parseHTML(`<h2>You have not sent any rmails yet.`))
            document.getElementById('sentrmailslist').style = 'border: none;'
        } else {
            document.getElementById('sentrmailslist').replaceChildren(...parseHTML(sent_html))
        }
        if (received_html == ``) {
            document.getElementById('receivedrmailslist').replaceChildren(...parseHTML(`<h2>You have not received any rmails yet.`))
            document.getElementById('receivedrmailslist').style = 'border: none;'
        } else {
            document.getElementById('receivedrmailslist').replaceChildren(...parseHTML(received_html))   
        }
    }

    // Websocket initialization

    const rmail = new WebSocket("wss://ws.rotur.dev")
    rmail.onopen = () => {
            rmail.send(JSON.stringify({
                "cmd": "handshake",
                "val": {
                    "language": "Javascript",
                    "version": {
                    "editorType": "Scratch",
                    "versionNumber": 3,
                    },
                },
                "listener": "handshake_cfg",
                }))
    }

    rmail.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.listener == 'handshake_cfg') {
            rmail.send(JSON.stringify({
            "cmd": "setid",
            "val": clientid,
            "listener": "username_cfg"
            }))
        }

        if (data.listener == 'username_cfg') {
            rmail.send(JSON.stringify({
            "cmd": "link",
            "val":[
                "roturTW" // the room to link to
            ],
            "listener":"link"
            }))
        }

        if (data.listener == 'link') {
            rmail.send(JSON.stringify({
                "cmd": "auth",
                "val": activeacc.token,
                "listener":'rmails'
                }))
        }
        if (data.listener == 'rmails') {
            rmail.send(JSON.stringify({
                "cmd": "pmsg",
                "val": {
                    "command": "omail_getinfo",
                    "client": clientid,
                    "id":"Rotur_Assistant_Mail"
                }, 
                "id":"sys-rotur" // I had to reference orion for this; the docs were slightly misleading
                }))
        }
        if (data.val && data.val.success && data.val.source_command == 'omail_getinfo') {
            filterRmails(data.val.payload)
        }
        if (data.val && data.val.success && data.val.source_command == 'omail_getid') {
            const maildata = data.val.payload[1]
            document.getElementById('viewrmailauthorpfp').src = `https://avatars.rotur.dev/${maildata.info.from ?? "Spectator"}`
            document.getElementById('viewrmailauthorpfp').alt = maildata.info.from ?? "Spectator"
            document.getElementById('viewrmailreply').dataset.payloadidx = String(data.val.payload[0])
            document.getElementById('viewrmailreply').dataset.rmailtitle = maildata.info.title
            document.getElementById('viewrmailreply').dataset.rmailauthor = (maildata.info.from ?? "Unknown User").replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmaildelete').dataset.payloadidx = String(data.val.payload[0])
            document.getElementById('viewrmailauthortext').textContent = (maildata.info.from ?? "Unknown User").replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmailtimestamp').textContent = formatDate(maildata.info.timestamp)
            document.getElementById('viewrmailtitletext').textContent = maildata.info.title
            document.getElementById('viewrmailrecipientpfp').src = `https://avatars.rotur.dev/${maildata.info.recipient ?? "Spectator"}`
            document.getElementById('viewrmailauthorpfp').alt = maildata.info.recipient ?? "Spectator"
            document.getElementById('viewrmailrecipient').textContent = maildata.info.recipient.replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmailbody').innerText = maildata.body
            document.getElementsByClassName('container')[1].style.display = 'block'
        }
        if (data.val?.source_command == 'omail_send') {
            if (data.val.success) {
                openSuccessPopup('Rmail sent successfully!')
                document.getElementById('rmail_comp_receipient').value = ''
                document.getElementById('rmail_comp_title').value = ''
                document.getElementById('rmail_comp_body').value = ''
                rmail.send(JSON.stringify({
                "cmd": "pmsg",
                "val": {
                    "command": "omail_getinfo",
                    "client": clientid,
                    "id":"Rotur_Assistant_Mail"
                }, 
                "id":"sys-rotur"
                }))
            } else {
                openErrorPopup('An Unknown error occurred while trying to send this Rmail.')
            }
        }
        if (data.val?.source_command == 'omail_delete') {
            if (data.val.success) {
                openSuccessPopup("Successfully deleted this Rmail.")
                document.getElementsByClassName('container')[0].style.display = 'block'
                document.getElementsByClassName('container')[1].style.display = 'none'
                rmail.send(JSON.stringify({
                "cmd": "pmsg",
                "val": {
                    "command": "omail_getinfo",
                    "client": clientid,
                    "id":"Rotur_Assistant_Mail"
                }, 
                "id":"sys-rotur"
                }))
            } else {
                openErrorPopup('An Unknown error occurred while trying to delete this Rmail.')
            }
        }
    }

    rmail.onerror = (error) => {
        console.warn('Rotur may be down right now. Try again another time.')
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
            `<h1>Rmail</h1>
            <h3>This part of Rotur may be down right now. Try again another time.</h3>`
        ))
    }

    // Document Code

    document.addEventListener('click', async function(e) {
        if (e.target.className == 'closebtn') {
            closePopup()
            return;
        }
        if (e.target.className == 'rmailtab') {
            if (e.target.id == 'rmail_sent') {
                document.getElementById('rmail_sent').style = "border-bottom: 2px solid white;"
                document.getElementById('rmail_received').style = "border-bottom: none;"
                document.getElementById('rmailsenttab').style.display = 'block'
                document.getElementById('rmailreceivedtab').style.display = 'none'
            }
            if (e.target.id == 'rmail_received') {
                document.getElementById('rmail_sent').style = "border-bottom: none;"
                document.getElementById('rmail_received').style = "border-bottom: 2px solid white;"
                document.getElementById('rmailsenttab').style.display = 'none'
                document.getElementById('rmailreceivedtab').style.display = 'block'
            }
        }
        if (e.target.className == 'rmailpreview') {
            rmail.send(JSON.stringify({
                "cmd": "pmsg",
                "val": {
                    "command": "omail_getid",
                    "client": clientid,
                    "id":"Rotur_Assistant_Mail",
                    "payload": parseInt(e.target.dataset.payloadidx)
                }, 
                "id":"sys-rotur"
                }))
            document.getElementsByClassName('container')[0].style.display = 'none'
        }
        if (e.target.id == 'rmail_goback' || e.target.id == 'rmail_goback2') {
            document.getElementsByClassName('container')[0].style.display = 'block'
            document.getElementsByClassName('container')[1].style.display = 'none'
            document.getElementsByClassName('container')[2].style.display = 'none'
        }
        if (e.target.id == 'compose_rmail') {
            document.getElementsByClassName('container')[0].style.display = 'none'
            document.getElementsByClassName('container')[2].style.display = 'block'
            if (document.getElementById('rmail_comp_title').value.includes('(Re: ')) {
                document.getElementById('rmail_comp_receipient').value = ''
                document.getElementById('rmail_comp_title').value = ''
            }
        }
        if (e.target.className == 'rmailreply') {
            document.getElementById('rmail_comp_receipient').value = e.target.dataset.rmailauthor
            document.getElementById('rmail_comp_title').value = `(Re: ${e.target.dataset.rmailtitle})`
            document.getElementById('rmail_comp_body').value = ''
            document.getElementsByClassName('container')[0].style.display = 'none'
            document.getElementsByClassName('container')[1].style.display = 'none'
            document.getElementsByClassName('container')[2].style.display = 'block'
        }
        if (e.target.className == 'rmaildelete') {
            openDeletePopup(e.target.dataset.payloadidx)
        }
        if (e.target.className == 'finaldelete') {
            closePopup()
            rmail.send(JSON.stringify({
                "cmd": "pmsg",
                "val": {
                    "command": "omail_delete",
                    "client": clientid,
                    "id":"Rotur_Assistant_Mail",
                    "payload": parseInt(e.target.dataset.payloadidx)
                }, 
                "id":"sys-rotur"
                }))
        }
    })

    document.getElementById('rmailcompositionbox').addEventListener('submit', async function(e) {
        e.preventDefault();
        const recipient = document.getElementById('rmail_comp_receipient').value
        const title = document.getElementById('rmail_comp_title').value
        const body = document.getElementById('rmail_comp_body').value
        if (recipient == '') {
            openErrorPopup('Enter a valid recipient.')
            return;
        } else if (title == '') {
            openErrorPopup('Please enter a Title.')
            return;
        } else if (body == '') {
            openErrorPopup("You can't send a blank rmail.")
            return;
        }
        const recipient_exists = await fetch('https://api.rotur.dev/profile?name=' + recipient).then(res => res.json())
        if (!recipient_exists.error) {
            if (title.length < 101) {
                if (body.length < 20001) {
                    rmail.send(JSON.stringify({
                "cmd": "pmsg",
                "val": {
                    "command": "omail_send",
                    "client": clientid,
                    "id":"Rotur_Assistant_Mail",
                    "payload": {
                        title: title,
                        body: body,
                        recipient: recipient
                    }
                }, 
                "id":"sys-rotur"
                }))
                } else {
                    openErrorPopup('Body cannot exceed 20,000 characters (Rmail has a packet limit of 50 KB)')
                }
            } else {
                openErrorPopup('Title cannot exceed 100 characters')
            }
        } else {
            openErrorPopup('Recipient does not exist')
        }
    })
}