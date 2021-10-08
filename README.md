# NFT Autotool

## What is this?

This script transforms json metadata, a set of images (that represent a trait) and a configuration for each one into a set of composited images according to the order and probability for each trait. 

It also generates a single ``database.json`` that can be used for NFT standards ERC721, ERC1155 throught an API like https://github.com/ProjectOpenSea/metadata-api-nodejs/tree/master/src

The easiest way would be to could fork this repo and modify the contents of the ``config`` directory with your own assets and settings. 

## Where to start?

A good idea would be to start with a PSD containing the layers for each trait that you will be composing. An example of **Feels Metaverse** can be found on the ``demo`` folder of this repo. 

You can then use a plugin for GIMP like https://khalim19.github.io/gimp-plugin-export-layers/sections/Installation.html for making it easier to export multiple layers.

## Configuration

### settings.json

``collectionName``

A string containing the name of your collection.

``maxNumber``

The number of images to be generated.

``dnaLayerIds``

An Array with the layer indexes that will be used for uniqueness (Check DNA Section).

``extractDimensions``

An object containing the dimensions to extract when composing the final image. Full Documentation: https://sharp.pixelplumbing.com/api-resize#extract

``layers``

An Array of each layer, the name you define here is used for naming the folders and files in `config/images` (Check Folder Configuration Section). For convenience metadata is split into different files (like `data/head.js`), each file containing the properties of each trait (Check Traits Section). For example:

```
  const { head } = require("./data/head.js");
  const { hat } = require("./data/hat.js");
  
  ....
    
  layers: [
    {
      name: "head",
      label: "Head",
      items: head
    },
    {
      name: "hat",
      label: "Hat",
      items: hat
    }
```

## DNA

The DNA is used for uniqueness check, sort of an ID representing the item in the collection. It is exported as a trait.

## Traits

``id``

An unique ID number.

``name``

The string containing the name to be displayed on the final ``database.json``.

``chance``

A number defining how often this trait will appear when generating new images. The lower this number is, the lower chance is that this trait will appear. For example:

```
exports.hat = [
  // Very Common
  {
    id: 1,
    name: "Cap Hat",
    chance: 30
  },
  // Rare
  {
    id: 2,
    name: "+1 Power Hat",
    chance: 10
  },
  // Very Rare
  {
    id: 3,
    name: "Legendary Wizard Hat of Wisdom",
    chance: 1
  }
];
```

## Folder Configuration

Files that require to be present on ``config/images`` follow the configuration for layers on ``settings.json``.

For example, for layer ``hat`` if we are going to add ids ``1``,``2``, ``3`` on ``config/data/hat.json`` we require the following:

- A folder `hat` on ``config/images``.
- Images ``hat1.png``, ``hat2.png``, ``hat3.png`` on ``config/images/hat``.

## How to run:

Fork this repo and run ``yarn install`` to install all dependencies. Then use ``node index.js`` to run.

Once the script finishes, images and the ``database.json`` file will be located on the ``output`` folder.
