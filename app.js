/********************************************************************************* 
 * * ITE5315 – Assignment 2 
 * * I declare that this assignment is my own work in accordance with Humber Academic Policy. 
 * * No part of this assignment has been copied manually or electronically from any other source 
 * * (including web sites) or distributed to other students.
 * * Name: Thabotharan Balachandran
 * * Student ID: N01674899
 * * Date: 2025-10-28
 * * ********************************************************************************/

// Importing required modules
const express = require('express');// Express framework
const path = require('path');// For handling file paths
const fs = require('fs');// For file system operations
const { engine } = require('express-handlebars');// Handlebars view engine
const { body, query, validationResult } = require('express-validator');// For input validation
const port = process.env.port || 3000;// Setting the port
const { get } = require("http");// For fetching data

const app = express();// Creating an Express application

// Setting up Handlebars as the view engine
app.engine('.hbs', engine({
    // Defining custom helpers
    helpers: {
        serviceFeeValue: function (fee) {
            if (!fee || fee.trim() === "") {
                return "0";
            }
            return fee;
        },
        highlightRow: function (fee) {
            if (!fee || fee.trim() === "") {
                return "background-color: beige; font-weight: bold;";
            }
            return '';
        }
    },
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials')
}));

// Setting view engine and views directory
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Loading Airbnb data from local JSON file
// let airbnbData = fs.readFileSync(path.join(__dirname, 'data', 'airbnb_with_photos.json'));
// airbnbData = JSON.parse(airbnbData);

// Load data before starting the server
let airbnbData = [];
let selectedData = [];

// Function to load data from remote URL
async function getAirbnbData() {
    const base = "https://cdn.jsdelivr.net/gh/balathabo1996/Airbnb-JSON/";
    const indexUrl = base + "index.json";

    // Fetch index file
    const index = await (await fetch(indexUrl)).json();

    // Load all part files in parallel
    const parts = await Promise.all(
        index.parts.map((file) => fetch(base + file).then((r) => r.json()))
    );

    // Merge all arrays into one dataset
    return parts.flat();
}

// Defining routes and their handlers

// Home route
app.get('/', function (req, res) {
    res.render('index', { title: 'Express' });
});

// Example route for users
app.get('/users', function (req, res) {
    res.send('respond with a resource');
});


// Route to get 100 data
app.get('/allData', async (req, res) => {
    selectedData = await getAirbnbData();
    res.render('pages/allData', { title: 'All Airbnb Data', data: selectedData });
});

// Route to get data by index
app.get('/allData/:index', async (req, res) => {
    selectedData = await getAirbnbData();
    const index = parseInt(req.params.index);
    if (!isNaN(index) && index >= 0 && index < selectedData.length) {
        selectedData = [selectedData[index]];
        res.render('pages/searchIndex', { title: 'Search Property by Index', data: selectedData });
    } else {
        res.status(400).send("Invalid index!");
    }
});

// Route to search by property ID
app.get('/search/id', query('id')
    .isNumeric().withMessage('Property ID must be a number'), async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/searchID', {
                title: 'Search by ID', id: "", data: [], errors: errors.array()
            });
        }
        selectedData = await getAirbnbData();
        const id = req.query.id;
        const found = selectedData.find(p => p.id == id);
        res.render('pages/searchID', { title: 'Search by ID', id, data: found });
    });


// Route to search by property name
app.get('/search/name', query('name')
    .notEmpty().withMessage('Property name is required'), async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/searchName', {
                title: 'Search by Name', errors: errors.array()
            });
        }

        const name = req.query.name ? req.query.name.trim().toLowerCase() : "";
        selectedData = await getAirbnbData();

        let found = [];
        if (name) {
            found = selectedData.filter(p => p.NAME && p.NAME.trim().toLowerCase().includes(name)
            );
        }

        res.render('pages/searchName', {
            title: 'Search by Property Name', searchName: req.query.name || "", data: found
        });
    });


// Route to view all Airbnb data
app.get('/viewData', async (req, res) => {
    selectedData = await getAirbnbData();
    res.render('pages/viewData', { title: 'View All Airbnb Filled Data', data: selectedData });
});

// Route to highlight rows with missing service fees
app.get('/viewData/clean', async (req, res) => {
    selectedData = await getAirbnbData();
    res.render('pages/viewDataClean', { title: 'View All Airbnb Highlighted Data', data: selectedData });
});

// Route to filter by price range
app.get('/viewData/price',
    [
        query("min")
            .notEmpty()
            .withMessage("Minimum price is required")
            .isNumeric()
            .withMessage("Minimum price must be a number")
            .trim()
            .escape(),
        query("max")
            .notEmpty()
            .withMessage("Maximum price is required")
            .isNumeric()
            .withMessage("Maximum price must be a number")
            .trim()
            .escape(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        let found = [];

        if (req.query.min && req.query.max && errors.isEmpty()) {
            const min = parseFloat(req.query.min);
            const max = parseFloat(req.query.max);
            selectedData = await getAirbnbData();

            found = selectedData.filter((p) => {
                const price = parseFloat((p.price || "0").replace(/[^0-9.]/g, ""));
                return price >= min && price <= max;
            });
        }

        res.render("pages/viewPrice", {
            title: "Search by Price Range",
            min: req.query.min || "",
            max: req.query.max || "",
            data: found,
            errors: errors.array(),
        });
    }
);

// Catch-all route for handling 404 errors
app.all(/.*/, (req, res) => {
    res.status(404).render('error', { title: 'Error', message: 'Wrong Route!' });
});

// Starting the server
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
});
