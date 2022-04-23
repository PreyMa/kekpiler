import * as Kek from './kekpiler.js';
import {HeaderSluggerExtension} from './extensions/headerSlugger.js';

function getCompiler() {
  const k= new Kek.Kekpiler();
  k.use( new HeaderSluggerExtension() );

  return k;
}

async function compileMarkdown( markdownText ) {
  return await getCompiler().compile( markdownText, true );
}

export * from './kekpiler.js';
export {
  compileMarkdown
};
