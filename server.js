const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/products', (req, res) => {
    const productsPath = path.join(__dirname, 'products.txt');
    fs.readFile(productsPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const products = data.split('\n').map(line => {
            const [name, price] = line.split(',');
            return { name, price: parseFloat(price) };
        });

        res.json(products);
    });
});

app.post('/purchase', (req, res) => {
    const customerName = req.body.customerName;
    const bill = req.body.bill;
    const totalAmount = req.body.totalAmount;

    // Create a new entry for the bill
    const entry = {
        customerName,
        bill,
        totalAmount,
    };

    // Read existing bill entries or create a new array
    let billEntries = [];
    const billPath = path.join(__dirname, 'bill.json');
    if (fs.existsSync(billPath)) {
        const billContent = fs.readFileSync(billPath, 'utf8');
        billEntries = JSON.parse(billContent);
    }

    // Add the new entry to the bill
    billEntries.push(entry);

    // Write the updated bill back to the file
    fs.writeFileSync(billPath, JSON.stringify(billEntries, null, 2));

    // Create Excel sheet for the current bill
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bill');

    // Add headers to the Excel sheet
    worksheet.columns = [
        { header: 'Customer Name', key: 'customerName', width: 20 },
        { header: 'Product Name', key: 'productName', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Total', key: 'total', width: 15 },
    ];

    // Add bill entries to the Excel sheet
    billEntries.forEach(entry => {
        // Check if entry.bill is an array before attempting to iterate over it
        if (Array.isArray(entry.bill)) {
            entry.bill.forEach(product => {
                worksheet.addRow({
                    customerName: entry.customerName,
                    productName: product.productName,
                    quantity: product.quantity,
                    total: product.total
                });
            });
        }
    });

    // Save the Excel sheet
    const excelFilePath = path.join(__dirname, 'bill.xlsx');
    workbook.xlsx.writeFile(excelFilePath)
        .then(() => {
            // Clear the bill file
            fs.writeFileSync(billPath, '[]');

            res.json({ message: 'Purchase completed successfully.' });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ message: 'Error creating Excel sheet.' });
        });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});