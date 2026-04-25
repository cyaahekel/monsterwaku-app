const express = require('express');
const fetch = require('node-fetch'); 
const cors = require('cors'); 
const app = express();

app.use(cors()); 
app.use(express.json());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getHeaders = () => ({
    'accept': 'application/json, text/plain, */*',
    'authorization': process.env.WA_TOKEN,
    'content-type': 'application/json',
    'sec-ch-ua-platform': '"Android"',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36'
});

const BASE_URL = 'https://monsterwaku.com/api';

app.get('/', (req, res) => {
    res.json({ status: "API Online", message: "MonsterWaku Bridge is active" });
});

app.get('/api/pair', async (req, res) => {
    const nomor = req.query.no;
    const deviceName = req.query.name || 'DEV-' + nomor; 

    if (!nomor) return res.status(400).json({ error: "Nomor WhatsApp wajib diisi." });
    if (!process.env.WA_TOKEN) return res.status(500).json({ error: "WA_TOKEN belum diset di Vercel." });

    try {
        const reqCreate = await fetch(`${BASE_URL}/wa-accounts`, {
            method: 'POST', 
            headers: getHeaders(),
            body: JSON.stringify({ name: deviceName })
        });
        const createData = await reqCreate.json();
        
        const deviceId = createData.id || createData.data?.id || createData.uuid;

        if (!deviceId) return res.status(400).json({ error: "Gagal membuat sesi", detail: createData });

        await delay(1500); 

        const reqPair = await fetch(`${BASE_URL}/wa-accounts/${deviceId}/code?phone=${nomor}`, {
            method: 'GET', 
            headers: getHeaders()
        });
        const pairData = await reqPair.json();

        res.json({ 
            success: true,
            pairingCode: pairData.code || pairData.data?.code,
            device_id: deviceId,
            full_response: pairData 
        });

    } catch (error) {
        res.status(500).json({ error: "Gangguan Gateway API", detail: error.message });
    }
});

app.get('/api/devices', async (req, res) => {
    try {
        const response = await fetch(`${BASE_URL}/wa-accounts`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Gagal mengambil data" });
    }
});

module.exports = app;
