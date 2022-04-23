import * as Kek from './kekpiler.js';

async function compileMarkdown( mdText ) {
  const k= new Kek.Kekpiler();

  return await k.compile( markdown, true );
}

export * from './kekpiler.js';
export {
  compileMarkdown
};
