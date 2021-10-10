const sharp = require("sharp");
const fs = require("fs");

// Constants
const CONFIG_DIR = process.env.NFT_AUTOTOOL_CONFIG
  ? process.env.NFT_AUTOTOOL_CONFIG
  : "./config";
const OUTPUT_DIR = process.env.NFT_AUTOTOOL_OUTPUT
  ? process.env.NFT_AUTOTOOL_OUTPUT
  : "./output";
const PARTS_DIR = `${CONFIG_DIR}/images`;
const INITIAL_IMAGE_ID = 1;
const charMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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

// Gets all combinations of the elements of the array
const cartesian = args => {
  let result = [],
    max = args.length - 1;
  const helper = (arr, i) => {
    for (let j = 0, l = args[i].length; j < l; j++) {
      let a = arr.slice(0); // clone arr
      a.push(args[i][j]);
      if (i == max) {
        result.push(a);
      } else {
        helper(a, i + 1);
      }
    }
  };
  helper([], 0);
  return result;
};

// Helper for getting the trait from attributes
const getTraitFromAttr = (attributes, type) =>
  attributes.find(({ trait_type }) => trait_type == type).value;

console.log("Welcome! lets generate some images >:3");

let database = {};
const dynamicDnaLayers = layers.filter(({ dynamicDna }) => dynamicDna);

let dynamicDnaOrder = [...dynamicDnaLayers];
dynamicDnaOrder.sort((a, b) => a.dynamicDna.order - b.dynamicDna.order);
dynamicDnaOrder = dynamicDnaOrder.map(({ name }) => name);

let dynamicDnaMixes = new Array(dynamicDnaOrder.length).fill([]);
dynamicDnaOrder.forEach((dynamicDnaName, index) => {
  size = dynamicDnaLayers.find(({ name }) => name == dynamicDnaName).dynamicDna
    .size;
  for (let i = 0; i < size; i++) {
    dynamicDnaMixes[index] = [...dynamicDnaMixes[index], charMap[i]];
  }
});

const dynamicCombinations = dynamicDnaMixes.length
  ? cartesian(dynamicDnaMixes).map(el => ({
      letters: el.join(""),
      data: Object.assign(
        {},
        ...Object.entries(Object.assign({}, dynamicDnaOrder)).map(([a, b]) => ({
          [b]: el[parseInt(a)]
        }))
      )
    }))
  : [{ letters: "", data: {} }];

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

  dynamicCombinations.forEach(({ letters, data }) => {
    sharp(
      getPart(
        layers[0].name,
        `${layerIds[0]}${data[layers[0].name] ? data[layers[0].name] : ""}`
      )
    )
      .composite(
        layerIds.map((layerId, index) => ({
          input: getPart(
            layers[index].name,
            `${layerId}${
              data[layers[index].name] ? data[layers[index].name] : ""
            }`
          ),
          gravity: "southeast"
        }))
      )
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        console.log(`Finished composing #${i}${letters}`);
        sharp(data)
          .extract(extractDimensions)
          .toFile(`${OUTPUT_DIR}/${i}${letters}.png`, function(err) {
            console.log(`Writing ${i}${letters}.png`);
            if (err) {
              console.log(`Error: ${err}`);
            }
          });
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
