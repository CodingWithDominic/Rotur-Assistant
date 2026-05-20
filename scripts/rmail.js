import { sanitize, formatDate, parseHTML, openErrorPopup, openSuccessPopup } from "../index.js"

function toSuperscript(text) {
    const map = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return text.replace(/\d/g, (char) => map[char]);
}

function hasSuperscript(text) {
    const superscriptRegex = /[⁰¹²³⁴⁵⁶⁷⁸⁹]/;
    return superscriptRegex.test(text);
}

function incrementSuperscriptChain(text) {
    const toStandard = {
        '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
        '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
    };
    const toSuper = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };

    const superSequenceRegex = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;

    return text.replace(superSequenceRegex, (match) => {
        const standardNumStr = match.split('').map(char => toStandard[char]).join('');
        const incremented = parseInt(standardNumStr, 10) + 1;
        return incremented.toString().split('').map(char => toSuper[char]).join('');
    });
}

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

    function closePopup() {
        document.getElementById('overlay').style.display = 'none';
    }

    function parseImage(content) {
        return content.split('[RAIMG]')[1].split('[/RAIMG]')[0]
    }

    function parseImage2(content) {
        return content.split('[RAIMG]')[0]
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
                    <img src='https://avatars.rotur.dev/${rmail.from || "Spectator"}' width=40 height=40 alt='${rmail.from || "Spectator"}'>
                    <h2>${(rmail.from || "Unknown User").replace(/^./, char => char.toUpperCase())}</h2>
                    <div class='rmailtorecipient'>
                        <p>To: </p>
                        <img src='https://avatars.rotur.dev/${rmail.recipient || "Spectator"}' width=24 height=24 alt='${rmail.recipient || "Spectator"}'>
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
            document.getElementById('sentrmailslist').style = "border: 2px solid white;"
        }
        if (received_html == ``) {
            document.getElementById('receivedrmailslist').replaceChildren(...parseHTML(`<h2>You have not received any rmails yet.`))
            document.getElementById('receivedrmailslist').style = 'border: none;'
        } else {
            document.getElementById('receivedrmailslist').replaceChildren(...parseHTML(received_html))
            document.getElementById('receivedrmailslist').style = 'border: 2px solid white;'
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
            document.getElementById('viewrmailauthorpfp').src = `https://avatars.rotur.dev/${maildata.info.from || "Spectator"}`
            document.getElementById('viewrmailauthorpfp').alt = maildata.info.from || "Spectator"
            document.getElementById('author_href').href = "lookup.html?user=" + (maildata.info.from || "Spectator")
            document.getElementById('viewrmailreply').dataset.payloadidx = String(data.val.payload[0])
            document.getElementById('viewrmailreply').dataset.rmailtitle = maildata.info.title
            document.getElementById('viewrmailreply').dataset.rmailauthor = (maildata.info.from || "Unknown User").replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmaildelete').dataset.payloadidx = String(data.val.payload[0])
            document.getElementById('viewrmailauthortext').textContent = (maildata.info.from || "Unknown User").replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmailtimestamp').textContent = formatDate(maildata.info.timestamp)
            document.getElementById('viewrmailtitletext').textContent = maildata.info.title
            document.getElementById('viewrmailrecipientpfp').src = `https://avatars.rotur.dev/${maildata.info.recipient || "Spectator"}`
            document.getElementById('viewrmailrecipientpfp').alt = maildata.info.recipient || "Spectator"
            document.getElementById('recipient_href').href = "lookup.html?user=" + (maildata.info.recipient || "Spectator")
            document.getElementById('viewrmailrecipient').textContent = maildata.info.recipient.replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmailbodytext').innerText = maildata.body.includes('[RAIMG]') ? parseImage2(maildata.body) : maildata.body
            document.getElementById('rmailimageplaceholder').replaceChildren()
            if (maildata.body.includes('[RAIMG]')) {
                document.getElementById('rmailimageplaceholder').style.display = 'block'
                const img = document.createElement('img')
                img.src = parseImage(maildata.body)
                document.getElementById('rmailimageplaceholder').appendChild(img)
            } else {
                document.getElementById('rmailimageplaceholder').style.display = 'none'
            }
            document.getElementById('rmailpage2').style.display = 'block'
        }
        if (data.val?.source_command == 'omail_send') {
            if (data.val.success) {
                openSuccessPopup('Rmail sent successfully!')
                document.getElementById('rmail_comp_receipient').value = ''
                document.getElementById('rmail_comp_title').value = ''
                document.getElementById('rmail_comp_body').value = ''
                document.getElementById('rmailimage').value = ''
                const postbutton = document.getElementById('send_rmail')
                postbutton.disabled = false
                postbutton.textContent = 'Send →'
                document.getElementById('clearattachment').disabled = false
                document.getElementById('clearattachment').style.display = 'none'
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
                document.getElementById('rmailpage1').style.display = 'block'
                document.getElementById('rmailpage2').style.display = 'none'
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
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
            `<h1>Rmail</h1>
            <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`
        ))
    }

    // Document Code

    document.addEventListener('click', async function(e) {
        if (e.target.id == 'clearattachment') {
            document.getElementById('clearattachment').style.display = 'none'
            document.getElementById('rmailimage').value = ''
            return;
        }
        if (e.target.id == 'rmailimage' && e.shiftKey) {
            e.preventDefault()
            const target = e.target
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const clipboardItem of clipboardItems) {
                    const imageType = clipboardItem.types.find(type => type.startsWith('image/'));
                    if (imageType) {
                        const blob = await clipboardItem.getType(imageType);
                        const file = new File([blob], `image.${blob.type.split('/')[1]}`, { type: blob.type });
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        target.files = dataTransfer.files;
                        document.getElementById('clearattachment').style.display = 'flex';
                        return;
                    } else {
                        openErrorPopup('No image was detected on your clipboard.')
                    }
                }
            } catch (err) {
                openErrorPopup('No image was detected on your clipboard.')
            }
        }
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
            document.getElementById('rmailpage1').style.display = 'none'
        }
        if (e.target.id == 'rmail_goback' || e.target.id == 'rmail_goback2') {
            document.getElementById('rmailpage1').style.display = 'block'
            document.getElementById('rmailpage2').style.display = 'none'
            document.getElementById('rmailpage3').style.display = 'none'
        }
        if (e.target.id == 'compose_rmail') {
            document.getElementById('rmailpage1').style.display = 'none'
            document.getElementById('rmailpage3').style.display = 'block'
            if (document.getElementById('rmail_comp_title').value.includes('(Re: ')) {
                document.getElementById('rmail_comp_receipient').value = ''
                document.getElementById('rmail_comp_title').value = ''
            }
        }
        if (e.target.className == 'rmailreply') {
            document.getElementById('rmail_comp_receipient').value = e.target.dataset.rmailauthor
            const potentialrmailtitle = `(Re: ${e.target.dataset.rmailtitle})`
            const re_count = potentialrmailtitle.split('(Re: ').length - 1
            const originaltitle = potentialrmailtitle.split('(Re: ')[re_count].slice(0, (-1 * re_count))
            document.getElementById('rmail_comp_title').value = hasSuperscript(e.target.dataset.rmailtitle) ? incrementSuperscriptChain(e.target.dataset.rmailtitle) : (re_count > 1 ? `(Re${toSuperscript(String(re_count))}: ${originaltitle})` : potentialrmailtitle)
            document.getElementById('rmail_comp_body').value = ''
            document.getElementById('rmailpage1').style.display = 'none'
            document.getElementById('rmailpage2').style.display = 'none'
            document.getElementById('rmailpage3').style.display = 'block'
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
        const postbutton = document.getElementById('send_rmail')

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
        postbutton.disabled = true
        postbutton.textContent = 'Sending...'
        const recipient_exists = await fetch('https://api.rotur.dev/profile?name=' + recipient).then(res => res.json())
        if (!recipient_exists.error) {
            if (title.length < 101) {
                if (body.length < 20001) {
                    // Image Code

                    let potentialattachment = ''
                    const postbutton = document.getElementById('send_rmail')
                    document.getElementById('clearattachment').disabled = true

                    const attachment = document.getElementById('rmailimage').files[0]

                    if (attachment) {
                        const reader = new FileReader();

                        reader.onloadend = () => {
                            potentialattachment = reader.result
                        };

                        reader.readAsDataURL(attachment);
                        const response = await fetch('https://roturcdn.milosantos.com/api/image/upload?public=true', {
                            method: 'POST',
                            body: attachment
                        }).then(res => res.json());

                        potentialattachment = `https://roturcdn.milosantos.com/${response.id}`;
                        if (potentialattachment.includes('undefined')) {
                            openErrorPopup('Attachment failed to upload')
                            postbutton.disabled = false
                            postbutton.textContent = 'Send →'
                            return;
                        }
                    }

                    // End of Image Code
                    rmail.send(JSON.stringify({
                        "cmd": "pmsg",
                        "val": {
                            "command": "omail_send",
                            "client": clientid,
                            "id":"Rotur_Assistant_Mail",
                            "payload": {
                                title: title,
                                body: body.replaceAll('[RAIMG]', '').replaceAll('[/RAIMG]', '') + (potentialattachment ? `
                                    [RAIMG]${potentialattachment}[/RAIMG]` : ''),
                                recipient: recipient
                            }
                        }, 
                        "id":"sys-rotur"
                    }))
                } else {
                    openErrorPopup('Body cannot exceed 20,000 characters (Rmail has a packet limit of 50 KB)')
                    postbutton.disabled = false
                    postbutton.textContent = 'Send →'
                }
            } else {
                openErrorPopup('Title cannot exceed 100 characters')
                postbutton.disabled = false
                postbutton.textContent = 'Send →'
            }
        } else {
            openErrorPopup('Recipient does not exist')
            postbutton.disabled = false
            postbutton.textContent = 'Send →'
        }
    })
}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('rmailimage').addEventListener('change', async function(e) {
        document.getElementById('clearattachment').style.display = 'flex'
    })
}