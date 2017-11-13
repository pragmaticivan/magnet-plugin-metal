import soy from 'metal-tools-soy';

const buildSoyFiles = (src, dest, soyDeps) =>
  new Promise((resolve, reject) => {
    const handleError = error => reject(error);
    soy({src, dest, soyDeps, handleError}).on('end', () => resolve());
  });

  export default async (magnet) => {
    const config = magnet.getConfig();
    const metalConfig = config.magnet.pluginsConfig.metal;

    let src = ['**/*.soy'];
    if (metalConfig && metalConfig.soySrc) {
      src = metalConfig.soySrc;
    }

    let dest = ['.'];
    if (metalConfig && metalConfig.soyDest) {
      dest = metalConfig.soyDest;
    }

    let soyDeps = ['node_modules/metal*/src/**/*.soy'];
    if (metalConfig && metalConfig.soyDeps) {
      soyDeps = metalConfig.soyDeps;
    }

    // Trivially excludes soy compilation when there are no matching soy files
    // in the application directory.
    const directory = magnet.getDirectory();
    const isTriviallyExcluded = magnet.getFiles({directory, src}).length === 0;
    if (!isTriviallyExcluded) {
      await buildSoyFiles(src, dest, soyDeps);
    }
  };
