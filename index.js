import express from 'express';
import mongoose from "mongoose";

import spotsRouter from "./routes/spgames.js";
import spgames from "./routes/spgames.js";

const app = express();
mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DB_NAME}`);

//middelware voor json gegevens
app.use(express.json());

// middleware voor www-urlencoded-gegevens
app.use(express.urlencoded({ extended: true }));

//middeleware om te checken als het accept/json
app.use((req, res, next) =>
{
    if (req.header('Accept') !== 'application/json' && req.method !=="OPTIONS"){
        res.status(406).json({error: 'Only JSON is allowed as accept header'})
    }else {
        next();
    }
})



// Middleware voor Accept header validatie
const acceptJsonMiddleware = (req, res, next) => {
    if (req.headers['accept'] !== 'application/json') {
        return res.status(406).json({ error: 'Accept header must be application/json' });
    }
    next();
};

app.use(acceptJsonMiddleware);





app.use('/spgames', spgamesRouter)


app.listen(process.env.EXPRESS_PORT, () => {
    console.log(`Server is gestart ${process.env.EXPRESS_PORT}`);
});