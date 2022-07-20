import * as Kek from '../kekpiler.js';

const splitLinesRegex= /\r?\n/gm;
const trailingWhitespaceRegex= /(?<=\S|^)[^\S\n\r]+(?=\n)/gm;
const defaultTabSapceCount= 2;

function charIsWhitespace( c ) {
  return ' \n\t\r\f\v\u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'.indexOf(c) >= 0;
}

class HtmlHighlightedCodeBlockBuilder extends Kek.OpaqueHtmlBuilder {
  constructor( html ) {
    super(html, 'highlighted-code', true)
  }
}

class HtmlHighlightedCodeLineBuilder extends Kek.OpaqueHtmlBuilder {
  constructor( html ) {
    super(html, 'highlighted-code', true)
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
          console.error( e );
        }

        console.log( this.highlightedHtml );
      }

      render() {
        const text= this.text;
        this.text= '';
        const elem= super.render();

        this.text= text;

        const opaqueElem= new HtmlHighlightedCodeBlockBuilder( this.highlightedHtml );

        const codeElem= elem.descendantWithTagname('code');
        Kek.assert( codeElem, 'Could not query code element in virtual dom' );

        codeElem.clearChildren();
        codeElem.appendChild( opaqueElem );

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
      codeElementCSSClasses: []
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
