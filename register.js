// Call with the arguments: applicationid, botToken
const [
    _,
    __,
    applicationId,
    botToken
] = process.argv;
fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bot ${botToken}`
    },
    method: "POST",
    body: JSON.stringify({
        name: "Nonbibilical Vocabulary",
        type: 3
    })
}).then(x => x.text()).then(x => console.log(x))
