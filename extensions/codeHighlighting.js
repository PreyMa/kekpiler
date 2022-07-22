import * as Kek from '../kekpiler.js';

const splitLinesRegex= /\r?\n/gm;
const trailingWhitespaceRegex= /(?<=\S|^)[^\S\n\r]+(?=\n)/gm;
const defaultTabSapceCount= 2;

function charIsWhitespace( c ) {
  return ' \n\t\r\f\v\u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'.indexOf(c) >= 0;
}

/**
* Html Highlighted Code Block Builder class
* If no line numbers or line markers are set the highlighted code consisting of
* spans and text are stored as an opaque block of html code.
**/
class HtmlHighlightedCodeBlockBuilder extends Kek.OpaqueHtmlBuilder {
  constructor( html ) {
    super(html, 'highlighted-code-block', true)
  }

  toLineElements() {
    const lines= this.html.split('\n');
    if( lines.length && !lines[lines.length-1].trim().length ) {
      lines.pop();
    }

    return lines.map( line =>
      new HtmlHighlightedCodeLineBuilder(
        new HtmlHighlightedCodeLineContentBuilder( line )
      )
    );
  }
}

/**
* Html Highlighted Code Line Content Builder class
* A single line of highlighted code as opaque html.
**/
class HtmlHighlightedCodeLineContentBuilder extends Kek.OpaqueHtmlBuilder {
  constructor( html ) {
    super(html, 'highlighted-code-line', true)
  }
}

/**
* Html Highlighted Code Line Builder class
* This class wraps the opaque html builder node of highlighted code line. It is a
* node list that can store other elements along side the highlighted code, but is
* not a tag based html element itself. It allows for prepending and appending other
* nodes to the highlighted code and automatically adds the new line character at the
* end when stringifying.
**/
class HtmlHighlightedCodeLineBuilder extends Kek.HtmlBuilderNodeList( Kek.HtmlBuilder ) {
  constructor( ...children ) {
    super();
    this.children= children;
  }

  toHtmlString( p ) {
    p.printNoBlock(() => {
      super.toHtmlString( p );
      p.print('\n');
    });
  }

  print( p ) {
    p.print('{Line}');
    p.printBlock(() => super.print(p) );
  }
}

let HighlightedCodeBlock;

