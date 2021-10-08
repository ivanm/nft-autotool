const sharp = require("sharp");
const fs = require("fs");

// Constants
const CONFIG_DIR = "./config";
const PARTS_DIR = `${CONFIG_DIR}/images`;
const OUTPUT_DIR = "./output";
const INITIAL_IMAGE_ID = 1;

// Settings
const {
  settings: {
    layers,
    dnaLayerIds,
    collectionName,
    maxNumber,
    extractDimensions
  }
} = require(`${CONFIG_DIR}/settings.js`);

// Helper to get the file location of the part with the name and the id
const getPart = (name, number) => {
  return `${PARTS_DIR}/${name}/${name}${number}.png`;
};

// A random int between two numbers
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Selects a random item from an array of objects containing a 'chance' attribute
const randomChance = items => {
  const totalChance = items.reduce((acc, value) => acc + value.chance, 0);
  const random = getRandomInt(0, totalChance - 1);

  let chanceMap = [];
  items.forEach(item => {
    chanceMap = [...chanceMap, ...new Array(item.chance).fill(item)];
  });

  return chanceMap[random];
};

// Gets a random letter, A, B or C
const randomAbc = () => ["A", "B", "C"][getRandomInt(0, 2)];

// Helper for getting the trait from attributes
const getTraitFromAttr = (attributes, type) =>
  attributes.find(({ trait_type }) => trait_type == type).value;

console.log("Welcome! lets generate some images >:3");

let database = {};

for (let i = INITIAL_IMAGE_ID; i <= maxNumber; i++) {
  console.log(`Calculating #${i}`);

  let uniqueDnaChunk = "";
  let dynamicDna = [];
  let layerIds = [];

  do {
    dynamicDna = [randomAbc(), randomAbc()];

    layerIds = layers.map(({ items }) => randomChance(items).id);

    uniqueDnaChunk = dnaLayerIds
      .map(dnaLayerId => layerIds[dnaLayerId])
      .join("-");

    console.log(`Random DNA: #${uniqueDnaChunk}`);

    if (
      !Object.values(database).find(
        ({ attributes }) =>
          getTraitFromAttr(attributes, "DNA") == uniqueDnaChunk
      )
    ) {
      database[i] = {
        id: i,
        name: `${collectionName} #${i}`,
        attributes: [
          { trait_type: "DNA", value: uniqueDnaChunk },
          ...layerIds.map((layerId, index) => ({
            trait_type: layers[index].label,
            value: layers[index].items.find(({ id }) => id == layerId).name
          }))
        ]
      };
    } else {
      console.log(`DNA already present #${uniqueDnaChunk}`);
      uniqueDnaChunk = "";
    }
  } while (!uniqueDnaChunk);

  sharp(
    getPart(
      layers[0].name,
      `${layerIds[0]}${
        layers[0].dynamicDna ? dynamicDna[layers[0].dynamicDna - 1] : ""
      }`
    )
  )
    .composite(
      layerIds.map((layerId, index) => ({
        input: getPart(
          layers[index].name,
          `${layerId}${
            layers[index].dynamicDna
              ? dynamicDna[layers[index].dynamicDna - 1]
              : ""
          }`
        ),
        gravity: "southeast"
      }))
    )
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      console.log(`Finished composing #${i}`);
      sharp(data)
        .extract(extractDimensions)
        .toFile(`${OUTPUT_DIR}/${i}.png`, function(err) {
          console.log(`Writing ${i}.png`);
          if (err) {
            console.log(`Error: ${err}`);
          }
        });
    });
}

console.log("Writing JSON to database.json");
fs.writeFile(
  `${OUTPUT_DIR}/database.json`,
  JSON.stringify(database, null, 2),
  "utf8",
  () => {}
);
