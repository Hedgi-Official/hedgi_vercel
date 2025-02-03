import express from 'express';
import path from 'path';

const app = express();
app.use(express.static('client/public'));

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/public/index.html'));
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});