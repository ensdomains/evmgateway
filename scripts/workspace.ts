import { join } from "node:path";

const workspace = process.argv[2];
const script = process.argv[3];

const runScriptForWorkspace = (w: string) => {
  console.log(`Running script "${script}" in workspace "${w}"`);
  Bun.spawn({
    cmd: ["bun", "run", script],
    cwd: `./${w}`,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
}


if (workspace !== "all")
  runScriptForWorkspace(workspace);
else {
  const packageJson = await Bun.file(join(import.meta.dir, "../package.json")).json();
  const workspaces = packageJson.workspaces.packages as string[];
  for (const w of workspaces) {
    runScriptForWorkspace(w);
  }
}

