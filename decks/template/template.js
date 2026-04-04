/* decks/template.js */
window.DECK_TEMPLATE = {
    name: "Novo Baralho",
    properties: [
        { key: 'attr1', label: 'Atributo 1', prefix: '', suffix: 'un', decimal: 0 },
        { key: 'attr2', label: 'Atributo 2', prefix: '', suffix: 'pts', decimal: 0 },
        { key: 'attr3', label: 'Atributo 3', prefix: '', suffix: 'kg', decimal: 0 },
        { key: 'attr4', label: 'Atributo 4', prefix: '', suffix: '', decimal: 0 },
        { key: 'attr5', label: 'Atributo 5', prefix: '', suffix: 'cm', decimal: 0 },
        { key: 'attr6', label: 'Atributo 6', prefix: '', suffix: '%', decimal: 0 }
    ],
    cards: [
        {
            id: "1-A",
            name: "Nome da Carta",
            category: "1-A",
            superTrunfo: false,
            properties: { attr1: 10, attr2: 20, attr3: 30, attr4: 40, attr5: 50, attr6: 60 }
        },
        // Adicione as outras 31 cartas aqui...
        {
            id: "8-D",
            name: "Super Trunfo",
            category: "8-D",
            superTrunfo: true,
            properties: { attr1: 99, attr2: 99, attr3: 99, attr4: 99, attr5: 99, attr6: 99 }
        }
    ]
};

window.DECK_TEMPLATE.cards.forEach(c => c.image = `decks/template/imagens/${c.id.toLowerCase().replace('-', '')}.png`);
