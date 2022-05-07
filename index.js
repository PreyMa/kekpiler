import * as Kek from './kekpiler.js';
import {TableOfContentsExtension} from './extensions/tableOfContents.js';
import {HeaderSluggerExtension} from './extensions/headerSlugger.js';
import {LineBreakExtension} from './extensions/lineBreak.js';

function getCompiler() {
  const k= new Kek.Kekpiler();
  k.use( new TableOfContentsExtension() );
  k.use( new HeaderSluggerExtension() );
  k.use( new LineBreakExtension() );

  return k;
}

async function compileMarkdown( markdownText ) {
  const comp= getCompiler();
  const html= await comp.compile( markdownText, true );

  comp.printMessages( Kek.ConsolePrinter.the() );

  return html;
}

export * from './kekpiler.js';
export {
  compileMarkdown
};
