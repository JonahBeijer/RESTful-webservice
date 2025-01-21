import express from "express";
import {faker} from "@faker-js/faker";
import SpgameModel from "../models/Spgame.js";
import mongoose from "mongoose";

const router = express.Router();

// Middleware om alleen requests met Accept: application/json toe te staan
const acceptJsonMiddleware = (req, res, next) => {
    if (req.headers['accept'] !== 'application/json') {
        return res.status(406).json({error: 'Accept header must be application/json'});
    }
    next();
};
router.use(acceptJsonMiddleware);

const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Sta toegang toe van alle domeinen
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
};

// Voeg de middleware toe voor alle routes
router.use(corsMiddleware);

// OPTIONS voor de / route
router.options('/', (req, res) => {
    res.header('Allow', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send();
});

router.options('/:id', async (req, res) => {
    const spgameId = req.params.id;

    // Optioneel: controleer of de resource bestaat in de database (bijvoorbeeld via een GET- of findById-query)
    const spgame = await SpgameModel.findById(spgameId);

    // Als de resource niet bestaat, stuur dan een 404 Not Found-status
    if (!spgame) {
        return res.status(404).json({ error: 'Spgame not found' });
    }

    // Hier geef je de toegestane methoden voor de specifieke resource weer
    res.header('Allow', 'GET, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization' );
    res.status(204).send();  // Geen inhoud, alleen de headers met toegestane methoden
});


router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Controleer of het ID een geldig MongoDB ObjectId is
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ObjectId format' });
        }

        // Zoek de spgame in de database en verwijder het
        const spgame = await SpgameModel.findByIdAndDelete(id);

        // Als de spgame niet gevonden is, geef een 404 fout
        if (!spgame) {
            return res.status(404).json({ error: 'Spgame not found' });
        }

        // Geef een succesvolle response terug zonder body (status 204)
        res.status(204).send();
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'An error occurred while deleting the spgame' });
    }
});


// GET route voor het ophalen van spgames met paginering

router.get('/', async (req, res) => {
    try {
        const baseUrl = "http://145.24.223.60:8001/spgames";

        // Stel standaardwaarden in
        const page = 1; // Altijd pagina 1
        const limit = await SpgameModel.countDocuments(); // Stel limit gelijk aan alle items
        const skip = (page - 1) * limit;

        const spgames = await SpgameModel.find().skip(skip).limit(limit);
        const totalItems = spgames.length;
        const totalPages = 1; // Altijd 1 pagina
        const currentItems = spgames.length;

        // Items met de juiste _links-structuur
        const items = spgames.map((spgame) => ({
            id: spgame._id,
            title: spgame.title,
            body: spgame.body,
            date: spgame.date,
            _links: {
                self: {href: `${baseUrl}/${spgame._id}`},
                collection: {href: `${baseUrl}/`},
            },
        }));

        // Paginering links met de juiste structuur
        const pagination = {
            currentPage: page,
            currentItems: currentItems,
            totalPages: totalPages,
            totalItems: totalItems,
            _links: {
                first: {
                    page: 1,
                    href: `${baseUrl}?page=1&limit=${limit}`,
                },
                last: {
                    page: 1,
                    href: `${baseUrl}?page=1&limit=${limit}`,
                },
                previous: null,
                next: null,
            },
        };

        // Algemene _links structuur
        const _links = {
            self: {href: `${baseUrl}/`},
        };

        // JSON response met de juiste structuur
        res.setHeader('Content-Type', 'application/json');
        res.json({
            items,
            _links,
            pagination,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({error: e.message});
    }
});

// Functie om de Spgame data te formatteren met de juiste structuur
const formatSpgame = (spgame) => ({
    id: spgame._id,
    title: spgame.title,
    body: spgame.body,
    date: spgame.date,
    _links: {
        self: {href: `http://145.24.223.60:8001/spgames/${spgame._id}`}, // Link naar specifieke resource
        collection: {href: "http://145.24.223.60:8001/spgames"}, // Link naar de collectie
    },
});
router.post('/', async (req, res) => {
    try {
        // Verkrijg de formuliervelden
        const {title, body, date} = req.body;

        // Valideer de velden (bijvoorbeeld, controleer of ze bestaan)
        if (!title || !body || !date) {
            return res.status(400).json({error: 'All fields are required'});
        }

        // Maak een nieuw Spgame-object
        const newSpgame = new SpgameModel({
            title,
            body,
            date,
        });

        // Sla het object op in de database
        await newSpgame.save();

        // Stel de base URL in voor de links
        const baseUrl = "http://145.24.223.60:8001/spgames";

        // Verzend de JSON-response met de juiste links en de Location header
        res.setHeader('Location', `${baseUrl}/${newSpgame._id}`);
        res.status(201).json({
            id: newSpgame._id,
            title: newSpgame.title,
            body: newSpgame.body,
            date: newSpgame.date,
            _links: {
                self: {href: `${baseUrl}/${newSpgame._id}`},
                collection: {href: baseUrl},
            }
        });
    } catch (e) {
        res.status(500).json({error: 'Error creating Spgame'});
    }
});

router.put('/:id', async (req, res) => {
    try {
        // Verkrijg de resource ID en de nieuwe gegevens van de request body
        const { title, body, date } = req.body;
        const spgameId = req.params.id;

        // Valideer de velden (controleer of ze bestaan)
        if (!title || !body || !date) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Zoek de Spgame resource op basis van de id
        const spgame = await SpgameModel.findById(spgameId);

        // Controleer of de resource bestaat
        if (!spgame) {
            return res.status(404).json({ error: 'Spgame not found' });
        }

        // Werk de gegevens bij
        spgame.title = title;
        spgame.body = body;
        spgame.date = date;

        // Sla de bijgewerkte resource op in de database
        await spgame.save();

        // Verzend een succesvolle respons met de bijgewerkte gegevens
        res.status(200).json({
            message: 'Spgame updated successfully',
            spgame: {
                id: spgame._id,
                title: spgame.title,
                body: spgame.body,
                date: spgame.date,
                _links: {
                    self: { href: `http://145.24.223.60:8001/spgames/${spgame._id}` },
                    collection: { href: "http://145.24.223.60:8001/spgames" },
                }
            }
        });
    } catch (e) {
        // Afhandeling van fout bij serverfouten
        console.error(e);
        res.status(500).json({ error: 'Error updating Spgame' });
    }
});



// GET route voor een specifieke spgame
router.get('/:id', async (req, res) => {
    try {
        const {id} = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({error: 'Invalid ObjectId format'});
        }

        const spgame = await SpgameModel.findById(id);

        if (!spgame) {
            return res.status(404).json({error: 'Spgame not found'});
        }

        res.setHeader('Content-Type', 'application/json');
        res.json({

            id: spgame._id,
            title: spgame.title,
            body: spgame.body,
            date: spgame.date,
            _links: {
                self: {href: `http://145.24.223.60:8001/spgames/${spgame._id}`},
                collection: {href: "http://145.24.223.60:8001/spgames"},
            },

        });
    } catch (e) {
        res.status(500).json({message: 'An error occurred while fetching the spgame details'});
    }
});

// Seed route voor dummy data
router.post('/seed', async (req, res) => {
    try {
        await SpgameModel.deleteMany({});

        for (let i = 0; i < 30; i++) {
            const spgame = new SpgameModel({
                title: faker.commerce.productName(),
                body: faker.lorem.sentence(),
                date: faker.date.recent().toISOString(),
            });

            await spgame.save();
        }

        res.json({message: 'Created dummy data'});
    } catch (e) {
        res.status(500).json({error: 'Error seeding data'});
    }
});

export default router;