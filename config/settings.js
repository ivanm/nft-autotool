const { background } = require("./data/background.js");
const { hat } = require("./data/hat.js");
const { head } = require("./data/head.js");
const { eyes } = require("./data/eyes.js");
const { nose } = require("./data/nose.js");
const { mouth } = require("./data/mouth.js");
exports.settings = {
  collectionName: "Feels Metaverse",
  maxNumber: 50,
  thumbnailsResize: {
    width: 300,
    height: 300
  },
  dnaLayerIds: [1, 2, 3, 4, 5],
  extractDimensions: { left: 0, top: 250, width: 1668, height: 1668 },
  layers: [
    // layer0
    {
      name: "background",
      label: "Background",
      items: background
    },
    // layer1
    {
      name: "head",
      label: "Head",
      items: head
    },
    // layer2
    {
      name: "eyes",
      label: "Eyes",
      items: eyes
    },
    // layer3
    {
      name: "nose",
      label: "Nose",
      items: nose
    },
    // layer4
    {
      name: "mouth",
      label: "Mouth",
      items: mouth
    },
    // layer5
    {
      name: "hat",
      label: "Hat",
      items: hat
    }
  ]
};
