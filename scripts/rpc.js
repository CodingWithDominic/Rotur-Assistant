import { MiniError, UploadImage } from "../index.js";

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'input', 'hr', 'a', 'label'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'type', 'placeholder', 'step']
}
const sanitizer = new Sanitizer(config)

// const default_url = "https://i.postimg.cc/zv54D7gT/rpc-server.png" For some reason this goes through the wsrv.nl proxy, while the image below doesn't
const default_url = "https://roturcdn.milosantos.com/dde8c751-2b5a-4470-b18d-66daf917ff93"

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

let rpc_json = await new Promise(resolve =>
    chrome.storage.local.get('rpcdata', data => resolve(data.rpcdata || {}))
) ?? {}

let settings = await new Promise(resolve =>
        chrome.storage.local.get('settings', data => resolve(data.settings?.padEnd(8, "0") || "00000000"))
    ) ?? "00000000";

let rpc_active = await new Promise(resolve =>
        chrome.storage.local.get('rpc_active', data => resolve(data.rpc_active || ""))
    ) ?? "";

if (!rpc_json[activeacc.uuid]) {
    rpc_json[activeacc.uuid] =
    {
        preference: "custom",
        customdata: []
    }
}

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Rotur RPC</h1>
        <p>Manage your Rotur RPC here</p>
        <hr class="full-size">
        <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>
    `)
}
if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Rotur RPC</h1>
        <p>Manage your Rotur RPC here</p>
        <hr class="full-size">
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `)
}