function injectClassesImpl() {
  HighlightedCodeBlock= Kek.Token.Token.injectClass(
    class HighlightedCodeBlock extends Kek.Token.Code.extend() {
      constructor(...args) {
        super(...args);

        this.highlightedHtml= null;
        this.options= null;
      }

      setOptions( opt ) {
        this.options= opt;
      }

      _trimWhitespaceIfEnabled() {
        if( !this.options.trimWhitespace ) {
          return;
        }

        // Find the end of the last line of leading whitespace -> do not remove
        // the leading whitespace of the first line actually containing content
        let startIndex= 0;
        for( let i= 0; i!== this.text.length; i++ ) {
          const c= this.text[i];
          if( !charIsWhitespace(c) ) {
            break;
          }

          if( c === '\n' ) {
            startIndex= i+1;
          }
        }

        // Find the last character not being just whitespace
        let endIndex= this.text.length-1
        for(; endIndex > startIndex; endIndex-- ) {
          if( !charIsWhitespace( this.text[endIndex] ) ) {
            endIndex++;
            break;
          }
        }

        // Create substring and remove all traling whitespace from the end of lines
        this.text= this.text.substring(startIndex, endIndex).replaceAll(trailingWhitespaceRegex, '');
      }

      _normalizeTabsAndSpacesIfEnabled() {
        const doSpaces= this.options.normalizeTabsToSpaces;
        const doTabs= this.options.normalizeSpacesToTabs;

        // Convert tab characters into spaces
        if( typeof doSpaces !== 'undefined' ) {
          const spaceCount= typeof doSpaces === 'number' ? doSpaces : defaultTabSapceCount;
          this.text= this.text.replaceAll('\t', ' '.repeat(spaceCount) );

        // Convert consecutive space characters into tabs
        } else if( typeof doTabs !== 'undefined' ) {
          const spaceCount= typeof doTabs === 'number' ? doTabs : defaultTabSapceCount;
          const spaceRepetitionRegex= new RegExp(` {${spaceCount}}`, 'gm');
          this.text= this.text.replaceAll(spaceRepetitionRegex, '\t');
        }
      }

      _removeIndentIfEnabled() {
        if( !this.options.removeIndent ) {
          return;
        }

        let indentPrefix= null;

        const lines= this.text.split( splitLinesRegex );
        lines.some( line => {
          // Ignore empty lines, as they are not required to have an indent
          if( !line.length ) {
            return;
          }

          // Stop if a line with content but no indent is found -> clearly there
          // is no global indent to remove
          const whitespaceMatch= line.match(/^\s+/);
          if( !whitespaceMatch ) {
            indentPrefix= null;
            return true;
          }

          // Lines only consisting of whitespace are not taken into account
          const leadingWhitespace= whitespaceMatch[0];
          if( leadingWhitespace.length !== line.length ) {
            if( !indentPrefix ) {
              indentPrefix= leadingWhitespace;
              return;
            }

            // Line is less indented -> make the global indent smaller
            if( leadingWhitespace.length < indentPrefix.length ) {
              // Indents don't match
              if( !indentPrefix.startsWith(leadingWhitespace) ) {
                indentPrefix= null;
                return true;
              }

              indentPrefix= leadingWhitespace;
              return;
            }

            // Line is indented more -> Indents still have to match
            if( leadingWhitespace.length > indentPrefix.length ) {
              if( !leadingWhitespace.startsWith(indentPrefix) ) {
                indentPrefix= null;
                return true;
              }
            }
          }
        });

        // No prefix to remove -> nothing to do here
        if( !indentPrefix ) {
          return;
        }

        let trimmedText= '';
        lines.forEach( line => {
          trimmedText+= line.substring( indentPrefix.length )+ '\n';
        });

        this.text= trimmedText;
      }

      highlightCode( kek ) {
        Kek.assert( this.options, 'Missing highlighting options');

        this._trimWhitespaceIfEnabled();
        this._normalizeTabsAndSpacesIfEnabled();
        this._removeIndentIfEnabled();

        try {
          this.highlightedHtml= this.options.highlightingFunction( this.text, this.lang );
        } catch( e ) {
          this.highlightedHtml= this.text;
          kek.addMessage(this.options.highlightingFailureMessageLevel, this, 'Could not run highlighting function', e);
        }
      }

      _renderContent( preElem, codeElem ) {
        codeElem.clearChildren();

        // Add language name tag to the code block
        if( this.options.showHighlightedLanguage ) {
          const langElem= new Kek.HtmlElementBuilder('div', new Kek.HtmlTextBuilder(this.lang) );
          langElem.addCssClass('mdkekcode-langname');
          preElem.appendChild( langElem );
        }

        const opaqueElem= new HtmlHighlightedCodeBlockBuilder( this.highlightedHtml );
        if( !this.options.showLineNumbers/*&& !this.options.emphasizeLines*/) {
          return codeElem.appendChild( opaqueElem );
        }

        const lineElements= opaqueElem.toLineElements();
        codeElem.appendChild( lineElements );

        // Add line numbers after the <code> element
        if( this.options.showLineNumbers ) {
          const lineContainer= new Kek.HtmlElementBuilder('div');
          lineContainer.addCssClass('mdkekcode-linenumbers');
          codeElem.addCssClass('mdkekcode-linenumbers');

          // Make more space if the line numbers have three digits (or two and a minus sign)
          const offset= this.options.lineNumberOffset+ 1;
          if( lineElements.length+ offset >= 100 || lineElements.length+ offset <= -10 ) {
            lineContainer.addCssClass('mdkekcode-manylines');
            codeElem.addCssClass('mdkekcode-manylines');
          }

          for( let i= 0; i!== lineElements.length; i++ ) {
            const lineNum= i+ offset;
            const lineTag= new HtmlHighlightedCodeLineBuilder( new Kek.HtmlElementBuilder('span', new Kek.HtmlTextBuilder(''+ lineNum) ) );
            lineContainer.appendChild( lineTag );
          }

          preElem.appendChild( lineContainer );
        }
      }

      render() {
        const text= this.text;
        this.text= '';
        const elem= super.render();

        this.text= text;

        const preElem= elem.descendantWithTagname('pre');
        Kek.assert( preElem instanceof Kek.HtmlElementBuilder, 'Could not query <pre> element in virtual dom' );

        const codeElem= preElem.descendantWithTagname('code');
        Kek.assert( codeElem instanceof Kek.HtmlElementBuilder, 'Could not query <code> element in virtual dom' );

        this._renderContent( preElem, codeElem );
        this.options.codeElementCSSClasses.forEach( c => codeElem.addCssClass(c) );

        return elem;
      }
    }
  );
}

export class CodeHighlightExtension extends Kek.Extension {
  init( kek ) {
    kek.setConfigDefaults({
      trimWhitespace: true,
      normalizeTabsToSpaces: defaultTabSapceCount,
      normalizeSpacesToTabs: undefined,
      removeIndent: true,
      highlightingFunction: (txt, lang) => txt,
      showLineNumbers: true,
      lineNumberOffset: 0,
      showHighlightedLanguage: true,
      codeElementCSSClasses: ['mdkekcode'],
      highlightingFailureMessageLevel: Kek.MessageSeverity.Warning
    });
    return 'CodeHighlight';
  }

  injectClasses() {
    injectClassesImpl();
  }

  preRender( kek ) {
    kek.document.forEachOfType(HighlightedCodeBlock, token => {
      token.setOptions( kek.config() );
      token.highlightCode( kek );
    });
  }
}
