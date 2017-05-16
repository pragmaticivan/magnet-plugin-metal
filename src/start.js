import express from 'express';
import path from 'path';

const metalDirectory = '.magnet/metal';

let isServingMetalFiles = false;

const serveMetalFilesOnce = (magnet, outputDirectory) => {
  if (!isServingMetalFiles) {
    magnet.getServer()
      .getEngine()
      .use('/.metal', express.static(outputDirectory));
  }
  isServingMetalFiles = true;
};

export default async (magnet) => {
  let directory = magnet.getDirectory();
  let outputDirectory = path.join(directory, metalDirectory);
  serveMetalFilesOnce(magnet, outputDirectory);
};
