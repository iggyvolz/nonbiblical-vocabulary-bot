import {KJV_dict as bible} from "./parsed/kjv";

const publicKey = "267a9531fc05d9862b1351bcd7db72548e6c7d5177236341f70baac3f4341024";
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

// https://github.com/discord/discord-interactions-js/blob/main/src/index.ts
// https://github.com/discord/discord-interactions-js/blob/main/src/index.ts
/**
 * Merge two arrays.
 *
 * @param {Uint8Array} arr1 - First array
 * @param {Uint8Array} arr2 - Second array
 * @returns {Uint8Array} Concatenated arrays
 */
function concatUint8Arrays(arr1, arr2) {
    const merged = new Uint8Array(arr1.length + arr2.length);
    merged.set(arr1);
    merged.set(arr2, arr1.length);
    return merged;
}

/**
 * Validates a payload from Discord against its signature and key.
 *
 * @param {string} body - The raw payload data
 * @param {string} signature - The signature from the `X-Signature-Ed25519` header
 * @param {string} timestamp - The timestamp from the `X-Signature-Timestamp` header
 * @param {string} clientPublicKey - The public key from the Discord developer dashboard
 * @returns {Promise<boolean>} Whether or not validation was successful
 */
async function verifyKey(
    body,
    signature,
    timestamp,
    clientPublicKey,
) {
    try {
        const timestampData = new TextEncoder().encode(timestamp);
        const bodyData = new TextEncoder().encode(body);
        const message = concatUint8Arrays(timestampData, bodyData);

        const signatureData = new Uint8Array(signature.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
        const publicKeyData = new Uint8Array(clientPublicKey.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
        const algorithm = {name: 'NODE-ED25519', namedCurve: 'NODE-ED25519'};
        const publicKey = await crypto.subtle.importKey("raw", publicKeyData, algorithm, true, ["verify"]);
        return await crypto.subtle.verify(algorithm, publicKey, signatureData, message);
    } catch (ex) {
        return false;
    }
}

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
    const signature = request.headers.get("X-Signature-Ed25519") ?? "";
    const timestamp = request.headers.get("X-Signature-Timestamp") ?? "";

    const bodyText = await request.text()
    if(!await verifyKey(bodyText, signature, timestamp, publicKey)) {
        return new Response("", {
            status: 400
        });
    }
    const body = JSON.parse(bodyText)
    if(body.type === 1) {
        return new Response(JSON.stringify({
            "type": 1
        }), {
            headers: {
                "Content-Type": "application/json"
            }
        })
    }
    const contents = Object.entries(body.data.resolved.messages)[0][1].content.replaceAll("[^a-zA-Z0-9- \s]", "");

    return new Response(JSON.stringify({
        "type": 4,
        "data": {
            "content": handle(contents),
            "allowed_mentions": {"parse": []}
        }
    }), {
        headers: {
            "Content-Type": "application/json"
        }
    })
}

function handle(contents) {
    /** @type {string[]} words */
    const words = contents.split(/([^A-Za-z']+)/);
    let goodWords = 0;
    let totalWords = 0;
    let msg = "";
    for(const word of words) {
        if(/([A-Za-z']+)/.test(word)) {
            totalWords++;
            if(word.toLowerCase() in bible) {
                goodWords++;
                msg += `**${word}**`;
            } else {
                msg += `~~${word}~~`;
            }
        } else {
            msg += word;
        }
    }
    const numInBible = words.filter(x => x in bible).length;
    const total = words.length;
    const pct = Math.floor(numInBible * 10000 / (Math.max(1, total))) / 100;
    return `${numInBible}/${total} (${pct}%) words from this message are in the bible: ${msg}`;
}