// server.js
const express = require('express');
const mariadb = require('mariadb');
const path = require('path');
const bodyParser = require('body-parser');

////
const axios = require('axios');
const OTHER_INSTANCE_IP = "http://34.135.49.177"
////


const app = express();
const port = 80;
// Create a MariaDB connection pool
const pool = mariadb.createPool({
    host: '127.0.0.1', // Use IP address to force TCP connection
    port: 3306, // Ensure this is the correct port user: 
    user: 'adish', // Replace with your MariaDB
    password: 'secret', // Replace with your MariaDB password
    database: 'bankdb', // Our database name created above
    connectionLimit: 3
});
// Set EJS as the view engine and set the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Use body-parser middleware to parse form data (if you prefer explicit usage)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        res.render('index');
    } 
    catch (err) {
        res.status(500).send(`Error retrieving customers: ${err}`);
    } 
    finally {
        if (conn) conn.release();
    }
});


//Route greeting
app.get('/greeting', async (req, res) => {
    res.send('Hello World!');
});



app.post('/register', async (req, res) => {
    console.log("Received /register request with body:", req.body);

    const username = req.body.username;
    const isSync = req.body.sync || false;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query('INSERT INTO Users(username) VALUES (?)', [username]);
    } 
    catch (err) {
        console.error('Error adding user:', err);
        return res.status(500).json({ error: 'Database Error', details: err.message });
    } 
    finally {
        if (conn) conn.release();
    }
    res.redirect('/');
    if (!isSync) {
        axios.post(`${OTHER_INSTANCE_IP}/register`, { username: username, sync: true })
            .then(() => console.log("Sync successful"))
            .catch(err => console.error(`Error syncing with second instance: ${err.message}`));
    }
});

//Route clear all Users
app.post('/clear', async (req, res) => {
    console.log("Received /clear request")

    const isSync = req.body.sync || false;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query('DELETE FROM Users');
        const Users = await conn.query('SELECT * FROM Users');
        res.send(Users)
        
    }
    catch (err) {
        console.error('Error deleting users:', err);
        return res.status(500).json({ error: 'Database Error', details: err.message });
    } 
    finally{
        if (conn) conn.release();
    }
    // res.redirect('/');
        /////
    if (!isSync) {
        console.log("Syncing with other instance")
        axios.post(`${OTHER_INSTANCE_IP}/clear`, {sync: true})
            .then(() => console.log("Sync successful"))
            .catch(err => {console.error(`Error syncing with second instance: ${err.message}`);
        });
    }
});

//Route list Users
app.get('/list', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // Get all Users from the table
        const Users = await conn.query('SELECT * FROM Users');
        const response = { users: Users.map(user => user.username) };
        res.json(response);

        conn.release();

    } 
    catch (err) {
        res.status(500).send(`Error retrieving Users: ${err}`);
    } 
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 
