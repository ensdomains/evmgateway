const packageJson = await Bun.file('./package.json').json();

const unwantedFields = [
  // NOTE: We explicitly don't want to publish the type field.
  // We create a separate package.json for `_cjs` and `_esm` that has the type field.
  'type',
  'scripts',
  'husky',
  'devDependencies',
];

for (const field of unwantedFields) {
  delete packageJson[field];
}

Bun.write('./package.json', JSON.stringify(packageJson, null, 2));
