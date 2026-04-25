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

// ✅ Health Check
app.get('/', (req, res) => {
    res.json({ status: "API Online", message: "MonsterWaku Bridge is active" });
});

// ✅ Pairing - GET /api/pair?no=628xxx&name=dev_xxx
app.get('/api/pair', async (req, res) => {
    const nomor = req.query.no;
    const deviceName = req.query.name || 'DEV-' + nomor; 

    if (!nomor) return res.status(400).json({ error: "Nomor WhatsApp wajib diisi." });
    if (!process.env.WA_TOKEN) return res.status(500).json({ error: "WA_TOKEN belum diset di Vercel." });

    try {
        // 1. Create device
        const reqCreate = await fetch(`${BASE_URL}/wa-accounts`, {
            method: 'POST', 
            headers: getHeaders(),
            body: JSON.stringify({ name: deviceName })
        });
        const createData = await reqCreate.json();
        
        const deviceId = createData.id || createData.data?.id || createData.uuid;
        if (!deviceId) return res.status(400).json({ error: "Gagal membuat sesi", detail: createData });

        await delay(1500); 

        // 2. Get pairing code
        const reqPair = await fetch(`${BASE_URL}/wa-accounts/${deviceId}/code?phone=${nomor}`, {
            method: 'GET', 
            headers: getHeaders()
        });
        const pairData = await reqPair.json();

        res.json({ 
            success: true,
            pairingCode: pairData.code || pairData.data?.code,
            code: pairData.code || pairData.data?.code, // ✅ Tambah field 'code' juga
            device_id: deviceId,
            full_response: pairData 
        });

    } catch (error) {
        console.error('Pair error:', error);
        res.status(500).json({ error: "Gangguan Gateway API", detail: error.message });
    }
});

// ✅ Get Devices - GET /api/devices
app.get('/api/devices', async (req, res) => {
    try {
        const response = await fetch(`${BASE_URL}/wa-accounts`, {
            method: 'GET',
            headers: getHeaders()
        });
        const data = await response.json();
        
        // ✅ Format response agar sesuai frontend
        const devices = Array.isArray(data) ? data : (data.data || data.accounts || []);
        
        res.json({
            ok: true,
            data: devices,
            items: devices,
            meta: { total: devices.length }
        });
    } catch (error) {
        console.error('Devices error:', error);
        res.status(500).json({ error: "Gagal mengambil data", detail: error.message });
    }
});

// ✅ Change Mode - PATCH /api/wa-accounts/:id/mode
app.patch('/api/wa-accounts/:id/mode', async (req, res) => {
    const deviceId = req.params.id;
    const { mode } = req.body;

    if (!mode) return res.status(400).json({ error: "Mode wajib diisi" });

    try {
        const response = await fetch(`${BASE_URL}/wa-accounts/${deviceId}/mode`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ mode })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error || data.message || "Gagal change mode" 
            });
        }

        res.json({
            success: true,
            mode: mode,
            data: data
        });

    } catch (error) {
        console.error('Mode error:', error);
        res.status(500).json({ error: "Gagal change mode", detail: error.message });
    }
});

// ✅ Alternative: GET /api/mode?id=xxx&mode=xxx (untuk kompatibilitas)
app.get('/api/mode', async (req, res) => {
    const deviceId = req.query.id;
    const mode = req.query.mode;

    if (!deviceId || !mode) {
        return res.status(400).json({ error: "id dan mode wajib diisi" });
    }

    try {
        const response = await fetch(`${BASE_URL}/wa-accounts/${deviceId}/mode`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ mode })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error || data.message || "Gagal change mode" 
            });
        }

        res.json({
            success: true,
            mode: mode,
            data: data
        });

    } catch (error) {
        console.error('Mode error:', error);
        res.status(500).json({ error: "Gagal change mode", detail: error.message });
    }
});

// ✅ Delete Device - DELETE /api/wa-accounts/:id
app.delete('/api/wa-accounts/:id', async (req, res) => {
    const deviceId = req.params.id;

    try {
        const response = await fetch(`${BASE_URL}/wa-accounts/${deviceId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        const data = await response.json();
        
        res.json({
            success: response.ok,
            data: data
        });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: "Gagal hapus device", detail: error.message });
    }
});

module.exports = app;
