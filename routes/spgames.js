import express from "express";
import { faker } from "@faker-js/faker";
import SpgameModel from "../models/Spgame.js";
import mongoose from "mongoose";

const router = express.Router();

// Middleware om alleen requests met Accept: application/json toe te staan
const acceptJsonMiddleware = (req, res, next) => {
    if (req.headers['accept'] !== 'application/json') {
        return res.status(406).json({ error: 'Accept header must be application/json' });
    }
    next();
};
router.use(acceptJsonMiddleware);

// OPTIONS voor de / route
router.options('/', (req, res) => {
    res.header('Allow', 'GET, POST, OPTIONS');
    res.status(204).send();
});

// GET route voor het ophalen van spgames met paginering

router.get('/', async (req, res) => {
    try {
        const baseUrl = "http://145.24.223.60:8001/spgames";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const spgames = await SpgameModel.find().skip(skip).limit(limit);
        const totalItems = await SpgameModel.countDocuments();
        const totalPages = Math.ceil(totalItems / limit);
        const currentItems = spgames.length;

        // Items met de juiste _links structuur
        const items = spgames.map((spgame) => ({
            id: spgame._id,
            title: spgame.title,
            body: spgame.body,
            date: spgame.date,
            _links: {
                self: { href: `${baseUrl}/${spgame._id}` },
                collection: { href: `${baseUrl}/` },
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
                    page: totalPages,
                    href: `${baseUrl}?page=${totalPages}&limit=${limit}`,
                },
                previous: page > 1
                    ? {
                        page: page - 1,
                        href: `${baseUrl}?page=${page - 1}&limit=${limit}`,
                    }
                    : null,
                next: page < totalPages
                    ? {
                        page: page + 1,
                        href: `${baseUrl}?page=${page + 1}&limit=${limit}`,
                    }
                    : null,
            },
        };

        // Algemene _links structuur
        const _links = {
            self: { href: `${baseUrl}/` },
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
        res.status(500).json({ error: e.message });
    }
});


// GET route voor een specifieke spgame
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ObjectId format' });
        }

        const spgame = await SpgameModel.findById(id);

        if (!spgame) {
            return res.status(404).json({ error: 'Spgame not found' });
        }

        res.setHeader('Content-Type', 'application/json');
        res.json({

                id: spgame._id,
                title: spgame.title,
                body: spgame.body,
                date: spgame.date,
                _links: {
                    self: { href: `http://145.24.223.60:8001/spgames/${spgame._id}` },
                    collection: { href: "http://145.24.223.60:8001/spgames" },
                },

        });
    } catch (e) {
        res.status(500).json({ message: 'An error occurred while fetching the spgame details' });
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

        res.json({ message: 'Created dummy data' });
    } catch (e) {
        res.status(500).json({ error: 'Error seeding data' });
    }
});

export default router;