function OpenDisclaimerPopup(warning) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Disclaimer</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Due to extension limitations, this setting depends on external software, NexRPC, being installed, in order to function properly. NexRPC is a desktop RPC program developed by Milodev123.</p>
        <label>
            <input type='checkbox'>
            Don't show this again
        </label>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Back</button>
            <button id="trustnexrpc">Proceed</button>
        </div>
    `, {sanitizer: sanitizer})
}

function replaceCharAtIdx(string, index, newchar) {
    let strArray = string.split('');
    strArray[index] = newchar;
    let newStr = strArray.join('');
    return newStr;
}

let rpc_preference = rpc_json[activeacc.uuid].preference ?? "custom"
let current_rpc = rpc_json[activeacc.uuid].customdata ?? []

const h2 = document.createElement('h2')
h2.textContent = 'No modals yet'

function CreateModalElement(name, title, desc1, desc2, image, modalid, noappend) {
    const id = modalid ?? Date.now()
    const idx = current_rpc.findIndex(item => item.id == id)
    const modal = document.getElementById('rpcmodaltemplate').content.cloneNode(true)
    modal.querySelectorAll('[data-id]').forEach(elem => {
        elem.dataset.id = id
    })
    modal.querySelector('.customrpccontrolpanel').id = `modal-${id}`
    modal.querySelector('.rpcnamefield').value = name ?? ''
    modal.querySelector('.rpcimg').src = image ?? default_url
    modal.querySelector('.rpctitlefield').value = title ?? ''
    modal.querySelector('.rpcdescfield1').value = desc1 ?? ''
    modal.querySelector('.rpcdescfield2').value = desc2 ?? ''
    if ((idx == -1) || !noappend) {
        current_rpc.push({name: name ?? '', title: title ?? '', description1: desc1 ?? '', description2: desc2 ?? '', image: image ?? default_url, id: id})
        rpc_json[activeacc.uuid].customdata = current_rpc
    }
    return modal;
}

function LoadModals() {
    const modals = document.getElementById('rpc_modals')
    current_rpc.forEach(modal => {
        modals.querySelector('h2')?.remove()
        modals.appendChild(CreateModalElement(modal.name, modal.title, modal.description1, modal.description2, modal.image, modal.id, true))
    })
}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('rpcenabled').checked = (rpc_active == activeacc.uuid)
    document.getElementById('refreshrpc').disabled = (rpc_active != activeacc.uuid)

    document.getElementsByName('rpcsetting').forEach(setting => {
        if (setting.value == (rpc_json[activeacc.uuid].preference ?? "custom")) {
            setting.checked = true
        }
    })

    LoadModals()

    if (rpc_json[activeacc.uuid].preference == 'auto') {
        Array.from(document.getElementsByClassName('customrpccontrolpanel')).forEach(elem => {
            elem.querySelector('.rpcnamefield').disabled = true
            elem.querySelector('.rpctitlefield').disabled = true
            elem.querySelector('.rpcdescfield1').disabled = true
            elem.querySelector('.rpcdescfield2').disabled = true
            elem.querySelector('.rpcimgfield').disabled = true
            elem.querySelector('[class="uploadrpcimg hoverexempt"]').disabled = true
            elem.querySelector('.removemodal').disabled = true
            elem.querySelector('.rpcsavebtn').disabled = true
        })
        document.getElementById('addmodalbtn').disabled = true
    }
}

document.addEventListener('click', async function(e) {
    switch (e.target.id) {
        case ('addmodalbtn'): {
            const modals = document.getElementById('rpc_modals')
            if (modals.querySelector('h2')) {
                modals.replaceChildren()
            }
            modals.appendChild(CreateModalElement())
            if (modals.childElementCount > 4) {
                e.target.disabled = true
            }
            break;
        }
        case ('rpcenabled'): {
            rpc_active = e.target.checked ? activeacc.uuid : ''
            chrome.storage.local.set({rpc_active: rpc_active})
            document.getElementById('refreshrpc').disabled = !e.target.checked

            if (e.target.checked) {
                chrome.runtime.sendMessage({ type: "RPC_ON", data: rpc_json[activeacc.uuid], user: activeacc.uuid, auth: activeacc.token });
            } else {
                chrome.runtime.sendMessage({ type: "RPC_OFF" });
            }
            break;
        }
        case ('refreshrpc'): {
            chrome.runtime.sendMessage({ type: "RPC_ON", data: rpc_json[activeacc.uuid], user: activeacc.uuid, auth: activeacc.token });
        }
    }
    switch (e.target.className) {
        case ('closebtn'): {
            document.getElementById('overlay').style.display = 'none'
            break;
        }
        case ('removemodal'): {
            const id = e.target.dataset.id
            document.getElementById(`modal-${id}`)?.remove()
            current_rpc = rpc_json[activeacc.uuid].customdata
            current_rpc = current_rpc.filter(item => item.id != id)
            rpc_json[activeacc.uuid].customdata = current_rpc
            chrome.storage.local.set({rpcdata: rpc_json})

            if (document.getElementById('rpc_modals').childElementCount == 0) {
                document.getElementById('rpc_modals').replaceChildren(h2)
            } else if (document.getElementById('rpc_modals').childElementCount < 5) {
                document.getElementById('addmodalbtn').disabled = false
            }
            if (document.getElementById('rpcenabled').checked) {
                chrome.runtime.sendMessage({ type: "RPC_ON", data: rpc_json[activeacc.uuid], user: activeacc.uuid, auth: activeacc.token });
            }
            break;
        }
        case ('rpcsavebtn'): {
            const target = e.target
            target.textContent = 'Saving...'
            target.disabled = true
            const id = e.target.dataset.id
            const idx = current_rpc.findIndex(item => item.id == id)
            const modal = document.getElementById(`modal-${id}`)
            if (idx == -1) {
                target.textContent = 'Save'
                target.disabled = false
                modal.querySelector('.modalerrorplaceholder').replaceChildren(MiniError('failure', 'An error occurred while saving'))
                setTimeout(() => {modal?.querySelector('.modalerrorplaceholder')?.replaceChildren()}, 10000) 
                break;
            }
            const oldimg = current_rpc[idx]?.image ?? default_url
            const newname = modal.querySelector('.rpcnamefield').value
            const newtitle = modal.querySelector('.rpctitlefield').value
            const newdesc1 = modal.querySelector('.rpcdescfield1').value
            const newdesc2 = modal.querySelector('.rpcdescfield2').value
            const newimg = modal.querySelector('.rpcimgfield').files[0] ? (await UploadImage(modal.querySelector('.rpcimgfield').files[0])) : oldimg
            if (newimg == '') {
                modal.querySelector('.modalerrorplaceholder').replaceChildren(MiniError('failure', 'An error occurred while uploading the cover'))
                setTimeout(() => {modal?.querySelector('.modalerrorplaceholder')?.replaceChildren()}, 10000)
            } else if (!newname || !newtitle) {
                modal.querySelector('.modalerrorplaceholder').replaceChildren(MiniError('failure', 'At least a name and a title is required'))
                setTimeout(() => {modal?.querySelector('.modalerrorplaceholder')?.replaceChildren()}, 10000)
            } else {
                const newjson = {name: newname || '', title: newtitle || '', description1: newdesc1 || '', description2: newdesc2 || '', image: newimg || oldimg, id: id}
                current_rpc[idx] = newjson
                rpc_json[activeacc.uuid].customdata = current_rpc
                chrome.storage.local.set({rpcdata: rpc_json})
                modal.querySelector('.modalerrorplaceholder').replaceChildren(MiniError('success', 'Modal info saved successfully!'))
                modal.querySelector('.rpcimg').src = newimg
                if (document.getElementById('rpcenabled').checked) {
                    chrome.runtime.sendMessage({ type: "RPC_ON", data: rpc_json[activeacc.uuid], user: activeacc.uuid, auth: activeacc.token });
                }
                setTimeout(() => { modal?.querySelector('.modalerrorplaceholder')?.replaceChildren() }, 10000)
            }
            target.textContent = 'Save'
            target.disabled = false
            break;
        }
        case ('uploadrpcimg hoverexempt'): {
            const id = e.target.dataset.id
            const modal = document.getElementById(`modal-${id}`)
            if (e.shiftKey) {
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
                            modal.querySelector('.rpcimgfield').files = dataTransfer.files;
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const newimage = reader.result
                                modal.querySelector('.rpcimg').src = newimage
                            }
                            reader.readAsDataURL(modal.querySelector('.rpcimgfield').files[0])
                            return;
                        } else {
                            modal.querySelector('.modalerrorplaceholder').replaceChildren(MiniError('failure', 'No image was detected on your clipboard'))
                            setTimeout(() => { modal?.querySelector('.modalerrorplaceholder')?.replaceChildren() }, 10000)
                        }
                    }
                } catch (err) {
                    modal.querySelector('.modalerrorplaceholder').replaceChildren(MiniError('failure', 'No image was detected on your clipboard'))
                    setTimeout(() => { modal?.querySelector('.modalerrorplaceholder')?.replaceChildren() }, 10000)
                }
            } else {
                modal.querySelector('.rpcimgfield').click()
            }
            break;
        }
    }
})

document.getElementById('rpctype').addEventListener('change', function(e) {
    Array.from(document.getElementsByClassName('customrpccontrolpanel')).forEach(elem => {
        elem.querySelector('.rpcnamefield').disabled = (e.target.value == 'auto')
        elem.querySelector('.rpctitlefield').disabled = (e.target.value == 'auto')
        elem.querySelector('.rpcdescfield1').disabled = (e.target.value == 'auto')
        elem.querySelector('.rpcdescfield2').disabled = (e.target.value == 'auto')
        elem.querySelector('.rpcimgfield').disabled = (e.target.value == 'auto')
        elem.querySelector('[class="uploadrpcimg hoverexempt"]').disabled = (e.target.value == 'auto')
        elem.querySelector('.removemodal').disabled = (e.target.value == 'auto')
        elem.querySelector('.rpcsavebtn').disabled = (e.target.value == 'auto')
    })
    document.getElementById('addmodalbtn').disabled = ((e.target.value == 'auto') || (document.getElementById('rpc_modals').childElementCount > 4))
    /*
    if ((e.target.value == 'auto')) {
        if ((settings[7] == "0")) {
            OpenDisclaimerPopup()
        }
    }
    */
    rpc_json[activeacc.uuid].preference = e.target.value
    chrome.storage.local.set({rpcdata: rpc_json})
})

document.addEventListener('change', function(e) {
    if (e.target.className == 'rpcimgfield') {

    }
})