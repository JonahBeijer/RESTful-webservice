import express from 'express';
import mongoose from "mongoose";


const app = express();
// mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DB_NAME}`);

//middelware voor json gegevens
app.use(express.json());

// middleware voor www-urlencoded-gegevens
app.use(express.urlencoded({ extended: true }));


app.get('/', (reg, res) =>{
    res.send( {message:'Goedemorgen!!!!!!!!!!!!!!!!!!!!'})
})

app.listen(process.env.EXPRESS_PORT, () => {
    console.log('server is gestart');
});