import { performance } from 'perf_hooks';

import * as Kek from './kekpiler.js';
import {TableOfContentsExtension} from './extensions/tableOfContents.js';
import {HeaderSluggerExtension} from './extensions/headerSlugger.js';
import {CodeHighlightExtension} from './extensions/codeHighlighting.js';
import {LineBreakExtension} from './extensions/lineBreak.js';
import {TemmlMathExtension} from './extensions/temmlMath.js';
import {FigureExtension} from './extensions/figure.js';

async function getCompiler(options= {}) {
  if( options.HighlightJs ) {
    options.highlightingFunction= (txt, language) => options.HighlightJs.highlight(txt, {language, ignoreIllegals: true}).value;
    options.codeElementCSSClasses= ['hljs'];
  }

  const k= new Kek.Kekpiler( options );
  k.use( new TableOfContentsExtension() );
  k.use( new HeaderSluggerExtension() );
  k.use( new LineBreakExtension() );
  k.use( new FigureExtension() );
  k.use( new CodeHighlightExtension() );

  if( options.Temml ) {
    k.use( new TemmlMathExtension(options.Temml) )
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
