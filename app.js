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

// Function to load data from remote URL
async function loadData() {
    const url = "https://robust-violet-camel.myfilebase.com/ipfs/QmWuoZ7UW4aBCkUEykCQ8i6G7JFzLbE3S85f2VvYTjxi7y";

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        airbnbData = await response.json();
        console.log("Data successfully loaded from remote URL.");
    } catch (error) {
        console.error("Error fetching data:", error);
        airbnbData = [];
    }
}

// Load data and then start the server
loadData().then(() => {
    console.log("Data loaded, starting server...");
}).catch((error) => {
    console.error("Failed to load data:", error);
    airbnbData = [];
});

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
app.get('/allData', (req, res) => {
    async function loadData() {
        const url = "https://robust-violet-camel.myfilebase.com/ipfs/QmWuoZ7UW4aBCkUEykCQ8i6G7JFzLbE3S85f2VvYTjxi7y";
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            airbnbData = await response.json();
            console.log("Data successfully loaded from remote URL.");
        } catch (error) {
            console.error("Error fetching data:", error);
            airbnbData = [];
        }
        const selectedData = airbnbData.slice(0, 100);
        res.render('pages/allData', { title: 'All Airbnb Data', data: selectedData });
    }
    loadData();
});

// Route to get data by index
app.get('/allData/:index', (req, res) => {
    const index = parseInt(req.params.index);
    if (!isNaN(index) && index >= 0 && index < airbnbData.length) {
        const selectedData = [airbnbData[index]];
        res.render('pages/searchIndex', { title: 'Search Property by Index', data: selectedData });
    } else {
        res.status(400).send("Invalid index!");
    }
});


// Route to search by property ID
app.get('/search/id', query('id')
    .isNumeric().withMessage('Property ID must be a number'), (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/searchID', {
                title: 'Search by ID', id: "", data: [], errors: errors.array()
            });
        }

        const id = req.query.id;
        const found = airbnbData.find(p => p.id == id);
        res.render('pages/searchID', { title: 'Search by ID', id, data: found });
    });


// Route to search by property name
app.get('/search/name', query('name')
    .notEmpty().withMessage('Property name is required'), (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('pages/searchName', {
                title: 'Search by Name', errors: errors.array()
            });
        }

        const name = req.query.name ? req.query.name.trim().toLowerCase() : "";

        let found = [];
        if (name) {
            found = airbnbData.filter(p => p.NAME && p.NAME.trim().toLowerCase().includes(name)
            );
        }

        res.render('pages/searchName', {
            title: 'Search by Property Name', searchName: req.query.name || "", data: found
        });
    });


// Route to view all Airbnb data
app.get('/viewData', (req, res) => {
    res.render('pages/viewData', { title: 'View All Airbnb Filled Data', data: airbnbData });
});

// Route to highlight rows with missing service fees
app.get('/viewData/clean', (req, res) => {
    res.render('pages/viewDataClean', { title: 'View All Airbnb Highlighted Data', data: airbnbData });
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
    (req, res) => {
        const errors = validationResult(req);
        let found = [];

        if (req.query.min && req.query.max && errors.isEmpty()) {
            const min = parseFloat(req.query.min);
            const max = parseFloat(req.query.max);

            found = airbnbData.filter((p) => {
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
