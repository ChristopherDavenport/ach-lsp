// @ts-check
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const production = !watch;

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  sourcemap: true,
  minify: production,
  target: 'node18',
};

async function main() {
  const contexts = [
    // Client bundle
    await esbuild.context({
      ...sharedOptions,
      entryPoints: ['client/src/extension.ts'],
      outfile: 'client/out/extension.js',
      external: ['vscode'],
    }),
    // Server bundle
    await esbuild.context({
      ...sharedOptions,
      entryPoints: ['server/src/server.ts'],
      outfile: 'server/out/server.js',
    }),
    // Webview bundle (browser)
    await esbuild.context({
      bundle: true,
      platform: 'browser',
      format: 'iife',
      sourcemap: true,
      minify: production,
      target: 'es2022',
      entryPoints: ['client/src/webview/index.ts'],
      outfile: 'client/out/webview.js',
      tsconfigRaw: JSON.stringify({
        compilerOptions: {
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
      }),
    }),
  ];

  if (watch) {
    console.log('Watching for changes...');
    await Promise.all(contexts.map((ctx) => ctx.watch()));
  } else {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
    console.log('Build complete.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
