/* decks/cars.js */
window.DECK_CARS = {
    name: "Carros",
    properties: [
        { key: 'speed', label: 'Velocidade', unit: 'km/h' },
        { key: 'hp', label: 'Potência', unit: 'HP' },
        { key: 'price', label: 'Preço', unit: 'R$' },
        { key: 'year', label: 'Ano de Lanc.', unit: '' },
        { key: 'cultural', label: 'Valor Cultural', unit: 'Pts' },
        { key: 'weight', label: 'Peso', unit: 'kg' }
    ],
    cards: [
        {
            id: "1-A",
            name: "Ferrari F40",
            category: "1-A",
            superTrunfo: false,
            properties: { speed: 324, hp: 478, price: 5000000, year: 1987, cultural: 98, weight: 1100 }
        },
        {
            id: "1-B",
            name: "Lamborghini Countach",
            category: "1-B",
            superTrunfo: false,
            properties: { speed: 295, hp: 455, price: 3000000, year: 1985, cultural: 96, weight: 1490 }
        },
        {
            id: "8-D",
            name: "Fiat Uno c/ Escada",
            category: "8-D",
            superTrunfo: true,
            properties: { speed: 999, hp: 999, price: 10000, year: 2024, cultural: 100, weight: 800 }
        }
    ]
};

// Gerador temporário para completar as 32 cartas enquanto você não as escreve:
(function() {
    const cats = ['A','B','C','D'];
    for(let n=1; n<=8; n++) {
        for(let l=0; l<4; l++) {
            const cat = `${n}-${cats[l]}`;
            if(!window.DECK_CARS.cards.find(c => c.category === cat)) {
                window.DECK_CARS.cards.push({
                    id: cat,
                    name: `Carro ${cat}`,
                    category: cat,
                    superTrunfo: false,
                    properties: { speed: 100+n*10, hp: 100+n*5, price: 50000*n, year: 1990+n, cultural: 50, weight: 1000+n*10 }
                });
            }
        }
    }
    window.DECK_CARS.cards.forEach(c => c.image = `decks/cars/imagens/${c.id.toLowerCase().replace('-', '')}.png`);
})();
