import { sanitize, formatDate, openErrorPopup, openSuccessPopup, CreateEmptyPlaceholder, UploadImage } from "../index.js"

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'input', 'hr', 'a'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'type', 'placeholder', 'step']
}
const sanitizer = new Sanitizer(config)

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
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].setHTML(
        `<h1>Rmail</h1>
        <h3>You are not signed in! Please sign in using the account manager to access this page.</h3>`,
        {sanitizer: sanitizer})
} else if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].setHTML(
        `<h1>Rmail</h1>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>`,
        {sanitizer: sanitizer}
    )
} else {

    const clientid = `ast-RtrAstUsr_${Date.now()}`

    // Functions

    function openDeletePopup(idx) {
        document.getElementById('overlay').style.display = 'flex';
        document.getElementsByClassName('popup')[0].setHTML(`
            <div id="popup-header">
                <h1>Delete Rmail</h1>
                <button id="popup-x" class="closebtn">✕</button>
            </div>
            <p id="deleteconfirmdialogue">Really delete this rmail? While it will be gone from your feed, it won't be gone from the other person's feed.</p>
            <div id="popup-choices">
                <button id="cancel" class="closebtn">No</button>
                <button class="finaldelete" data-payloadidx='${idx}'>Yes</button>
            </div>
        `, {sanitizer: sanitizer})
    }

    function closePopup() {
        document.getElementById('overlay').style.display = 'none';
    }

    function parseImages(content) {
        const regex = /\[RAIMG\](.*?)\[\/RAIMG\]/g;
        return Array.from(content.matchAll(regex), match => match[1]);
    }

    function parseImage2(content) {
        const regex = /\[RAIMG\][\s\S]*?\[\/RAIMG\]/g
        return content.replace(regex, "")
    }

    function filterRmails(data) {
        const sent_html = []
        const received_html = []
        let idx = 1;
        const duplicates = []
        data.forEach(rmail => {
            const rmailcard = document.getElementById('rmailcard').content.cloneNode(true)
            rmailcard.querySelectorAll('[data-payloadidx]').forEach(card => {
                card.dataset.payloadidx = idx
            })
            rmailcard.querySelector('h2').textContent = (rmail.from.replace(/^./, char => char.toUpperCase()) || "Unknown User")
            rmailcard.querySelector('.authorpfp').src = `https://avatars.rotur.dev/${rmail.from || "Spectator"}`
            rmailcard.querySelector('.authorpfp').alt = (rmail.from || "Spectator").replace(/^./, char => char.toUpperCase())

            rmailcard.querySelector('.recipientpfp').src = `https://avatars.rotur.dev/${rmail.recipient || "Spectator"}`
            rmailcard.querySelector('.recipientpfp').alt = (rmail.recipient || "Spectator").replace(/^./, char => char.toUpperCase())

            rmailcard.querySelector('.rmailto').textContent = (rmail.recipient.replace(/^./, char => char.toUpperCase()) || "Unknown User")
            
            rmailcard.querySelector('.rmailpreviewbody').querySelector('h3').textContent = rmail.title
            rmailcard.querySelector('.rmailreply').dataset.rmailtitle = rmail.title
            rmailcard.querySelector('.rmailreply').dataset.rmailauthor = (rmail.from.replace(/^./, char => char.toUpperCase()) || "Spectator")
            rmailcard.querySelector('.rmailpreviewtimestamp').textContent = formatDate(rmail.timestamp)
            if (rmail.recipient.toLowerCase() == activeacc.name.toLowerCase()) {
                if (rmail.recipient == rmail.from && duplicates.includes(rmail.timestamp)) {
                    sent_html.push(rmailcard) // If you send an rmail to yourself, you get 2 instances of that rmail next time you load your feed. To handle this, the 2 get split across each tab (1 each)
                } else {
                    received_html.push(rmailcard)
                }
            } else {
                sent_html.push(rmailcard)
            }
            duplicates.push(rmail.timestamp)
            idx += 1
        })
        document.getElementById('rmail_sent').textContent = `Sent (${sent_html.length})`
        document.getElementById('rmail_received').textContent = `Received (${received_html.length})`
        const h2 = ``
        if (sent_html.length == 0) {
            document.getElementById('sentrmailslist').replaceChildren(CreateEmptyPlaceholder(`You have not sent any rmails yet.`, true))
            document.getElementById('sentrmailslist').style = 'border: none;'
        } else {
            document.getElementById('sentrmailslist').replaceChildren(...sent_html)
            document.getElementById('sentrmailslist').style = "border: 2px solid white;"
        }
        if (received_html.length == 0) {
            document.getElementById('receivedrmailslist').replaceChildren(CreateEmptyPlaceholder(`You have not received any rmails yet.`, true))
            document.getElementById('receivedrmailslist').style = 'border: none;'
        } else {
            document.getElementById('receivedrmailslist').replaceChildren(...received_html)
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
                "roturTW"
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
            document.getElementById('viewrmailreply').dataset.rmailauthor = (maildata.info.from || "Spectator").replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmaildelete').dataset.payloadidx = String(data.val.payload[0])
            document.getElementById('viewrmailauthortext').textContent = (maildata.info.from || "Unknown User").replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmailtimestamp').textContent = formatDate(maildata.info.timestamp)
            document.getElementById('viewrmailtitletext').textContent = maildata.info.title
            document.getElementById('viewrmailrecipientpfp').src = `https://avatars.rotur.dev/${maildata.info.recipient || "Spectator"}`
            document.getElementById('viewrmailrecipientpfp').alt = maildata.info.recipient || "Spectator"
            document.getElementById('recipient_href').href = "lookup.html?user=" + (maildata.info.recipient || "Spectator")
            document.getElementById('viewrmailrecipient').textContent = (maildata.info.recipient || "Unknown User").replace(/^./, char => char.toUpperCase())
            document.getElementById('viewrmailbodytext').innerText = maildata.body.includes('[RAIMG]') ? parseImage2(maildata.body) : maildata.body
            document.getElementById('rmailimageplaceholder').replaceChildren()
            const images = parseImages(maildata.body)
            if (images.length == 0) {
                document.getElementById('rmailimageplaceholder').style.display = 'none'
            } else {
                document.getElementById('rmailimageplaceholder').style.display = 'block'
                images.forEach(image => {
                    const img = document.createElement('img')
                    img.src = image
                    document.getElementById('rmailimageplaceholder').appendChild(img)
                })
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
        if (data.listener == 'ping') {
            rmail.send(JSON.stringify({
                cmd: 'pong'
            }))
        }
    }

    rmail.onerror = (error) => {
        document.getElementsByClassName('container')[0].setHTML(
            `<h1>Rmail</h1>
            <h3>A communication error has occurred. If you're sure it's not your connection, then this part of Rotur may be down right now.</h3>`,
        {sanitizer: sanitizer})
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
                console.error(err)
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
            document.getElementById('rmail_comp_body').value = (e.target.dataset.rmailauthor == 'Spectator') ? 'While this Rmail will be seen by the owner of the "Spectator" account, do keep in mind that you\'re seeing this because you tried replying to a user that no longer exists.' : ''
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
        } else if (body == '' && !document.getElementById('rmailimage').files) {
            openErrorPopup("You can't send a blank rmail.")
            return;
        } else if (title.length > 100) {
            openErrorPopup('Title cannot exceed 100 characters')
        } else if (body.length > 20000){
            openErrorPopup('Body cannot exceed 20,000 characters (Rmail has a packet limit of 50 KB)')
        }
        postbutton.disabled = true
        postbutton.textContent = 'Sending...'
        const recipient_exists = await fetch('https://api.rotur.dev/exists?username=' + recipient).then(res => res.json())
        if (recipient_exists.exists && !recipient_exists.error) {
            let potentialattachment = []
            let attachment_cache = ''
            const postbutton = document.getElementById('send_rmail')
            document.getElementById('clearattachment').disabled = true

            const attachments = document.getElementById('rmailimage').files

            if (attachments.length > 0) {
                for (let i=0; i<attachments.length; i++) {
                    const newimg = await UploadImage(attachments[i])
                    if (!newimg) {
                        openErrorPopup('One of your attachments failed to upload')
                        postbutton.disabled = false
                        postbutton.textContent = 'Send →'
                        return;
                    } else {
                        potentialattachment.push(`[RAIMG]${newimg}[/RAIMG]`)
                    }
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
                        body: body.replaceAll('[RAIMG]', '').replaceAll('[/RAIMG]', '') + (potentialattachment.length > 0 ? potentialattachment.join('') : ''),
                        recipient: recipient
                    }
                }, 
                "id":"sys-rotur"
            }))
                
        } else {
            openErrorPopup('Recipient does not exist')
        }
        postbutton.disabled = false
        postbutton.textContent = 'Send →'
    })
}
if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('rmailimage').addEventListener('change', async function(e) {
        document.getElementById('clearattachment').style.display = 'flex'
    })
}