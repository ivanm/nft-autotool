const sharp = require("sharp");
const fs = require("fs");

// Constants
const CONFIG_DIR = process.env.NFT_AUTOTOOL_CONFIG
  ? process.env.NFT_AUTOTOOL_CONFIG
  : "./config";
const OUTPUT_DIR = process.env.NFT_AUTOTOOL_OUTPUT
  ? process.env.NFT_AUTOTOOL_OUTPUT
  : "./output";
const OUTPUT_THUMBNAILS_DIR = `${OUTPUT_DIR}/thumbnails`;
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
    extractDimensions,
    thumbnailsResize
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
let initialId = INITIAL_IMAGE_ID;

try {
  let rawDatabase = fs.readFileSync(`${OUTPUT_DIR}/database.json`);
  database = JSON.parse(rawDatabase);
  let keys = Object.keys(database).map(k => parseInt(k));
  keys.sort((a, b) => a - b);
  initialId = keys[keys.length - 1] + 1;
} catch (e) {}

let restore = {};
try {
  let rawRestore = fs.readFileSync(`${OUTPUT_DIR}/restore.json`);
  restore = JSON.parse(rawRestore);
} catch (e) {}

// Optional Dynamic Trait Generatios
//
// Layers can have different variations.
// If you are going to use 3 different images for 'eyes1'
// then you would need eyes1A, eyes1B,eyes1C, and use dynamicTrait with size 3
// For multiple dynamic traits add order next to size
// so the final generated name and metadata will keep this schema
//
const dynamicTraitLayers = layers.filter(({ dynamicTrait }) => dynamicTrait);
let dynamicTraitOrder = [...dynamicTraitLayers];
dynamicTraitOrder.sort((a, b) => a.dynamicTrait.order - b.dynamicTrait.order);
dynamicTraitOrder = dynamicTraitOrder.map(({ name }) => name);

let dynamicTraitMixes = new Array(dynamicTraitOrder.length).fill([]);
dynamicTraitOrder.forEach((dynamicTraitName, index) => {
  size = dynamicTraitLayers.find(({ name }) => name == dynamicTraitName)
    .dynamicTrait.size;
  for (let i = 0; i < size; i++) {
    dynamicTraitMixes[index] = [...dynamicTraitMixes[index], charMap[i]];
  }
});

const dynamicCombinations = dynamicTraitMixes.length
  ? cartesian(dynamicTraitMixes).map(el => ({
      letters: el.join(""),
      dynamic: Object.assign(
        {},
        ...Object.entries(Object.assign({}, dynamicTraitOrder)).map(
          ([a, b]) => ({
            [b]: el[parseInt(a)]
          })
        )
      )
    }))
  : [{ letters: "", dynamic: {} }];

for (let i = initialId; i < initialId + maxNumber; i++) {
  console.log(`Calculating #${i}`);

  let uniqueDnaChunk = "";
  let dynamicTrait = [];
  let layerIds = [];
  do {
    dynamicTrait = [randomAbc(), randomAbc()];

    layerIds = layers.map(({ items }) => randomChance(items).id);
    // If there is a file restore.json on the output folder
    // it will generate the layer with the matching id from that file
    // Useful for restoring from an old database.json
    if (restore[i]) {
      layerIds = layers.map(({ label, items }) => {
        const trait = restore[i].attributes.find(
          ({ trait_type }) => trait_type === label
        );
        const item = items.find(({ name }) => name === trait.value);
        return item.id;
      });
    }

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

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  dynamicCombinations.forEach(({ letters, dynamic }) => {
    sharp(
      getPart(
        layers[0].name,
        `${layerIds[0]}${
          dynamic[layers[0].name] ? dynamic[layers[0].name] : ""
        }`
      )
    )
      .composite(
        layerIds.map((layerId, index) => ({
          input: getPart(
            layers[index].name,
            `${layerId}${
              dynamic[layers[index].name] ? dynamic[layers[index].name] : ""
            }`
          ),
          gravity: "southeast"
        }))
      )
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        console.log(`Finished composing #${i}${letters}`);
        const sharpImg = sharp(data)
          .extract(extractDimensions)
          .toFile(`${OUTPUT_DIR}/${i}${letters}.png`, function(err) {
            console.log(`Writing ${i}${letters}.png`);
            if (err) {
              console.log(`Error: ${err}`);
            }
          });
        if (thumbnailsResize) {
          if (!fs.existsSync(OUTPUT_THUMBNAILS_DIR)) {
            fs.mkdirSync(OUTPUT_THUMBNAILS_DIR);
          }

          sharpImg
            .resize(thumbnailsResize)
            .toFile(
              `${OUTPUT_DIR}/thumbnails/${i}${letters}-${thumbnailsResize.width}.png`,
              function(err) {
                console.log(
                  `Writing ${i}${letters}-${thumbnailsResize.width}.png`
                );
                if (err) {
                  console.log(`Error: ${err}`);
                }
              }
            );
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
