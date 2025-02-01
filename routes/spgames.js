import express from "express";
import {faker} from "@faker-js/faker";
import SpgameModel from "../models/Spgame.js";
import mongoose from "mongoose";

const router = express.Router();

//middleware controleert of de aanvraag JSON accepteert; zo niet, stuurt het een foutmelding terug.
const acceptJsonMiddleware = (req, res, next) => {
    if (req.headers['accept'] !== 'application/json' && req.method !== "OPTIONS") {
        return res.status(406).json({error: 'Accept header must be application/json'});
    }
    next();
};
router.use(acceptJsonMiddleware);


//De server staat aanvragen van andere websites toe door headers toe te voegen die toegang, methoden en toegestane headers specificeren
const corsMiddleware = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Sta toegang toe van alle domeinen
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
};


router.use(corsMiddleware);

//De route verwerkt OPTIONS-aanvragen door de toegestane methoden en headers terug te sturen en een lege reactie met status 204 te geven.
router.options('/', (req, res) => {
    res.header('Allow', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send();
});

//De route verwerkt OPTIONS-aanvragen voor een specifieke id en haalt die id uit de URL-parameters.
router.options('/:id', async (req, res) => {
    const spgameId = req.params.id;

    // Controleert of de resource bestaat in de database
    const spgame = await SpgameModel.findById(spgameId);

    // Als de resource niet bestaat, stuur dan een 404 Not Found-status
    if (!spgame) {
        return res.status(404).json({ error: 'Spgame not found' });
    }

    // Hier geef je de toegestane methoden voor de specifieke resource weer
    res.header('Allow', 'GET, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization' );
    res.status(204).send();  // Geen inhoud, alleen de headers met toegestane methoden
});


//De route verwerkt DELETE-aanvragen voor een specifieke id en haalt die id uit de URL-parameters om de bijbehorende gegevens te verwijderen
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

// PATCH route voor gedeeltelijke update van een specifieke spgame
router.patch('/:id', async (req, res) => {
    try {
        const { title, body, date, img_url, review } = req.body;
        const spgameId = req.params.id;

        // Zoek de Spgame resource op basis van de id
        const spgame = await SpgameModel.findById(spgameId);

        // Controleer of de resource bestaat
        if (!spgame) {
            return res.status(404).json({ error: 'Spgame not found' });
        }

        // Werk alleen de velden bij die zijn meegegeven in de request
        if (title) spgame.title = title;
        if (body) spgame.body = body;
        if (date) spgame.date = date;
        if (img_url) spgame.img_url = img_url;
        if (review) spgame.review = review;

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
                img_url: spgame.img_url,
                review: spgame.review,
                _links: {
                    self: { href: `http://145.24.223.60:8001/spgames/${spgame._id}` },
                    collection: { href: "http://145.24.223.60:8001/spgames" },
                }
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error updating Spgame' });
    }
});


// GET route voor het ophalen van spgames met paginering

router.get('/', async (req, res) => {
    try {
        const baseUrl = "http://145.24.223.60:8001/spgames";

        // Verkrijg de page en limit parameters uit de querystring, standaard naar 1 en 20
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 20;

        // Bereken het totaal aantal items
        const totalItems = await SpgameModel.countDocuments();

        // Als geen page en limit in de querystring staan, haal alles op zonder paginering
        let spgames;
        let currentItems = totalItems;
        let totalPages = 1;

        if (req.query.page && req.query.limit) {
            // Bereken het aantal pagina's
            totalPages = Math.ceil(totalItems / limit);

            // Controleer of de page binnen het bereik ligt
            if (page < 1 || page > totalPages) {
                return res.status(400).json({ error: 'Page number out of range' });
            }

            // Haal de gespecificeerde hoeveelheid items op met de limiet en offset
            const skip = (page - 1) * limit;
            spgames = await SpgameModel.find().skip(skip).limit(limit);
            currentItems = spgames.length;
        } else {
            // Als geen paginering is ingesteld, haal dan alles op zonder limit
            spgames = await SpgameModel.find();
            totalPages = 1; // Zet totaal aantal pagina's naar 1 als er geen paginering is
        }

        // Maak de items array met links
        const items = spgames.map((spgame) => ({
            id: spgame._id,
            title: spgame.title,
            body: spgame.body,
            date: spgame.date,
            img_url: spgame.img_url,
            review: spgame.review,
            _links: {
                self: { href: `${baseUrl}/${spgame._id}` },
                collection: { href: `${baseUrl}/` },
            },
        }));

        // Maak de paginering links
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
                    page: totalPages,
                    href: `${baseUrl}?page=${totalPages}&limit=${limit}`,
                },
                previous: page > 1 ? {
                    page: page - 1,
                    href: `${baseUrl}?page=${page - 1}&limit=${limit}`,
                } : null,
                next: page < totalPages ? {
                    page: page + 1,
                    href: `${baseUrl}?page=${page + 1}&limit=${limit}`,
                } : null,
            },
        };

        // Als geen paginering was, moeten de links correct zijn zonder limit en page
        if (!req.query.page && !req.query.limit) {
            pagination._links = {
                first: {
                    page: 1,
                    href: `${baseUrl}`,
                },
                last: {
                    page: 1,
                    href: `${baseUrl}`,
                },
                previous: null,
                next: null,
            };
        }

        // Maak de algemene _links structuur
        const _links = {
            self: { href: `${baseUrl}/` },
        };

        // Geef de JSON response terug
        res.setHeader('Content-Type', 'application/json');
        res.json({
            items,
            _links,
            pagination,
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});


// Functie om de Spgame data te formatteren met de juiste structuur

router.post('/', async (req, res) => {
    try {
        // Verkrijg de formuliervelden
        const {title, body, date, img_url, review} = req.body;

        // Valideer de velden (bijvoorbeeld, controleer of ze bestaan)
        if (!title || !body || !img_url || !date || !review) {
            return res.status(400).json({error: 'All fields are required'});
        }

        // Stel de datum in als het niet is opgegeven
        const currentDate = date || new Date();

        // Maak een nieuw Spgame-object
        const newSpgame = new SpgameModel({
            title,
            body,
            date: currentDate,
            img_url,
            review
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
            img_url: newSpgame.img_url,
            review: newSpgame.review,
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
        const { title, body, date, img_url, review } = req.body;
        const spgameId = req.params.id;

        // Valideer de velden (controleer of ze bestaan)
        if (!title || !body || !date || !img_url || !review ) {
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
        spgame.img_url = img_url;
        spgame.review = review;


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
                img_url: spgame.img_url,
                review: spgame.review,
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
            img_url: spgame.img_url,
            review: spgame.review,
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
                date: faker.date.recent(),
                img_url: faker.image.url({ width: 640, height: 480, category: 'games' }),
                review: faker.lorem.sentence(),
            });

            await spgame.save();
        }

        res.json({message: 'Created dummy data'});
    } catch (e) {
        res.status(500).json({error: 'Error seeding data'});
    }
});

export default router;