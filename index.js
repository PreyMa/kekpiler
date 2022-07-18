import * as Kek from './kekpiler.js';
import {TableOfContentsExtension} from './extensions/tableOfContents.js';
import {HeaderSluggerExtension} from './extensions/headerSlugger.js';
import {LineBreakExtension} from './extensions/lineBreak.js';
import {TemmlMathExtension} from './extensions/temmlMath.js';
import {FigureExtension} from './extensions/figure.js';

let Temml= null;
let temmlLoadFailed= false;

async function getCompiler() {
  // Try to load temml lib once
  if( !Temml && !temmlLoadFailed ) {
    try {
      Temml= (await import('./dependency/temml.cjs')).default;
    } catch( e ) {
      temmlLoadFailed= true;
      console.error( e );
      throw e;
    }
  }

  const k= new Kek.Kekpiler();
  k.use( new TableOfContentsExtension() );
  k.use( new HeaderSluggerExtension() );
  k.use( new LineBreakExtension() );
  k.use( new FigureExtension() );

  if( Temml ) {
    k.use( new TemmlMathExtension(Temml) )
  }

  return k;
}

async function compileMarkdown( markdownText ) {
  const comp= await getCompiler();
  const html= await comp.compile( markdownText, true );

  comp.printMessages( Kek.ConsolePrinter.the() );

  return html;
}

export * from './kekpiler.js';
export {
  compileMarkdown
};
