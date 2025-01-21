import mongoose from "mongoose";

const spgameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    body: { type: String, required: true },
    date: { type: String, required: true },
    _links: {
        self: { href: String },
        collection: { href: String },
    },
});

// Virtuele functie voor het genereren van de self link
spgameSchema.virtual('selfHref').get(function () {
    return `http://145.24.223.60:8001/spgames/${this._id}`;
});

// Zorg ervoor dat virtuele velden beschikbaar zijn bij JSON-output
spgameSchema.set('toJSON', {
    virtuals: true, // Zorgt ervoor dat virtuele velden worden toegevoegd
    transform: (doc, ret) => {
        // Voeg de self.href link toe aan het _links object
        ret._links = {
            self: { href: ret.selfHref },
            collection: { href: "http://145.24.223.60:8001/spgames" },
        };
        delete ret._id; // Verwijder _id als je dat niet in de output wilt
        delete ret.__v; // Verwijder interne versieing van Mongoose
        delete ret.selfHref; // Verwijder het virtuele veld zelf
        return ret;
    },
});

const Spgame = mongoose.model('Spgame', spgameSchema);
export default Spgame;