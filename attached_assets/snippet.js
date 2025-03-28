
    import { MercadoPagoConfig, Payment } from 'mercadopago';

    const client = new MercadoPagoConfig({ accessToken: 'YOUR_ACCESS_TOKEN' });
    
    const payment = new Payment(client);
    payment.create({ body: req.body })
    .then(console.log)
    .catch(console.log);
    
    import { MercadoPagoConfig, Payment } from 'mercadopago';

    const client = new MercadoPagoConfig({ accessToken: 'YOUR_ACCESS_TOKEN' });

    const payment = new Payment(client);
    payment.create({ body: req.body })
    .then(console.log)
    .catch(console.log);
    