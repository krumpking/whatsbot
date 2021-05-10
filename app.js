const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');

const port = process.env.PORT || 4200
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));




const SESSION_FILE_PATH = './session.json';
const QR_FILE_PATH = './qr.txt';


let client;

let sessionData;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
    client = new Client({
        session: sessionData
    });
} else {
    client = new Client();
}


client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    if(fs.existsSync(QR_FILE_PATH)) {
        fs.unlinkSync(QR_FILE_PATH);
    }
    fs.writeFile(QR_FILE_PATH, qr, function (err) {
        if (err) {
            console.error(err);
        }
    });
    qrcode.generate(qr, {small: true});
});

client.on('message', message => {
	console.log(message.body, message.from);
    //message.reply('Ok')
});




client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('authenticated', (session) => {

    console.log('Auth saving')
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', ()=> {
    console.log('Auth failure occured')
})

client.on('disconnected', (reason)=>{
    console.log('Disconnected', reason)
})


client.initialize();







app.get('/ping', (req, res) =>{
    res.json('pong')
})

app.get('/client_qr', (req, res) =>{
    if(fs.existsSync(QR_FILE_PATH)) {
        res.json({status: 'success', data: fs.readFileSync(QR_FILE_PATH).toString()})
    } else {
        res.json({status: 'error', message:'qr not generated/found'})
    }
})


app.get('/kill_session', (req, res) => {
    client.destroy();
    if(fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlinkSync(SESSION_FILE_PATH);
    }
    if(fs.existsSync(SESSION_FILE_PATH)) {
        res.json({status:'error', message: 'Unable to kill session try a hard cleanup / restart'})
    } else {       
        res.json({status:'success', message: 'Session killed succefuly'})
    }
})

app.get('/resume_session', (req, res) => {
    if(fs.existsSync(SESSION_FILE_PATH)) {
        client.initialize();
        client.on('ready', () => {
            console.log('Client is ready again!');
            res.json({status:'success', message: 'client resumed'})
        });
    } else {
        res.json({status:'error', message: 'Unknown error occured while resuming client'})
    }
})



app.post('/send_message', (req, res)=> {
    const {content, phoneNumber} = req.body;
    client.sendMessage(`91${phoneNumber}@c.us`,  `${content}`)
    res.json({status: 'success', message:'queued'})
})


app.listen(port, ()=>{
    console.log(`listening on http://localhost:${port}`);
});