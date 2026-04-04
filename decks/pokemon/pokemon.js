/* decks/pokemon.js */
window.DECK_POKEMON = {
    name: "Pokémon",
    properties: [
        { key: 'atq', label: 'Ataque', prefix: '', suffix: 'pts', decimal: 0 },
        { key: 'def', label: 'Defesa', prefix: '', suffix: 'pts', decimal: 0 },
        { key: 'vel', label: 'Velocidade', prefix: '', suffix: 'pts', decimal: 0 },
        { key: 'alt', label: 'Altura', prefix: '', suffix: 'm', decimal: 1 },
        { key: 'pes', label: 'Peso', prefix: '', suffix: 'kg', decimal: 1 },
        { key: 'pop', label: 'Popularidade', prefix: '', suffix: 'pts', decimal: 0 }
    ],
    cards: [
        {
            id: "1-A",
            name: "Charizard",
            category: "1-A",
            superTrunfo: false,
            properties: { atq: 84, def: 78, vel: 100, alt: 1.7, pes: 90.5, pop: 100 }
        },
        {
            id: "1-B",
            name: "Oddish",
            category: "1-B",
            superTrunfo: false,
            properties: { atq: 50, def: 55, vel: 30, alt: 0.5, pes: 5.4, pop: 20 }
        },
        {
            id: "1-C",
            name: "Onix",
            category: "1-C",
            superTrunfo: false,
            properties: { atq: 45, def: 160, vel: 70, alt: 40, pes: 210, pop: 10 }
        },
        {
            id: "1-D",
            name: "Snorlax",
            category: "1-D",
            superTrunfo: false,
            properties: { atq: 110, def: 65, vel: 30, alt: 2.1, pes: 488.2, pop: 80 }
        },
        {
            id: "2-A",
            name: "Miltank",
            category: "2-A",
            superTrunfo: false,
            properties: { atq: 80, def: 105, vel: 100, alt: 1.2, pes: 75.5, pop: 50 }
        },
        {
            id: "2-B",
            name: "Shuckle",
            category: "2-B",
            superTrunfo: false,
            properties: { atq: 10, def: 230, vel: 5, alt: 0.6, pes: 20.5, pop: 30 }
        },
        // Adicione as outras 31 cartas aqui...
        {
            id: "8-D",
            name: "Pikachu",
            category: "8-D",
            superTrunfo: true,
            properties: { atq: 55, def: 40, vel: 90, alt: 0.4, pes: 5, pop: 99 }
        }
    ]
};

window.DECK_POKEMON.cards.forEach(c => c.image = `decks/pokemon/imagens/${c.id.toLowerCase().replace('-', '')}.png`);
