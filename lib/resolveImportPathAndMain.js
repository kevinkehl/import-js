// @flow
import fs from 'fs';
import path from 'path';

import escapeRegExp from 'lodash.escaperegexp';

import FileUtils from './FileUtils';

function findIndex(directory: string): string {
  return ['index.js', 'index.jsx'].find((indexFile: string): boolean => (
    fs.existsSync(`${directory}/${indexFile}`)
  ));
}

function resolveForPackage(filePath: string): ?Array<?string> {
  if (!filePath.endsWith('/package.json')) {
    return null;
  }

  const json = FileUtils.readJsonFile(filePath);
  if (!json) {
    return [null, null];
  }

  let mainFile = json.main;
  const match = filePath.match(/(.*)\/package\.json/);
  if (!match) {
    return [null, null];
  }

  const matchPackage = match[1];

  if (!mainFile) {
    const indexFile = findIndex(matchPackage);
    if (!indexFile) {
      return [null, null];
    }
    mainFile = indexFile;
  }

  const mainFilePath = `${matchPackage}/${mainFile}`;
  if (fs.existsSync(mainFilePath) && fs.lstatSync(mainFilePath).isDirectory()) {
    // The main in package.json refers to a directory, so we want to
    // resolve it to an index file.
    const indexFile = findIndex(mainFilePath);
    if (indexFile) {
      mainFile += `/${indexFile}`;
    }
  }

  return [matchPackage, path.normalize(mainFile)];
}

export default function resolveImportPathAndMain(
  filePath: string,
  stripFileExtensions: Array<string>
): Array<?string> {
  const resolvedForPackage = resolveForPackage(filePath);
  if (resolvedForPackage) {
    return resolvedForPackage;
  }

  const match = filePath.match(/(.*)\/(index\.js[^/]*)$/);
  if (match) {
    return [match[1], match[2]];
  }

  if (!stripFileExtensions) {
    return [filePath, null];
  }


  const extensions = stripFileExtensions
    .map((ext: string): string => escapeRegExp(ext));
  const importPath = filePath.replace(RegExp(`(${extensions.join('|')})$`), '');
  return [importPath, null];
}
