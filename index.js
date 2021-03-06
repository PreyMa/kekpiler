import { performance } from 'perf_hooks';

import * as Kek from './kekpiler.js';
import {TableOfContentsExtension} from './extensions/tableOfContents.js';
import {HeaderSluggerExtension} from './extensions/headerSlugger.js';
import {CodeHighlightExtension} from './extensions/codeHighlighting.js';
import {LineBreakExtension} from './extensions/lineBreak.js';
import {TemmlMathExtension} from './extensions/temmlMath.js';
import {FigureExtension} from './extensions/figure.js';

let Temml= null;
let temmlLoadFailed= false;

let HighlightJs= null;
let highlightJsLoadFailed= false;

async function getCompiler(options= {}) {
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

  if( !HighlightJs && !highlightJsLoadFailed ) {
    try {
      HighlightJs= (await import('./dependency/node_modules/highlight.js/es/index.js')).default;
    } catch( e ) {
      highlightJsLoadFailed= true;
      console.error( e );
      throw e;
    }
  }

  if( HighlightJs ) {
    options.highlightingFunction= (txt, language) => HighlightJs.highlight(txt, {language, ignoreIllegals: true}).value;
    options.codeElementCSSClasses= ['hljs'];
  }

  const k= new Kek.Kekpiler( options );
  k.use( new TableOfContentsExtension() );
  k.use( new HeaderSluggerExtension() );
  k.use( new LineBreakExtension() );
  k.use( new FigureExtension() );
  k.use( new CodeHighlightExtension() );

  if( Temml ) {
    k.use( new TemmlMathExtension(Temml) )
  }

  return k;
}

async function compileMarkdown( markdownText, options ) {
  const startTime= performance.now();
  const comp= await getCompiler( options );

  const initTime= performance.now();
  const html= await comp.compile( markdownText, true );

  const compileTime= performance.now();
  comp.printMessages( Kek.ConsolePrinter.the() );
  console.log(`Kekpiler init time: ${(initTime- startTime).toFixed(3)}ms compile time: ${(compileTime- initTime).toFixed(3)}ms`);

  return html;
}

export * from './kekpiler.js';
export {
  compileMarkdown
};
