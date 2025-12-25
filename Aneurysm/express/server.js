const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { WebpayPlus, Options, Environment } = require('transbank-sdk');
const { IntegrationApiKeys, IntegrationCommerceCodes } = require("transbank-sdk"); // CommonJS

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

// Configuración de Webpay Plus para el ambiente de integración
const options = new Options(
    '597055555532',
    '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
    Environment.Integration
);

const webpayPlus = new WebpayPlus.Transaction(options);

app.post('/api/iniciar-transaccion', async (req, res) => {
    const { amount, sessionId, buyOrder, returnUrl } = req.body;
    console.log('Request Body:', req.body);
    try {
        const response = await webpayPlus.create(buyOrder, sessionId, amount, returnUrl);
        console.log('WebpayPlus Response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error in /api/iniciar-transaccion:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/confirmar-transaccion', async (req, res) => {
    const { token } = req.body;
    console.log('Request Body:', req.body);
    try {
        const response = await webpayPlus.commit(token);
        console.log('WebpayPlus Response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error in /api/confirmar-transaccion:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/verificar-estado', async (req, res) => {
    const { token } = req.body;
    console.log('Request Body:', req.body);
    try {
        const response = await webpayPlus.status(token);
        console.log('WebpayPlus Status Response:', response);
        res.json(response);
    } catch (error) {
        console.error('Error in /api/verificar-estado:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});